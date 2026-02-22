import { useState, useEffect } from 'react'
import {
  X, RefreshCw, CheckCircle2, AlertCircle,
  ExternalLink, Zap, ChevronRight, Eye, EyeOff,
} from 'lucide-react'
import { usePortfolioStore } from '@/store'
import type { Account } from '@/types'
import {
  upstoxAuthUrl, upstoxExchangeToken, upstoxFetch,
  mapUpstoxOrder, mapUpstoxTrade, mapUpstoxHolding,
  zerodhaAuthUrl, zerodhaExchangeToken, zerodhaFetch,
} from '@/lib/brokerSync'

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'idle' | 'oauth' | 'exchanging' | 'fetching' | 'done' | 'error'
type Log  = { type: 'ok' | 'err' | 'info'; text: string }

interface Props {
  account: Account
  onClose: () => void
}

const REDIRECT_URI = window.location.origin + '/'

// ─── Component ────────────────────────────────────────────────────────────────
export default function SyncModal({ account, onClose }: Props) {
  const { addTransactionsBulk, updateHoldingPrice, updateAccount } = usePortfolioStore()

  const [step, setStep]     = useState<Step>('idle')
  const [error, setError]   = useState('')
  const [logs, setLogs]     = useState<Log[]>([])
  const [result, setResult] = useState<{ orders: number; holdings: number; trades: number } | null>(null)

  // OAuth code captured from URL (after broker redirect)
  const [oauthCode, setOauthCode]       = useState('')
  // Manual paste: code or access token
  const [manualCode, setManualCode]     = useState('')
  const [manualToken, setManualToken]   = useState(
    account.api_secret?.startsWith('access:') ? account.api_secret.slice(7) : ''
  )
  const [showToken, setShowToken]       = useState(false)

  const isUpstox  = account.broker_name === 'Upstox'
  const isZerodha = account.broker_name === 'Zerodha'
  const hasKey    = !!account.api_key

  const add = (type: Log['type'], text: string) =>
    setLogs((l) => [...l, { type, text }])

  // ── Capture OAuth callback params on mount ─────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (isUpstox) {
      const code   = params.get('code')
      const status = params.get('status')
      if (code && status !== 'error') {
        setOauthCode(code)
        window.history.replaceState({}, '', window.location.pathname)
        sessionStorage.removeItem('sync_oauth_account_id')
        add('ok', `Upstox auth code captured automatically: ${code.slice(0, 14)}…`)
        setStep('oauth')
        // Automatically proceed to exchange
        handleExchange(code)
      }
    } else if (isZerodha) {
      const rt     = params.get('request_token')
      const status = params.get('status')
      if (rt && status === 'success') {
        setOauthCode(rt)
        window.history.replaceState({}, '', window.location.pathname)
        sessionStorage.removeItem('sync_oauth_account_id')
        add('ok', `Zerodha request_token captured automatically: ${rt.slice(0, 14)}…`)
        setStep('oauth')
        // Automatically proceed to exchange
        handleExchange(rt)
      }
    }
  }, [isUpstox, isZerodha])

  // ── Step 1: Open broker OAuth page ────────────────────────────────────────
  function handleAuthorize() {
    if (!account.api_key) return
    const url = isUpstox
      ? upstoxAuthUrl(account.api_key, REDIRECT_URI)
      : zerodhaAuthUrl(account.api_key)
    add('info', `Opening ${account.broker_name} login page…`)
    
    // Remember which account initiated the flow so Accounts.tsx can reopen this modal
    sessionStorage.setItem('sync_oauth_account_id', account.id)
    
    window.open(url, '_self') // same tab so callback lands here
  }

  // ── Step 2: Exchange auth code → access token ──────────────────────────────
  async function handleExchange(autoCode?: string) {
    const code = autoCode || oauthCode || manualCode.trim()
    if (!code) { setError('Paste the auth code from the redirect URL first'); return }
    setStep('exchanging')
    setError('')
    add('info', 'Exchanging auth code for access token…')

    try {
      let at: string
      if (isUpstox) {
        at = await upstoxExchangeToken(account.api_key ?? '', account.api_secret ?? '', code, REDIRECT_URI)
      } else {
        at = await zerodhaExchangeToken(account.api_key ?? '', account.api_secret ?? '', code)
      }
      add('ok', `Access token obtained: ${at.slice(0, 14)}…`)
      // Persist for future sessions
      updateAccount(account.id, { api_secret: `access:${at}`, last_synced: new Date().toISOString() })
      setManualToken(at)
      await doFetch(at)
    } catch (err) {
      const msg = (err as Error).message
      const isCors = msg.match(/cors|network|failed to fetch/i)
      add('err', isCors ? 'CORS blocked token exchange — use Method 2 below' : msg)
      setError(isCors
        ? 'CORS blocked: paste your access token manually in Method 2 (see instructions below).'
        : msg)
      setStep('error')
    }
  }

  // ── Step 3: Use access token directly to fetch data ───────────────────────
  async function handleDirectSync() {
    const at = manualToken.trim()
    if (!at) { setError('Enter your access token'); return }
    setStep('fetching')
    setError('')
    await doFetch(at)
  }

  // ── Core fetch ─────────────────────────────────────────────────────────────
  async function doFetch(at: string) {
    setStep('fetching')
    add('info', `Fetching portfolio data from ${account.broker_name}…`)

    try {
      if (isUpstox) {
        const { orders, positions, holdings, trades } = await upstoxFetch(at)

        // Use today's trades (most reliable for LTP sync)
        const completedTrades = (trades as Record<string, unknown>[]).filter((t) => (t.quantity as number) > 0)
        // Also include completed orders as fallback
        const completedOrders = (orders as Record<string, unknown>[]).filter(
          (o) => ((o.status as string) ?? '').toLowerCase() === 'complete' && ((o.filled_quantity as number) ?? 0) > 0
        )

        add('info', `Upstox: ${(orders as unknown[]).length} orders · ${completedTrades.length} trades · ${(holdings as unknown[]).length} holdings · ${(positions as unknown[]).length} positions`)

        // Import trades first (most accurate — includes fills)
        const txFromTrades = completedTrades.map((t: any) => mapUpstoxTrade(t, account.id))
        const tradedSymbols = new Set(txFromTrades.map((t) => t.symbol + t.transaction_date))
        const txFromOrders  = completedOrders
          .map((o: any) => mapUpstoxOrder(o, account.id))
          .filter((o) => !tradedSymbols.has(o.symbol + o.transaction_date) && o.quantity > 0 && o.price > 0)

        const recentTx = [...txFromTrades, ...txFromOrders].filter((t) => t.quantity > 0 && t.price > 0)

        if (recentTx.length > 0) {
          addTransactionsBulk(recentTx)
          add('info', `Imported ${recentTx.length} recent trades & orders`)
        }

        // ─── Generate synthetic opening balances for missing holdings ───
        const currentStoreState = usePortfolioStore.getState().holdings
        const syntheticTx: any[] = []
        for (const h of (holdings as any[])) {
          const m = mapUpstoxHolding(h)
          if (!m.symbol || m.qty <= 0) continue
          
          const existing = currentStoreState.find((ch) => ch.symbol === m.symbol && ch.exchange === m.exchange && ch.account_id === account.id)
          const currentQty = existing?.total_quantity ?? 0
          
          if (m.qty > currentQty) {
            syntheticTx.push({
              account_id: account.id, symbol: m.symbol, exchange: m.exchange, type: 'BUY',
              quantity: m.qty - currentQty,
              price: m.avgPrice > 0 ? m.avgPrice : (m.lastPrice > 0 ? m.lastPrice : 0),
              brokerage: 0, stt: 0, exchange_charges: 0, gst: 0,
              transaction_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // yesterday
            })
          }
        }
        
        if (syntheticTx.length > 0) {
          addTransactionsBulk(syntheticTx)
          add('ok', `Imported ${syntheticTx.length} opening balances for missing holdings`)
        } else if (recentTx.length === 0) {
          add('info', 'No new data to import, synced existing.')
        }

        // Update holding prices from live holdings
        let priceCount = 0
        for (const h of (holdings as any[])) {
          const m = mapUpstoxHolding(h)
          if (m.symbol && m.lastPrice > 0) {
            updateHoldingPrice(m.symbol, m.exchange, account.id, m.lastPrice, 0, 0)
            priceCount++
          }
        }
        // Also update from positions (intraday)
        for (const p of (positions as any[])) {
          const m = mapUpstoxHolding(p)
          if (m.symbol && m.lastPrice > 0) {
            updateHoldingPrice(m.symbol, m.exchange, account.id, m.lastPrice, 0, 0)
          }
        }
        if (priceCount > 0) add('ok', `Updated market prices for ${priceCount} holdings`)

        updateAccount(account.id, {
          is_api_synced: true, api_status: 'connected',
          last_synced: new Date().toISOString(),
          api_secret: `access:${at}`,
        })

        setResult({ orders: recentTx.length + syntheticTx.length, holdings: holdings.length, trades: completedTrades.length })
        setStep('done')
        add('ok', '✅ Upstox sync complete!')

      } else if (isZerodha) {
        const { orders, holdings } = await zerodhaFetch(account.api_key ?? '', at)
        const completed = (orders as any[]).filter(
          (o) => (o.status ?? '').toLowerCase() === 'complete' && (o.filled_quantity ?? 0) > 0
        )
        if (completed.length > 0) {
          addTransactionsBulk(completed.map((o: any) => ({
            account_id: account.id,
            symbol: o.tradingsymbol ?? '',
            exchange: (o.exchange === 'BSE' ? 'BSE' : 'NSE') as 'NSE' | 'BSE',
            type: (o.transaction_type === 'SELL' ? 'SELL' : 'BUY') as 'BUY' | 'SELL',
            quantity: Math.abs(o.filled_quantity ?? 0),
            price: o.average_price ?? o.price ?? 0,
            brokerage: 0, stt: 0, exchange_charges: 0, gst: 0,
            transaction_date: (o.order_timestamp ?? '').split(' ')[0] || new Date().toISOString().split('T')[0],
          })))
          add('info', `Imported ${completed.length} recent Zerodha orders`)
        }

        // ─── Generate synthetic opening balances for missing holdings ───
        const currentStoreState = usePortfolioStore.getState().holdings
        const syntheticTx: any[] = []
        for (const h of (holdings as any[])) {
          if (!h.tradingsymbol || h.quantity <= 0) continue
          const exchange = h.exchange === 'BSE' ? 'BSE' : 'NSE'
          const existing = currentStoreState.find((ch) => ch.symbol === h.tradingsymbol && ch.exchange === exchange && ch.account_id === account.id)
          const currentQty = existing?.total_quantity ?? 0

          if (h.quantity > currentQty) {
            syntheticTx.push({
               account_id: account.id, symbol: h.tradingsymbol, exchange, type: 'BUY',
               quantity: h.quantity - currentQty,
               price: h.average_price > 0 ? h.average_price : (h.last_price > 0 ? h.last_price : 0),
               brokerage: 0, stt: 0, exchange_charges: 0, gst: 0,
               transaction_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
            })
          }
        }

        if (syntheticTx.length > 0) {
          addTransactionsBulk(syntheticTx)
          add('ok', `Imported ${syntheticTx.length} opening balances for missing holdings`)
        }

        for (const h of (holdings as any[])) {
          if (h.tradingsymbol && h.last_price > 0) {
            updateHoldingPrice(h.tradingsymbol, h.exchange === 'BSE' ? 'BSE' : 'NSE', account.id, h.last_price, 0, 0)
          }
        }
        updateAccount(account.id, { is_api_synced: true, api_status: 'connected', last_synced: new Date().toISOString(), api_secret: `access:${at}` })
        setResult({ orders: completed.length + syntheticTx.length, holdings: (holdings as any[]).length, trades: 0 })
        setStep('done')
        add('ok', '✅ Zerodha sync complete!')
      }
    } catch (err) {
      const msg = (err as Error).message
      const isCors = msg.match(/cors|network|failed to fetch|load failed/i)
      add('err', msg)
      if (isCors) {
        add('err', 'CORS blocked browser → broker API call. This is expected — see workaround below.')
        setError('CORS blocked: The broker rejected the direct browser API call. Use your Upstox access token from the Upstox developer console.')
      } else {
        setError(msg)
      }
      setStep('error')
    }
  }

  return (
    <div style={overlay}>
      <div style={modalBox}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: '#6366F122', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, color: '#6366F1' }}>
              {account.broker_name[0]}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Sync {account.broker_name}</h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {account.name} · {step === 'done' ? '✅ Synced' : step === 'fetching' ? '⏳ Fetching…' : step === 'exchanging' ? '⏳ Exchanging…' : 'Ready'}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* No key warning */}
        {!hasKey && (
          <div style={alertBox('loss')}>
            <AlertCircle size={14} color="var(--color-loss)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-loss)' }}>
              No API key set. Go to <strong>Accounts → Connect API</strong> first.
            </span>
          </div>
        )}

        {/* OAuth callback success banner */}
        {oauthCode && (
          <div style={{ ...alertBox('profit'), marginBottom: 14 }}>
            <CheckCircle2 size={14} color="var(--color-profit)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-profit)', fontWeight: 600 }}>
              Auth code received! Click <strong>Exchange & Sync</strong> to continue.
            </span>
          </div>
        )}

        {/* ─── Method 1: OAuth ─────────────────────────────────────────── */}
        <div style={sectionBox}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'var(--color-accent)', color: 'white', borderRadius: 999, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>1</span>
            OAuth Flow (Auto)
          </div>

          {/* Step A: Authorize */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAuthorize} disabled={!hasKey}>
              <ExternalLink size={12} /> Authorize with {account.broker_name}
            </button>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              → logs in on {account.broker_name} site → redirects back here
            </span>
          </div>

          {/* Step B: code paste (if auto-capture failed) */}
          {!oauthCode && (
            <div className="form-group">
              <label className="form-label">
                {isUpstox ? 'Paste auth code (from redirect URL ?code=…)' : 'Paste request_token (from redirect URL)'}
              </label>
              <input className="form-input" placeholder={isUpstox ? 'auth_code_here' : 'request_token_here'}
                value={manualCode} onChange={(e) => setManualCode(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }} />
            </div>
          )}

          {/* Exchange button */}
          <button
            className="btn btn-primary"
            onClick={() => handleExchange()}
            disabled={step === 'exchanging' || step === 'fetching' || step === 'done' || (!oauthCode && !manualCode.trim())}
            style={{ marginTop: 10 }}
          >
            {step === 'exchanging'
              ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Exchanging…</>
              : <><ChevronRight size={14} /> Exchange Code & Sync</>}
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        {/* ─── Method 2: Direct Access Token ─────────────────────────── */}
        <div style={sectionBox}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'var(--color-info)', color: 'white', borderRadius: 999, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>2</span>
            Paste Access Token Directly
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            Get your access token from{' '}
            <a href="https://developer.upstox.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>
              developer.upstox.com → Apps → Access Token <ExternalLink size={10} style={{ verticalAlign: 'middle' }} />
            </a>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input className="form-input"
                placeholder="Paste Upstox access token…"
                type={showToken ? 'text' : 'password'}
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowToken((s) => !s)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleDirectSync}
              disabled={!manualToken.trim() || step === 'fetching' || step === 'exchanging'}>
              {step === 'fetching'
                ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Fetching…</>
                : <><Zap size={13} /> Sync Now</>}
            </button>
          </div>

          {/* Upstox-specific note */}
          {isUpstox && (
            <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Quick way to get access token:</strong><br />
              Upstox Developer Console → select your app → <em>Generate Access Token</em> →
              complete login → copy the token shown.
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ ...alertBox('loss'), marginTop: 12, flexDirection: 'column', alignItems: 'flex-start' }}>
            <div className="flex items-center gap-2">
              <AlertCircle size={14} color="var(--color-loss)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-loss)', fontWeight: 600 }}>Error</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: 22 }}>{error}</span>
          </div>
        )}

        {/* Success */}
        {step === 'done' && result && (
          <div style={{ ...alertBox('profit'), marginTop: 12, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} color="var(--color-profit)" />
              <span style={{ fontWeight: 700, color: 'var(--color-profit)', fontSize: '0.9rem' }}>Sync Successful!</span>
            </div>
            <div style={{ display: 'flex', gap: 20, paddingLeft: 26, fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span>📋 {result.orders} transactions imported</span>
              <span>💼 {result.holdings} holdings updated</span>
              {result.trades > 0 && <span>🔄 {result.trades} day trades</span>}
            </div>
          </div>
        )}

        {/* Activity Log */}
        {logs.length > 0 && (
          <div style={{ marginTop: 14, background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', padding: '10px 14px', border: '1px solid var(--color-border)', maxHeight: 120, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Sync Log</div>
            {logs.map((l, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: l.type === 'ok' ? 'var(--color-profit)' : l.type === 'err' ? 'var(--color-loss)' : 'var(--text-muted)', marginBottom: 2, lineHeight: 1.5 }}>
                {l.type === 'ok' ? '✓' : l.type === 'err' ? '✗' : '·'} {l.text}
              </div>
            ))}
          </div>
        )}

        {/* CORS workaround */}
        {(step === 'error' || step === 'done') && (
          <details style={{ marginTop: 14 }}>
            <summary style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>
              🔧 Get Upstox access token manually (if CORS blocks auto-flow)
            </summary>
            <div style={{ marginTop: 8, background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', padding: '12px', border: '1px solid var(--color-border)', fontSize: '0.72rem', lineHeight: 1.9 }}>
              <div style={{ color: 'var(--text-secondary)' }}>
                1. Go to{' '}
                <a href="https://account.upstox.com/developer/apps" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>
                  account.upstox.com/developer/apps
                </a><br />
                2. Select your app → click <strong>Generate Access Token</strong><br />
                3. Complete the Upstox login → copy the <code style={{ color: 'var(--color-accent)' }}>access_token</code><br />
                4. Paste it in <strong>Method 2</strong> above and click <strong>Sync Now</strong>
              </div>
            </div>
          </details>
        )}

        <div className="flex gap-2" style={{ marginTop: 18 }}>
          <button className="btn btn-outline flex-1" onClick={onClose}>Close</button>
          {step === 'done' && (
            <button className="btn btn-primary flex-1" onClick={onClose}>
              <CheckCircle2 size={14} /> Done — View Portfolio
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const alertBox = (type: 'profit' | 'loss' | 'warning' | 'info'): React.CSSProperties => ({
  display: 'flex', gap: 8, alignItems: 'center',
  padding: '10px 14px', borderRadius: 'var(--radius-md)',
  background: `var(--color-${type}-bg)`,
  border: `1px solid rgba(${type === 'profit' ? '16,185,129' : type === 'loss' ? '239,68,68' : type === 'info' ? '59,130,246' : '245,158,11'}, 0.2)`,
})
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)',
}
const modalBox: React.CSSProperties = {
  background: 'var(--color-bg-card)', border: '1px solid var(--color-border-light)',
  borderRadius: 'var(--radius-2xl)', padding: '28px 32px', width: '100%', maxWidth: 560,
  maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
}
const sectionBox: React.CSSProperties = {
  background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)',
  padding: '16px 18px', border: '1px solid var(--color-border)',
}
