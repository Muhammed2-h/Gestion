import { useState, useEffect, useRef } from 'react'
import {
  Eye, Plus, Trash2, Bell, BellOff, BellRing, RefreshCw,
  TrendingUp, TrendingDown, X, AlertTriangle, CheckCircle2, Activity
} from 'lucide-react'
import { useWatchlistStore } from '@/store/watchlistStore'
import { useWatchlistPoller } from '@/hooks/useWatchlistPoller'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Exchange, AlertCondition, WatchlistItem } from '@/types'

// ─── Sparkline Component ───────────────────────────────────────────────────────
// Simulates a sparkline based on Open, Low, High, LTP.
function Sparkline({ open, high, low, ltp }: { open?: number, high?: number, low?: number, ltp?: number }) {
  if (!open || !high || !low || !ltp) return <div className="w-16 h-6 bg-bg-secondary rounded opacity-30"></div>
  
  const min = low * 0.99
  const max = high * 1.01
  const range = max - min
  
  const getY = (val: number) => 20 - ((val - min) / range) * 20
  
  const isUp = ltp >= open
  const color = isUp ? 'var(--color-profit)' : 'var(--color-loss)'
  
  return (
    <svg width="64" height="24" className="overflow-visible">
      <path 
        d={`M 0,${getY(open)} L 21,${getY(high)} L 42,${getY(low)} L 64,${getY(ltp)}`} 
        fill="none" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  )
}

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
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-bg-card border border-border-light rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
        <div className="flex justify-between items-center mb-5">
          <h3 className="m-0">Add to Watchlist</h3>
          <button className="p-1.5 text-muted hover:text-primary rounded-md hover:bg-bg-secondary transition-fast" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="form-group mb-4">
          <label className="form-label text-xs font-semibold mb-1">Symbol</label>
          <input
            className="form-input bg-bg-primary border-border uppercase font-mono font-bold tracking-wider"
            placeholder="e.g. RELIANCE, INFY"
            value={symbol}
            onChange={e => { setSymbol(e.target.value.toUpperCase()); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
        </div>

        <div className="form-group mb-2">
          <label className="form-label text-xs font-semibold mb-1">Exchange</label>
          <div className="flex gap-3">
            {(['NSE', 'BSE'] as Exchange[]).map((ex) => (
              <label 
                key={ex} 
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md cursor-pointer border text-sm transition-fast ${
                  exchange === ex 
                    ? 'border-[#60A5FA]/50 bg-[#60A5FA]/10 font-bold text-[#60A5FA]' 
                    : 'border-border bg-bg-primary text-muted'
                }`}
              >
                <input type="radio" value={ex} checked={exchange === ex} onChange={() => setExchange(ex)} className="hidden" />
                {ex}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-3 p-2 px-3 bg-loss/10 border border-loss/20 rounded-md text-xs text-loss font-semibold">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleAdd}>
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
    { value: 'above',         label: 'Price ≥',       desc: 'Triggers when LTP rises to or above target' },
    { value: 'below',         label: 'Price ≤',       desc: 'Triggers when LTP falls to or below target' },
    { value: 'crosses_above', label: 'Crosses Above', desc: 'One-time trigger on upward cross'     },
    { value: 'crosses_below', label: 'Crosses Below', desc: 'One-time trigger on downward cross'   },
  ]

  function handleSave() {
    const price = parseFloat(targetPrice)
    if (isNaN(price) || price <= 0) return
    addAlert(item.symbol, item.exchange, condition, price, note)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-bg-card border border-border-light rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="m-0">Set Price Alert</h3>
            <p className="m-0 mt-1 text-xs text-muted">
              {item.symbol} · {item.exchange}{item.ltp ? ` · LTP ₹${item.ltp.toFixed(2)}` : ''}
            </p>
          </div>
          <button className="p-1.5 text-muted hover:text-primary rounded-md hover:bg-bg-secondary transition-fast" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="form-group mb-4">
          <label className="form-label text-xs font-semibold mb-2">Condition</label>
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setCondition(value)}
                className={`text-left p-3 rounded-md border transition-fast ${
                  condition === value 
                    ? 'border-accent bg-accent-dim text-accent-light' 
                    : 'border-border bg-bg-primary text-secondary'
                }`}
              >
                <div className="font-bold text-sm">{label}</div>
                <div className="text-[0.65rem] mt-1 text-muted">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group mb-4">
          <label className="form-label text-xs font-semibold mb-1">Target Price (₹)</label>
          <input
            type="number"
            className="form-input bg-bg-primary border-border font-mono font-bold text-base"
            placeholder="e.g. 2500"
            value={targetPrice}
            min={0} step={0.05}
            onChange={e => setTargetPrice(e.target.value)}
          />
        </div>

        <div className="form-group mb-2">
          <label className="form-label text-xs font-semibold mb-1">Note (optional)</label>
          <input
            className="form-input bg-bg-primary border-border"
            placeholder="e.g. Key resistance zone"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave}>
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
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const prevLtp = useRef(item.ltp)

  useEffect(() => {
    if (item.ltp && prevLtp.current && item.ltp !== prevLtp.current) {
      setFlash(item.ltp > prevLtp.current ? 'up' : 'down')
      const timer = setTimeout(() => setFlash(null), 1000)
      prevLtp.current = item.ltp
      return () => clearTimeout(timer)
    }
    prevLtp.current = item.ltp
  }, [item.ltp])

  const isUp    = (item.dayChange ?? 0) >= 0
  const myAlerts = alerts.filter(a => a.symbol === item.symbol && a.exchange === item.exchange)
  const activeAlerts    = myAlerts.filter(a => !a.triggered).length
  const triggeredAlerts = myAlerts.filter(a => a.triggered).length

  return (
    <>
      <div 
        className="watchlist-row group transition-all duration-300 grid items-center gap-4 py-3 px-4 border-b border-border hover:bg-bg-secondary"
        style={{
          gridTemplateColumns: 'minmax(120px, 1fr) 80px auto auto auto auto 90px 40px',
          backgroundColor: flash === 'up' ? 'rgba(16, 185, 129, 0.15)' : flash === 'down' ? 'rgba(239, 68, 68, 0.15)' : undefined
        }}
      >
        {/* Symbol */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm text-primary">{item.symbol}</span>
            <Badge variant="default" className="text-[0.6rem] py-0 px-1.5">{item.exchange}</Badge>
            {triggeredAlerts > 0 && (
              <Badge variant="loss" className="text-[0.6rem] py-0 px-1.5 flex items-center gap-1">
                <BellRing size={10} /> {triggeredAlerts} fired
              </Badge>
            )}
          </div>
          {item.lastUpdated && (
            <div className="text-[0.65rem] text-muted">
              Updated {new Date(item.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        
        {/* Sparkline */}
        <div className="flex items-center justify-center">
          <Sparkline open={item.open} high={item.high} low={item.low} ltp={item.ltp} />
        </div>

        {/* LTP */}
        <div className="text-right">
          <div className="font-mono font-bold text-sm text-primary">
            {item.ltp ? `₹${item.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-muted">—</span>}
          </div>
          <div className="text-[0.65rem] text-muted uppercase tracking-wider">LTP</div>
        </div>

        {/* Day Change */}
        <div className="text-right min-w-[70px]">
          {item.dayChange !== undefined ? (
            <div className={isUp ? 'text-profit' : 'text-loss'}>
              <div className="font-mono font-bold text-xs flex items-center justify-end gap-1">
                {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {isUp ? '+' : ''}{item.dayChange.toFixed(2)}
              </div>
              <div className="text-[0.65rem] font-bold">{(item.dayChangePct ?? 0) >= 0 ? '+' : ''}{(item.dayChangePct ?? 0).toFixed(2)}%</div>
            </div>
          ) : <span className="text-muted text-xs">—</span>}
        </div>

        {/* O / H / L */}
        {(['open', 'high', 'low'] as const).map((key) => (
          <div key={key} className="hidden md:block text-right min-w-[60px]">
            <div className={`font-mono text-[0.75rem] ${key === 'high' ? 'text-profit' : key === 'low' ? 'text-loss' : 'text-secondary'}`}>
              {item[key] ? `₹${item[key]!.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
            </div>
            <div className="text-[0.6rem] text-muted uppercase tracking-wider">{key}</div>
          </div>
        ))}

        {/* Alerts */}
        <div className="text-right">
          <button
            className={`btn btn-sm w-full gap-1.5 ${activeAlerts > 0 ? 'bg-warning/10 text-warning hover:bg-warning/20 border-warning/30' : 'btn-ghost text-muted hover:bg-bg-primary'}`}
            onClick={() => setShowAlertModal(true)}
            title="Set price alert"
          >
            {activeAlerts > 0 ? <Bell size={12} fill="currentColor" /> : <Bell size={12} />}
            <span className="text-[0.7rem]">{activeAlerts > 0 ? `${activeAlerts} alert${activeAlerts !== 1 ? 's' : ''}` : 'Alert'}</span>
          </button>
        </div>

        {/* Remove */}
        <div className="text-right">
          <button
            className="p-1.5 text-muted hover:text-loss rounded-md hover:bg-loss-bg transition-fast opacity-0 group-hover:opacity-100"
            onClick={() => removeItem(item.id)}
            title="Remove from watchlist"
          >
            <Trash2 size={15} />
          </button>
        </div>
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
      <div className="text-center py-10 text-muted text-sm">
        <BellOff size={32} className="mx-auto mb-3 opacity-30" />
        No alerts set. Click <strong>Alert</strong> on any symbol to set one.
      </div>
    )
  }

  return (
    <div className="p-4">
      {triggered.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-loss uppercase tracking-wider">
              🔔 Triggered ({triggered.length})
            </span>
            <button className="text-xs text-muted hover:text-primary transition-fast" onClick={clearTriggeredAlerts}>
              Clear All
            </button>
          </div>
          {triggered.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 mb-2 bg-loss/10 border border-loss/20 rounded-md">
              <CheckCircle2 size={16} className="text-loss flex-shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-bold text-primary">{a.symbol}</span>
                <span className="text-muted mx-2">{condLabel[a.condition]} ₹{a.targetPrice.toLocaleString('en-IN')}</span>
                {a.note && <span className="text-muted italic text-xs">· {a.note}</span>}
              </div>
              <span className="text-[0.65rem] text-muted">
                {a.triggeredAt ? new Date(a.triggeredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
              <button className="p-1 text-muted hover:text-loss transition-fast rounded" onClick={() => removeAlert(a.id)}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <div className="text-xs font-bold text-warning uppercase tracking-wider mb-3">
            ⏳ Pending ({pending.length})
          </div>
          {pending.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 mb-2 bg-warning/10 border border-warning/20 rounded-md">
              <Bell size={16} className="text-warning flex-shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-bold text-primary">{a.symbol}</span>
                <span className="text-muted mx-2">{condLabel[a.condition]}</span>
                <span className="font-mono font-bold text-primary">₹{a.targetPrice.toLocaleString('en-IN')}</span>
                {a.note && <span className="text-muted italic text-xs ml-2">· {a.note}</span>}
              </div>
              <button className="p-1 text-muted hover:text-loss transition-fast rounded" onClick={() => removeAlert(a.id)}><X size={14} /></button>
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
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return (
    <div className="app-content animate-fade-in flex flex-col h-full overflow-auto">
      <PageHeader 
        title={
          <span className="flex items-center gap-2">
            <Activity size={22} className="text-accent" />
            Watchlist
          </span>
        }
        subtitle={
          <span>
            {items.length} symbol{items.length !== 1 ? 's' : ''} · refreshes every 30s
            {pendingAlerts > 0 && <span className="text-warning ml-2">· ⏳ {pendingAlerts} pending alert{pendingAlerts !== 1 ? 's' : ''}</span>}
            {triggeredAlerts > 0 && <span className="text-loss ml-2">· 🔔 {triggeredAlerts} fired</span>}
          </span>
        }
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Add Symbol
          </button>
        }
      />

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="flex border-b border-border mb-5 gap-1">
        {([
          { key: 'watchlist', label: `Symbols (${items.length})`, icon: <Eye size={14} /> },
          { key: 'alerts',    label: `Alerts (${alerts.length})`,  icon: <Bell size={14} /> },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-fast ${
              activeTab === key 
                ? 'border-accent text-accent bg-accent-dim' 
                : 'border-transparent text-muted hover:bg-bg-secondary'
            }`}
          >
            {icon}{label}
            {key === 'alerts' && triggeredAlerts > 0 && (
              <span className="bg-loss text-white rounded-full text-[0.6rem] font-bold px-1.5 ml-1">
                {triggeredAlerts}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Watchlist tab ─────────────────────────────────────────── */}
      {activeTab === 'watchlist' && (
        <Card className="p-0 overflow-hidden flex-1 flex flex-col min-h-0">
          {items.length === 0 ? (
            <div className="text-center p-12 text-muted flex-1 flex flex-col items-center justify-center">
              <Eye size={42} className="mx-auto mb-4 opacity-30" />
              <h3 className="mb-2 text-primary font-bold text-lg">Your watchlist is empty</h3>
              <p className="text-sm">Add NSE/BSE symbols to track live prices and set price alerts.</p>
              <button className="btn btn-primary mt-6" onClick={() => setShowAddModal(true)}>
                <Plus size={14} /> Add First Symbol
              </button>
            </div>
          ) : (
            <div className="table-scroll-wrapper overflow-auto flex-1">
              <div className="min-w-[700px]">
                {/* Column headers */}
                <div 
                  className="grid gap-4 py-2 px-4 bg-bg-card border-b border-border text-[0.65rem] font-bold tracking-wider uppercase text-muted sticky top-0 z-10"
                  style={{ gridTemplateColumns: 'minmax(120px, 1fr) 80px auto auto auto auto 90px 40px' }}
                >
                  <span>Symbol</span>
                  <span className="text-center">Trend</span>
                  <span className="text-right">LTP</span>
                  <span className="text-right min-w-[70px]">Day Chg</span>
                  <span className="hidden md:block text-right min-w-[60px]">Open</span>
                  <span className="hidden md:block text-right min-w-[60px]">High</span>
                  <span className="hidden md:block text-right min-w-[60px]">Low</span>
                  <span className="text-right">Alerts</span>
                  <span />
                </div>
                <div>
                  {items.map((item) => <WatchlistRow key={item.id} item={item} />)}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Alerts tab ────────────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <Card className="p-0 flex-1">
          <AlertsPanel />
        </Card>
      )}

      {/* ── How it works ──────────────────────────────────────────── */}
      <Card className="mt-5 p-4 border-info bg-info/5">
        <div className="flex gap-4 items-start flex-wrap">
          {[
            { icon: <RefreshCw size={14} />, text: 'Prices refresh every 30 seconds via Yahoo Finance during market hours' },
            { icon: <Bell size={14} />,      text: 'Price alerts fire browser notifications (allow permission when prompted)' },
            { icon: <BellRing size={14} />,  text: 'Supports 4 conditions: above, below, crosses above & crosses below' },
          ].map(({ icon, text }, i) => (
            <div key={i} className="flex items-center gap-2 text-[0.75rem] text-muted flex-1 min-w-[200px]">
              <span className="text-[#60A5FA] flex-shrink-0">{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </Card>

      {showAddModal && <AddSymbolModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
