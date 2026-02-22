import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'
import type {
  Account, Transaction, Holding, PortfolioSummary,
  AppSettings,
} from '@/types'
import { fetchBatchQuotes, fetchBatchSectorInfo } from '@/lib/marketData'
import { encryptedStorage } from '@/lib/storage'

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio calculations derived from transactions
// ─────────────────────────────────────────────────────────────────────────────

function deriveHoldings(transactions: Transaction[], accounts: Account[]): Holding[] {
  // Group by symbol+exchange
  const map = new Map<string, { buys: Transaction[]; sells: Transaction[]; dividends: Transaction[] }>()

  for (const tx of transactions) {
    const key = `${tx.symbol}::${tx.exchange}::${tx.account_id}`
    if (!map.has(key)) map.set(key, { buys: [], sells: [], dividends: [] })
    const entry = map.get(key)!
    if (tx.type === 'BUY') entry.buys.push(tx)
    else if (tx.type === 'SELL') entry.sells.push(tx)
    else entry.dividends.push(tx)
  }

  const holdings: Holding[] = []

  map.forEach((entry, key) => {
    const [symbol, exchange, account_id] = key.split('::')
    let totalQty = 0
    let totalCost = 0

    // FIFO processing
    const lots = entry.buys.map((b) => ({ qty: b.quantity, price: b.price, cost: b.price * b.quantity }))

    for (const sell of entry.sells) {
      let rem = sell.quantity
      for (const lot of lots) {
        if (rem <= 0) break
        const used = Math.min(lot.qty, rem)
        lot.qty -= used
        rem -= used
      }
    }

    for (const lot of lots) {
      if (lot.qty > 0) {
        totalQty += lot.qty
        totalCost += lot.qty * lot.price
      }
    }

    if (totalQty <= 0) return

    const avgPrice = totalCost / totalQty
    const account = accounts.find((a) => a.id === account_id)

    holdings.push({
      id: key,
      symbol,
      exchange: exchange as 'NSE' | 'BSE',
      total_quantity: totalQty,
      average_price: avgPrice,
      current_price: avgPrice, // user must update or fetch
      current_value: avgPrice * totalQty,
      invested_value: totalCost,
      unrealized_pnl: 0,
      unrealized_pnl_pct: 0,
      account_id,
      account_name: account?.name,
      sector: '',
      day_change: 0,
      day_change_pct: 0,
    })
  })

  return holdings
}

function derivePortfolioSummary(holdings: Holding[]): PortfolioSummary {
  const totalInvested = holdings.reduce((s, h) => s + h.invested_value, 0)
  const currentValue = holdings.reduce((s, h) => s + h.current_value, 0)
  const totalPnl = currentValue - totalInvested
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
  const dayPnl = holdings.reduce((s, h) => s + (h.day_change ?? 0) * h.total_quantity, 0)
  const dayPnlPct = currentValue > 0 ? (dayPnl / (currentValue - dayPnl)) * 100 : 0

  return {
    total_invested: totalInvested,
    current_value: currentValue,
    total_pnl: totalPnl,
    total_pnl_pct: totalPnlPct,
    day_pnl: dayPnl,
    day_pnl_pct: dayPnlPct,
    cagr: 0,
    xirr: 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Store
// ─────────────────────────────────────────────────────────────────────────────

interface PortfolioState {
  accounts: Account[]
  transactions: Transaction[]
  // derived
  holdings: Holding[]
  summary: PortfolioSummary

  // Account CRUD
  addAccount: (data: Omit<Account, 'id' | 'created_at'>) => void
  updateAccount: (id: string, patch: Partial<Account>) => void
  deleteAccount: (id: string) => void

  // Transaction CRUD
  addTransaction: (data: Omit<Transaction, 'id'>) => void
  addTransactionsBulk: (data: Omit<Transaction, 'id'>[]) => void
  deleteTransaction: (id: string) => void

  // Price updates (user sets current market price)
  updateHoldingPrice: (symbol: string, exchange: string, account_id: string, price: number, dayChange?: number, dayChangePct?: number, sector?: string) => void

  // Recompute derived state
  _recompute: () => void

  // Bulk refresh latest prices
  refreshMarketData: () => Promise<void>

  // Auto-classify sectors for all holdings via Yahoo Finance + static map
  autoTagSectors: (onProgress?: (done: number, total: number) => void) => Promise<{ tagged: number; source: Record<string,string> }>
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      accounts: [],
      transactions: [],
      holdings: [],
      summary: {
        total_invested: 0, current_value: 0, total_pnl: 0, total_pnl_pct: 0,
        day_pnl: 0, day_pnl_pct: 0, cagr: 0, xirr: 0,
      },

      _recompute: () => {
        const { transactions, accounts, holdings: prevHoldings } = get()
        const derived = deriveHoldings(transactions, accounts)

        // merge persisted price updates back in
        const merged = derived.map((h) => {
          const prev = prevHoldings.find(
            (p) => p.symbol === h.symbol && p.exchange === h.exchange && p.account_id === h.account_id
          )
          const cp = prev?.current_price ?? h.average_price
          const cv = cp * h.total_quantity
          const pnl = cv - h.invested_value
          const pnlPct = h.invested_value > 0 ? (pnl / h.invested_value) * 100 : 0
          return {
            ...h,
            current_price: cp,
            current_value: cv,
            unrealized_pnl: pnl,
            unrealized_pnl_pct: pnlPct,
            day_change: prev?.day_change ?? 0,
            day_change_pct: prev?.day_change_pct ?? 0,
            sector: prev?.sector ?? h.sector,
          }
        })

        set({ holdings: merged, summary: derivePortfolioSummary(merged) })
      },

      addAccount: (data) => {
        const account: Account = { ...data, id: generateId(), created_at: new Date().toISOString() }
        set((s) => ({ accounts: [...s.accounts, account] }))
      },
      updateAccount: (id, patch) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAccount: (id) => {
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          transactions: s.transactions.filter((t) => t.account_id !== id),
        }))
        get()._recompute()
      },

      addTransaction: (data) => {
        const tx: Transaction = { ...data, id: generateId() }
        set((s) => ({ transactions: [tx, ...s.transactions] }))
        get()._recompute()
      },
      addTransactionsBulk: (data) => {
        const txs: Transaction[] = data.map((d) => ({ ...d, id: generateId() }))
        set((s) => ({ transactions: [...txs, ...s.transactions] }))
        get()._recompute()
      },
      deleteTransaction: (id) => {
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))
        get()._recompute()
      },

      updateHoldingPrice: (symbol, exchange, account_id, price, dayChange = 0, dayChangePct = 0, sector = '') => {
        set((s) => ({
          holdings: s.holdings.map((h) => {
            if (h.symbol !== symbol || h.exchange !== exchange || h.account_id !== account_id) return h
            const cv = price * h.total_quantity
            const pnl = cv - h.invested_value
            const pnlPct = h.invested_value > 0 ? (pnl / h.invested_value) * 100 : 0
            return { ...h, current_price: price, current_value: cv, unrealized_pnl: pnl, unrealized_pnl_pct: pnlPct, day_change: dayChange, day_change_pct: dayChangePct, sector: sector || h.sector }
          }),
        }))
        // recompute summary
        const holdings = get().holdings
        set({ summary: derivePortfolioSummary(holdings) })
      },

      refreshMarketData: async () => {
        const holdings = get().holdings
        if (holdings.length === 0) return

        // Extract unique symbols
        const uniqueSymbols = new Map<string, { symbol: string; exchange: 'NSE' | 'BSE' }>()
        holdings.forEach((h) => {
          uniqueSymbols.set(`${h.symbol}::${h.exchange}`, { symbol: h.symbol, exchange: h.exchange })
        })

        const quotes = await fetchBatchQuotes(Array.from(uniqueSymbols.values()))
        if (quotes.size === 0) return

        // Batch apply updates
        set((s) => ({
          holdings: s.holdings.map((h) => {
            const quote = quotes.get(`${h.symbol}::${h.exchange}`)
            if (!quote) return h
            
            const cv = quote.ltp * h.total_quantity
            const pnl = cv - h.invested_value
            const pnlPct = h.invested_value > 0 ? (pnl / h.invested_value) * 100 : 0
            
            return {
              ...h,
              current_price: quote.ltp,
              current_value: cv,
              unrealized_pnl: pnl,
              unrealized_pnl_pct: pnlPct,
              day_change: quote.dayChange,
              day_change_pct: quote.dayChangePct
            }
          })
        }))
        
        // Recompute globally after all updates
        set({ summary: derivePortfolioSummary(get().holdings) })
      },

      autoTagSectors: async (onProgress) => {
        const holdings = get().holdings
        if (holdings.length === 0) return { tagged: 0, source: {} }

        // Deduplicate symbols
        const unique = new Map<string, { symbol: string; exchange: 'NSE' | 'BSE' }>()
        for (const h of holdings) {
          unique.set(`${h.symbol}::${h.exchange}`, { symbol: h.symbol, exchange: h.exchange })
        }
        const symbols = Array.from(unique.values())
        const total = symbols.length
        let done = 0

        // Fetch in chunks of 3 with progress callbacks
        const resultMap = new Map<string, { sector: string; industry: string; longName: string; source: string }>()
        const chunks: Array<typeof symbols> = []
        for (let i = 0; i < symbols.length; i += 3) chunks.push(symbols.slice(i, i + 3))

        for (const chunk of chunks) {
          const settled = await Promise.allSettled(
            chunk.map((s) => fetchBatchSectorInfo([s]).then((m) => m.get(`${s.symbol}::${s.exchange}`)))
          )
          settled.forEach((r, idx) => {
            const key = `${chunk[idx].symbol}::${chunk[idx].exchange}`
            if (r.status === 'fulfilled' && r.value) {
              resultMap.set(key, r.value)
            }
          })
          done = Math.min(done + chunk.length, total)
          onProgress?.(done, total)
          await new Promise((r) => setTimeout(r, 200))
        }

        // Apply to all matching holdings
        let tagged = 0
        const sourceRecord: Record<string, string> = {}
        set((s) => ({
          holdings: s.holdings.map((h) => {
            const info = resultMap.get(`${h.symbol}::${h.exchange}`)
            if (!info || info.sector === 'Uncategorised') return h
            tagged++
            sourceRecord[h.symbol] = info.source
            return { ...h, sector: info.sector }
          })
        }))
        set({ summary: derivePortfolioSummary(get().holdings) })
        return { tagged, source: sourceRecord }
      },
    }),
    {
      name: 'gestion-portfolio',
      // only persist raw data, not derived
      partialize: (state) => ({
        accounts: state.accounts,
        transactions: state.transactions,
        holdings: state.holdings, // persist with prices
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // after rehydration, recompute summary
          state.summary = summary
        }
      },
      storage: encryptedStorage as any,
    }
  )
)

// ─────────────────────────────────────────────────────────────────────────────
// Settings Store
// ─────────────────────────────────────────────────────────────────────────────

interface SettingsState {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        base_currency: 'INR',
        date_format: 'DD/MM/YYYY',
        data_source: 'YAHOO',
        theme: 'dark',
      },
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    { 
      name: 'gestion-settings',
      storage: encryptedStorage as any,
    }
  )
)

// ─────────────────────────────────────────────────────────────────────────────
// UI Store
// ─────────────────────────────────────────────────────────────────────────────

interface UIState {
  activeModal: string | null
  openModal: (id: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}))
