import { useState, useEffect, useRef } from 'react'
import { Play, Square, Settings2, Activity, ShieldAlert, Cpu, GitBranch, TerminalSquare, AlertCircle, Plus } from 'lucide-react'
import CreateStrategyModal from '@/components/CreateStrategyModal'
import ConfigureStrategyModal from '@/components/ConfigureStrategyModal'

const MOCK_STRATEGIES = [
  { id: 'momentum', name: 'Nifty Momentum Scanner', desc: 'Breakout catcher on 15m timeframe.', active: true, pnl: '+₹14,500' },
  { id: 'mean_rev', name: 'BankNifty Reversion', desc: 'Fades RSI extremes on 5m timeframe.', active: false, pnl: '-₹2,100' },
  { id: 'grid', name: 'Reliance Grid Grid', desc: 'Accumulates on drops, sells on bounces.', active: true, pnl: '+₹4,200' },
  { id: 'options', name: 'Iron Condor Auto', desc: 'Sells OTM options for Theta decay.', active: false, pnl: '₹0' },
  { id: 'arbitrage', name: 'Pairs Arbitrage', desc: 'HDFC vs HDFCBANK stat-arb spread.', active: true, pnl: '+₹1,850' },
  { id: 'scalp_pro', name: 'Scalper Pro', desc: 'Orderbook DOM imbalance sniffer 1m.', active: false, pnl: '+₹25,300' },
]

const RISK_PARAMS = [
  { label: 'Max Daily Loss', val: '₹5,000' },
  { label: 'Max Orders / Day', val: '50' },
  { label: 'Max Capital Allocation', val: '25%' },
  { label: 'Kill Switch', val: 'Active', color: 'var(--color-profit)' }
]

export default function AlgoTrading() {
  const [isRunning, setIsRunning]         = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState('momentum')
  const [showCreateModal, setShowCreateModal]   = useState(false)
  const [showConfigModal, setShowConfigModal]   = useState(false)
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Initializing algorithmic engine...",
    "[SYSTEM] Connecting to Zerodha Kite API... OK",
    "[DATA] Fetched historical bars for NIFTY50."
  ])
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Performant auto-scroll buffer
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  // Mock high-performance event stream
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      const messages = [
        `[SCAN] Evaluating Nifty 15m breakout... MACD=Bullish / RSI=${(Math.random() * 100).toFixed(1)}`,
        `[SCAN] HDFC vs HDFCBANK Spread: ${(Math.random() * 2).toFixed(3)}`,
        `[DATA] Tick received: INFY @ ${(1500 + Math.random() * 10).toFixed(2)}`,
        `[GRID] Placing Limit Order BUY Reliance @ ${(2900 - Math.random() * 5).toFixed(1)}`,
        `[WARN] Latency spike detected in WebSocket: ${Math.floor(Math.random() * 200)}ms`
      ]
      setLogs(prev => {
        const next = [...prev, messages[Math.floor(Math.random() * messages.length)]]
        // Cap the memory buffer to 50 items for blazing fast DOM reconciliation
        return next.length > 50 ? next.slice(next.length - 50) : next
      })
    }, 1500)
    
    setTimeout(() => {
      setLogs(prev => [...prev, "[ENGINE] Started execution strategies..."])
    }, 0)
    return () => clearInterval(interval)
  }, [isRunning])

  const toggleEngine = () => setIsRunning(!isRunning)

  return (
    <div className="app-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Cpu size={24} color="var(--color-accent)" />
            Algorithmic Trading
          </h1>
          <p className="page-subtitle">Fully automated execution engine connected to Zerodha API.</p>
        </div>
        <div className="page-actions">
          <button 
            className={`btn btn-lg ${isRunning ? 'btn-danger' : 'btn-success'} animate-fade-in`} 
            onClick={toggleEngine}
            style={{ 
              fontWeight: 700, 
              background: isRunning ? 'var(--color-loss)' : 'var(--color-profit)',
              color: 'white',
              border: 'none',
              boxShadow: isRunning ? '0 0 15px rgba(239,68,68,0.4)' : '0 0 15px rgba(16,185,129,0.4)'
            }}
          >
            {isRunning ? <><Square size={16} fill="white" /> STOP ENGINE</> : <><Play size={16} fill="white" /> START ENGINE</>}
          </button>
        </div>
      </div>

      {!isRunning ? (
        <div className="card" style={{ background: 'var(--color-warning-bg)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 24 }}>
          <div className="flex items-center gap-3">
            <AlertCircle color="var(--color-warning)" />
            <div style={{ color: 'var(--color-warning)', fontWeight: 600 }}>The execution engine is currently offline.</div>
          </div>
          <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Strategies will not place live orders. Background data synchronization and trailing stop losses are paused.
          </p>
        </div>
      ) : (
        <div className="card" style={{ background: 'var(--color-profit-bg)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 24, animation: 'pulse-glow 2s infinite' }}>
          <div className="flex items-center gap-3">
            <Activity color="var(--color-profit)" className="animate-spin-slow" />
            <div style={{ color: 'var(--color-profit)', fontWeight: 600 }}>Engine is live and scanning markets.</div>
          </div>
        </div>
      )}

      <div className="grid grid-2" style={{ gridTemplateColumns: '1fr 340px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Strategy Selection */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2"><GitBranch size={16} /> Active Strategies</h3>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(true)}>
                  <Plus size={14} /> Create Advanced Logic
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowConfigModal(true)}>
                  <Settings2 size={14} /> Configure
                </button>
              </div>
            </div>
            
            <div className="grid grid-2 gap-4">
              {MOCK_STRATEGIES.map((s) => (
                <div 
                  key={s.id} 
                  className={`card ${selectedStrategy === s.id ? 'active' : ''}`}
                  style={{ 
                    cursor: 'pointer', 
                    border: selectedStrategy === s.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                    background: selectedStrategy === s.id ? 'var(--color-accent-dim)' : 'var(--color-bg-card)',
                  }}
                  onClick={() => setSelectedStrategy(s.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                    <div className={`badge ${s.active ? 'badge-profit' : 'badge-neutral'}`}>{s.active ? 'ACTIVE' : 'IDLE'}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>{s.desc}</div>
                  <div className="flex justify-between items-center text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>Month P&L:</span>
                    <span style={{ fontWeight: 700, color: s.pnl.startsWith('+') ? 'var(--color-profit)' : s.pnl.startsWith('-') ? 'var(--color-loss)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{s.pnl}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal / Logs */}
          <div className="card" style={{ background: '#0a0a0a', border: '1px solid #222' }}>
            <h3 className="flex items-center gap-2 mb-4" style={{ color: '#888' }}><TerminalSquare size={16} /> Console Logs</h3>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#00ff00', display: 'flex', flexDirection: 'column', gap: 6, height: 200, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#333 #0a0a0a' }}>
              {logs.map((log, i) => (
                <div key={i} style={{ color: log.includes('[WARN]') ? 'yellow' : log.includes('[ENGINE]') ? 'cyan' : '#888' }}>
                  {log}
                </div>
              ))}
              {!isRunning && (
                <div style={{ color: 'var(--color-loss)' }}>[ENGINE] Engine is halted by user. Standing by...</div>
              )}
              {isRunning && (
                <div className="animate-pulse" style={{ color: 'yellow' }}>_</div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h3 className="flex items-center gap-2 mb-4"><ShieldAlert size={16} /> Risk Management</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {RISK_PARAMS.map(r => (
                 <div key={r.label} className="flex justify-between items-center" style={{ paddingBottom: 10, borderBottom: '1px solid var(--color-border)' }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.label}</span>
                   <span style={{ fontWeight: 600, color: r.color || 'var(--text-primary)' }}>{r.val}</span>
                 </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {showCreateModal && <CreateStrategyModal onClose={() => setShowCreateModal(false)} />}
      {showConfigModal && <ConfigureStrategyModal onClose={() => setShowConfigModal(false)} />}
    </div>
  )
}
