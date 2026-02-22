import { useState } from 'react'
import {
  Eye, Plus, Trash2, Bell, BellOff, BellRing, RefreshCw,
  TrendingUp, TrendingDown, X, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { useWatchlistStore } from '@/store/watchlistStore'
import { useWatchlistPoller } from '@/hooks/useWatchlistPoller'
import type { Exchange, AlertCondition, WatchlistItem } from '@/types'

// ─── Add Symbol Modal ─────────────────────────────────────────────────────────

function AddSymbolModal({ onClose }: { onClose: () => void }) {
  const { addItem, hasSymbol } = useWatchlistStore()
  const [symbol,   setSymbol]   = useState('')
  const [exchange, setExchange] = useState<Exchange>('NSE')
  const [error,    setError]    = useState('')

  function handleAdd() {
    const sym = symbol.toUpperCase().trim()
    if (!sym) { setError('Symbol is required'); return }
    if (hasSymbol(sym, exchange)) { setError(`${sym}:${exchange} is already in your watchlist`); return }
    addItem(sym, exchange)
    onClose()
  }

  return (
    <div style={overlayStyle}>
      <div style={sheetStyle} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Add to Watchlist</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Symbol</label>
          <input
            className="form-input"
            placeholder="e.g. RELIANCE, INFY, NIFTY"
            value={symbol}
            onChange={e => { setSymbol(e.target.value.toUpperCase()); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
            style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.05em' }}
          />
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label">Exchange</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['NSE', 'BSE'] as Exchange[]).map((ex) => (
              <label key={ex} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '9px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                border: `1px solid ${exchange === ex ? 'rgba(59,130,246,0.5)' : 'var(--color-border)'}`,
                background: exchange === ex ? 'rgba(59,130,246,0.1)' : 'var(--color-bg-primary)',
                fontWeight: exchange === ex ? 700 : 400,
                fontSize: '0.85rem',
                color: exchange === ex ? '#60A5FA' : 'var(--text-muted)',
              }}>
                <input type="radio" value={ex} checked={exchange === ex}
                  onChange={() => setExchange(ex)} style={{ display: 'none' }} />
                {ex}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--color-loss)' }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAdd}>
            <Plus size={14} /> Add Symbol
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Alert Modal ──────────────────────────────────────────────────────────

function AddAlertModal({ item, onClose }: { item: WatchlistItem; onClose: () => void }) {
  const { addAlert } = useWatchlistStore()
  const [condition,   setCondition]   = useState<AlertCondition>('above')
  const [targetPrice, setTargetPrice] = useState(item.ltp?.toFixed(2) ?? '')
  const [note,        setNote]        = useState('')

  const CONDITIONS: { value: AlertCondition; label: string; desc: string }[] = [
    { value: 'above',         label: 'Price ≥',       desc: 'Triggers when LTP rises to or above the target' },
    { value: 'below',         label: 'Price ≤',       desc: 'Triggers when LTP falls to or below the target' },
    { value: 'crosses_above', label: 'Crosses Above', desc: 'One-time trigger when price crosses upward'     },
    { value: 'crosses_below', label: 'Crosses Below', desc: 'One-time trigger when price crosses downward'   },
  ]

  function handleSave() {
    const price = parseFloat(targetPrice)
    if (isNaN(price) || price <= 0) return
    addAlert(item.symbol, item.exchange, condition, price, note)
    onClose()
  }

  return (
    <div style={overlayStyle}>
      <div style={{ ...sheetStyle, maxWidth: 480 }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0 }}>Set Price Alert</h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {item.symbol} · {item.exchange}{item.ltp ? ` · LTP ₹${item.ltp.toFixed(2)}` : ''}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Condition buttons */}
        <div className="form-group">
          <label className="form-label">Condition</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CONDITIONS.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setCondition(value)}
                style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  textAlign: 'left', fontSize: '0.8rem',
                  border: `1px solid ${condition === value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: condition === value ? 'var(--color-accent-dim)' : 'var(--color-bg-primary)',
                  color: condition === value ? 'var(--color-accent-light)' : 'var(--text-secondary)',
                }}
              >
                <div style={{ fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: '0.68rem', marginTop: 2, color: 'var(--text-muted)' }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label">Target Price (₹)</label>
          <input
            type="number"
            className="form-input"
            placeholder="e.g. 2500"
            value={targetPrice}
            min={0} step={0.05}
            onChange={e => setTargetPrice(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem' }}
          />
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label">Note (optional)</label>
          <input
            className="form-input"
            placeholder="e.g. Key resistance zone"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
            <Bell size={14} /> Set Alert
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Watchlist Row ────────────────────────────────────────────────────────────

function WatchlistRow({ item }: { item: WatchlistItem }) {
  const { removeItem, alerts } = useWatchlistStore()
  const [showAlertModal, setShowAlertModal] = useState(false)

  const isUp    = (item.dayChange ?? 0) >= 0
  const myAlerts = alerts.filter(a => a.symbol === item.symbol && a.exchange === item.exchange)
  const activeAlerts    = myAlerts.filter(a => !a.triggered).length
  const triggeredAlerts = myAlerts.filter(a => a.triggered).length

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto auto auto auto auto',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        borderBottom: '1px solid var(--color-border)',
        transition: 'background 0.15s',
      }}
        className="watchlist-row"
      >
        {/* Symbol */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.symbol}</span>
            <span style={{ fontSize: '0.65rem', background: 'var(--color-accent-dim)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
              {item.exchange}
            </span>
            {triggeredAlerts > 0 && (
              <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.1)', color: 'var(--color-loss)', padding: '2px 8px', borderRadius: 99, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                <BellRing size={10} /> {triggeredAlerts} fired
              </span>
            )}
          </div>
          {item.lastUpdated && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Updated {new Date(item.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* LTP */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {item.ltp ? `₹${item.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>LTP</div>
        </div>

        {/* Day Change */}
        <div style={{ textAlign: 'right', minWidth: 80 }}>
          {item.dayChange !== undefined ? (
            <div style={{ color: isUp ? 'var(--color-profit)' : 'var(--color-loss)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {isUp ? '+' : ''}{item.dayChange.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.68rem' }}>{(item.dayChangePct ?? 0) >= 0 ? '+' : ''}{(item.dayChangePct ?? 0).toFixed(2)}%</div>
            </div>
          ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
        </div>

        {/* O / H / L */}
        {(['open', 'high', 'low'] as const).map((key) => (
          <div key={key} style={{ textAlign: 'right', minWidth: 70 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: key === 'high' ? 'var(--color-profit)' : key === 'low' ? 'var(--color-loss)' : 'var(--text-secondary)' }}>
              {item[key] ? `₹${item[key]!.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{key}</div>
          </div>
        ))}

        {/* Alerts badge + button */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowAlertModal(true)}
          style={{ gap: 5, minWidth: 80, color: activeAlerts > 0 ? 'var(--color-warning)' : 'var(--text-muted)' }}
          title="Set price alert"
        >
          {activeAlerts > 0 ? <Bell size={13} fill="currentColor" /> : <Bell size={13} />}
          {activeAlerts > 0 ? `${activeAlerts} alert${activeAlerts !== 1 ? 's' : ''}` : 'Alert'}
        </button>

        {/* Remove */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => removeItem(item.id)}
          title="Remove from watchlist"
          style={{ color: 'var(--text-muted)' }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      {showAlertModal && (
        <AddAlertModal item={item} onClose={() => setShowAlertModal(false)} />
      )}
    </>
  )
}

// ─── Alert List Panel ─────────────────────────────────────────────────────────

function AlertsPanel() {
  const { alerts, removeAlert, clearTriggeredAlerts } = useWatchlistStore()
  const triggered = alerts.filter(a => a.triggered)
  const pending   = alerts.filter(a => !a.triggered)

  const condLabel: Record<AlertCondition, string> = {
    above: '≥', below: '≤', crosses_above: '↑ Cross', crosses_below: '↓ Cross',
  }

  if (alerts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <BellOff size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
        No alerts set. Click <strong>Alert</strong> on any symbol to set one.
      </div>
    )
  }

  return (
    <div>
      {triggered.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-loss)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              🔔 Triggered ({triggered.length})
            </span>
            <button className="btn btn-ghost btn-sm" onClick={clearTriggeredAlerts} style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              Clear All
            </button>
          </div>
          {triggered.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)' }}>
              <CheckCircle2 size={14} color="var(--color-loss)" />
              <div style={{ flex: 1, fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 700 }}>{a.symbol}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{condLabel[a.condition]} ₹{a.targetPrice.toLocaleString('en-IN')}</span>
                {a.note && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontStyle: 'italic' }}>· {a.note}</span>}
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {a.triggeredAt ? new Date(a.triggeredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
              <button className="btn btn-ghost btn-icon" onClick={() => removeAlert(a.id)} style={{ padding: 3 }}><X size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            ⏳ Pending ({pending.length})
          </div>
          {pending.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)' }}>
              <Bell size={14} color="var(--color-warning)" />
              <div style={{ flex: 1, fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 700 }}>{a.symbol}</span>
                <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>{condLabel[a.condition]}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{a.targetPrice.toLocaleString('en-IN')}</span>
                {a.note && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontStyle: 'italic' }}>· {a.note}</span>}
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => removeAlert(a.id)} style={{ padding: 3 }}><X size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Watchlist() {
  useWatchlistPoller(true)   // ← live price polling

  const { items, alerts } = useWatchlistStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeTab,    setActiveTab]    = useState<'watchlist' | 'alerts'>('watchlist')

  const pendingAlerts   = alerts.filter(a => !a.triggered).length
  const triggeredAlerts = alerts.filter(a => a.triggered).length

  // Request notification permission on mount
  useState(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  })

  return (
    <div className="app-content animate-fade-in">

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Eye size={22} color="var(--color-accent)" />
            Watchlist
          </h1>
          <p className="page-subtitle">
            {items.length} symbol{items.length !== 1 ? 's' : ''} · refreshes every 30s
            {pendingAlerts > 0 && <span style={{ color: 'var(--color-warning)', marginLeft: 10 }}>· ⏳ {pendingAlerts} alert{pendingAlerts !== 1 ? 's' : ''} armed</span>}
            {triggeredAlerts > 0 && <span style={{ color: 'var(--color-loss)', marginLeft: 10 }}>· 🔔 {triggeredAlerts} fired</span>}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Symbol
          </button>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 20, gap: 4 }}>
        {([
          { key: 'watchlist', label: `Symbols (${items.length})`, icon: <Eye size={13} /> },
          { key: 'alerts',    label: `Alerts (${alerts.length})`,  icon: <Bell size={13} /> },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '8px 18px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6,
              fontWeight: activeTab === key ? 700 : 400,
              color: activeTab === key ? 'var(--color-accent)' : 'var(--text-muted)',
              background: activeTab === key ? 'var(--color-accent-dim)' : 'transparent',
              borderBottom: activeTab === key ? '2px solid var(--color-accent)' : '2px solid transparent',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            }}
          >
            {icon}{label}
            {key === 'alerts' && triggeredAlerts > 0 && (
              <span style={{ background: 'var(--color-loss)', color: 'white', borderRadius: 99, fontSize: '0.6rem', fontWeight: 800, padding: '1px 5px', marginLeft: 2 }}>
                {triggeredAlerts}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Watchlist tab ─────────────────────────────────────────── */}
      {activeTab === 'watchlist' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
              <Eye size={36} style={{ margin: '0 auto 14px', display: 'block', opacity: 0.3 }} />
              <h3 style={{ marginBottom: 8 }}>Your watchlist is empty</h3>
              <p style={{ fontSize: '0.85rem' }}>Add NSE/BSE symbols to track live prices and set price alerts.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAddModal(true)}>
                <Plus size={14} /> Add First Symbol
              </button>
            </div>
          ) : (
            <div>
              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto auto auto auto auto',
                gap: 14, padding: '10px 16px',
                background: 'var(--color-bg-primary)',
                borderBottom: '1px solid var(--color-border)',
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>
                <span>Symbol</span>
                <span style={{ textAlign: 'right' }}>LTP</span>
                <span style={{ textAlign: 'right', minWidth: 80 }}>Day Chg</span>
                <span style={{ textAlign: 'right', minWidth: 70 }}>Open</span>
                <span style={{ textAlign: 'right', minWidth: 70 }}>High</span>
                <span style={{ textAlign: 'right', minWidth: 70 }}>Low</span>
                <span style={{ minWidth: 80 }}>Alerts</span>
                <span />
              </div>
              <div style={{ overflowX: 'auto' }}>
                {items.map((item) => <WatchlistRow key={item.id} item={item} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Alerts tab ────────────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div className="card">
          <AlertsPanel />
        </div>
      )}

      {/* ── How it works ──────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 20, background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.12)', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {[
            { icon: <RefreshCw size={14} />, text: 'Prices refresh every 30 seconds via Yahoo Finance during market hours' },
            { icon: <Bell size={14} />,      text: 'Price alerts fire browser notifications (allow permission when prompted)' },
            { icon: <BellRing size={14} />,  text: 'Supports 4 conditions: above, below, crosses above & crosses below' },
          ].map(({ icon, text }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)', flex: '1 1 200px' }}>
              <span style={{ color: '#60A5FA', flexShrink: 0 }}>{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </div>

      {showAddModal && <AddSymbolModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)', padding: 20,
}
const sheetStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border-light)',
  borderRadius: 'var(--radius-2xl)',
  padding: '24px 26px',
  width: '100%', maxWidth: 400,
  boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
}
