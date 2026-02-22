import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'
import type { WatchlistItem, PriceAlert, Exchange, AlertCondition } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WatchlistState {
  items: WatchlistItem[]
  alerts: PriceAlert[]

  // Watchlist CRUD
  addItem: (symbol: string, exchange: Exchange, displayName?: string) => void
  removeItem: (id: string) => void
  hasSymbol: (symbol: string, exchange: Exchange) => boolean

  // Live price updates (called by the poller hook)
  updatePrices: (updates: (Partial<WatchlistItem> & { symbol: string; exchange: Exchange; ltp?: number })[]) => void

  // Alert CRUD
  addAlert: (
    symbol: string,
    exchange: Exchange,
    condition: AlertCondition,
    targetPrice: number,
    note?: string
  ) => void
  removeAlert: (id: string) => void
  clearTriggeredAlerts: () => void

  // Internal: mark alert triggered
  _triggerAlert: (id: string) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      alerts: [],

      addItem: (symbol, exchange, displayName) => {
        if (get().hasSymbol(symbol, exchange)) return
        const item: WatchlistItem = {
          id: generateId(),
          symbol: symbol.toUpperCase().trim(),
          exchange,
          displayName,
          addedAt: new Date().toISOString(),
        }
        set((s) => ({ items: [...s.items, item] }))
      },

      removeItem: (id) => {
        set((s) => ({
          items: s.items.filter((i) => i.id !== id),
          // also remove alerts for this symbol
          alerts: s.alerts.filter((a) => {
            const item = s.items.find((i) => i.id === id)
            return !item || a.symbol !== item.symbol || a.exchange !== item.exchange
          }),
        }))
      },

      hasSymbol: (symbol, exchange) =>
        get().items.some(
          (i) => i.symbol === symbol.toUpperCase() && i.exchange === exchange
        ),

      updatePrices: (updates) => {
        const { alerts, _triggerAlert } = get()
        const oldPrices = new Map(
          get().items.map((i) => [`${i.symbol}::${i.exchange}`, i.ltp])
        )

        set((s) => ({
          items: s.items.map((item) => {
            const upd = updates.find(
              (u) => u.symbol === item.symbol && u.exchange === item.exchange
            )
            if (!upd) return item
            return { ...item, ...upd, lastUpdated: new Date().toISOString() }
          }),
        }))

        // Check each un-triggered alert for this round of prices
        for (const alert of alerts) {
          if (alert.triggered) continue
          const key   = `${alert.symbol}::${alert.exchange}`
          const oldLtp = oldPrices.get(key)
          const upd   = updates.find((u) => u.symbol === alert.symbol && u.exchange === alert.exchange)
          if (!upd?.ltp) continue

          const newLtp = upd.ltp
          let fired = false

          switch (alert.condition) {
            case 'above':          fired = newLtp >= alert.targetPrice; break
            case 'below':          fired = newLtp <= alert.targetPrice; break
            case 'crosses_above':  fired = (oldLtp !== undefined && oldLtp < alert.targetPrice && newLtp >= alert.targetPrice); break
            case 'crosses_below':  fired = (oldLtp !== undefined && oldLtp > alert.targetPrice && newLtp <= alert.targetPrice); break
          }

          if (fired) {
            _triggerAlert(alert.id)
            fireNotification(alert, newLtp)
          }
        }
      },

      addAlert: (symbol, exchange, condition, targetPrice, note = '') => {
        const alert: PriceAlert = {
          id: generateId(),
          symbol: symbol.toUpperCase(),
          exchange,
          condition,
          targetPrice,
          note,
          triggered: false,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ alerts: [...s.alerts, alert] }))
      },

      removeAlert: (id) =>
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

      clearTriggeredAlerts: () =>
        set((s) => ({ alerts: s.alerts.filter((a) => !a.triggered) })),

      _triggerAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, triggered: true, triggeredAt: new Date().toISOString() } : a
          ),
        })),
    }),
    {
      name: 'gestion-watchlist',
      // Don't persist live price data — only symbols + alerts
      partialize: (s) => ({
        items: s.items.map((i) => ({
          id: i.id,
          symbol: i.symbol,
          exchange: i.exchange,
          displayName: i.displayName,
          addedAt: i.addedAt,
        })),
        alerts: s.alerts,
      }),
    }
  )
)

// ─── Browser notification helper ─────────────────────────────────────────────

function conditionLabel(c: AlertCondition, price: number): string {
  switch (c) {
    case 'above':         return `reached above ₹${price}`
    case 'below':         return `dropped below ₹${price}`
    case 'crosses_above': return `crossed above ₹${price}`
    case 'crosses_below': return `crossed below ₹${price}`
  }
}

function fireNotification(alert: PriceAlert, ltp: number) {
  const body = `${alert.symbol} ${conditionLabel(alert.condition, alert.targetPrice)} — LTP: ₹${ltp.toFixed(2)}${alert.note ? `\n${alert.note}` : ''}`

  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(`🔔 Price Alert — ${alert.symbol}`, { body, icon: '/favicon.ico' })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') new Notification(`🔔 Price Alert — ${alert.symbol}`, { body, icon: '/favicon.ico' })
      })
    }
  }

  // Fallback: browser console + document title flash
  console.info(`[ALERT FIRED] ${body}`)
}
