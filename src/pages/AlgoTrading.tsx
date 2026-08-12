import { useState, useEffect, useRef } from 'react'
import { Play, Square, Settings2, Activity, ShieldAlert, Cpu, GitBranch, TerminalSquare, AlertCircle, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import CreateStrategyModal from '@/components/CreateStrategyModal'
import ConfigureStrategyModal from '@/components/ConfigureStrategyModal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const MOCK_STRATEGIES = [
  { id: 'momentum', name: 'Nifty Momentum Scanner', desc: 'Breakout catcher on 15m timeframe.', active: true, pnl: '+₹14,500' },
  { id: 'mean_rev', name: 'BankNifty Reversion', desc: 'Fades RSI extremes on 5m timeframe.', active: false, pnl: '-₹2,100' },
  { id: 'grid', name: 'Reliance Grid', desc: 'Accumulates on drops, sells on bounces.', active: true, pnl: '+₹4,200' },
  { id: 'options', name: 'Iron Condor Auto', desc: 'Sells OTM options for Theta decay.', active: false, pnl: '₹0' },
  { id: 'arbitrage', name: 'Pairs Arbitrage', desc: 'HDFC vs HDFCBANK stat-arb spread.', active: true, pnl: '+₹1,850' },
  { id: 'scalp_pro', name: 'Scalper Pro', desc: 'Orderbook DOM imbalance sniffer 1m.', active: false, pnl: '+₹25,300' },
]

const RISK_PARAMS = [
  { label: 'Max Daily Loss', val: '₹5,000' },
  { label: 'Max Orders / Day', val: '50' },
  { label: 'Max Capital Allocation', val: '25%' },
  { label: 'Kill Switch', val: 'Active', color: 'text-profit' }
]

export default function AlgoTrading() {
  const [isRunning, setIsRunning]         = useState(false)
  const [paperTrading, setPaperTrading]   = useState(true)
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
    <div className="app-content animate-fade-in flex flex-col h-full overflow-auto">
      <PageHeader 
        title={
          <span className="flex items-center gap-3">
            <Cpu size={24} className="text-accent" />
            Algorithmic Trading
          </span>
        }
        subtitle="Fully automated execution engine connected to broker API."
        actions={
          <div className="flex items-center gap-4">
            <button 
              className={`flex items-center gap-2 text-sm font-semibold transition-fast ${paperTrading ? 'text-warning' : 'text-muted hover:text-primary'}`}
              onClick={() => setPaperTrading(!paperTrading)}
            >
              {paperTrading ? <ToggleRight size={20} className="text-warning" /> : <ToggleLeft size={20} />}
              Paper Trading {paperTrading ? 'ON' : 'OFF'}
            </button>
            
            <button 
              className={`btn px-6 py-2 rounded-md font-bold text-white transition-all duration-300 shadow-md ${isRunning ? 'bg-loss hover:bg-loss/90' : 'bg-profit hover:bg-profit/90'}`}
              onClick={toggleEngine}
              style={{ boxShadow: isRunning ? '0 0 15px rgba(239,68,68,0.4)' : '0 0 15px rgba(16,185,129,0.4)' }}
            >
              {isRunning ? <><Square size={16} fill="white" /> STOP ENGINE</> : <><Play size={16} fill="white" /> START ENGINE</>}
            </button>
          </div>
        }
      />

      {!isRunning ? (
        <Card className="mb-6 p-4 border-warning bg-warning/10 flex items-start gap-3">
          <AlertCircle className="text-warning flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-warning font-bold">The execution engine is currently offline.</div>
            <p className="text-sm text-secondary mt-1">
              Strategies will not place live orders. Background data synchronization and trailing stop losses are paused.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="mb-6 p-4 border-profit bg-profit/10 flex items-center gap-3" style={{ animation: 'pulse-glow 2s infinite' }}>
          <Activity className="text-profit flex-shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
          <div className="text-profit font-bold">Engine is live and scanning markets.</div>
        </Card>
      )}

      <div className="grid gap-6 flex-1" style={{ gridTemplateColumns: '1fr 340px' }}>
        <div className="flex flex-col gap-6">
          {/* Strategy Selection */}
          <Card className="flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold flex items-center gap-2"><GitBranch size={16} className="text-primary" /> Active Strategies</h3>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm text-xs font-semibold" onClick={() => setShowCreateModal(true)}>
                  <Plus size={14} /> Create Strategy
                </button>
                <button className="btn btn-ghost btn-sm text-xs font-semibold" onClick={() => setShowConfigModal(true)}>
                  <Settings2 size={14} /> Configure
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {MOCK_STRATEGIES.map((s) => (
                <div 
                  key={s.id} 
                  className={`p-4 rounded-lg cursor-pointer transition-fast border ${
                    selectedStrategy === s.id 
                      ? 'border-accent bg-accent-dim' 
                      : 'border-border bg-bg-card hover:border-border-light'
                  }`}
                  onClick={() => setSelectedStrategy(s.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-sm text-primary">{s.name}</div>
                    <Badge variant={s.active ? 'profit' : 'default'} className="text-[0.6rem] py-0 px-1.5">{s.active ? 'ACTIVE' : 'IDLE'}</Badge>
                  </div>
                  <div className="text-xs text-muted mb-3 h-8">{s.desc}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-secondary font-medium">Month P&L:</span>
                    <span className={`font-bold font-mono text-sm ${
                      s.pnl.startsWith('+') ? 'text-profit' : s.pnl.startsWith('-') ? 'text-loss' : 'text-primary'
                    }`}>
                      {s.pnl}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Terminal / Logs */}
          <Card className="flex-1 flex flex-col !bg-[#0a0a0a] !border-[#222]">
            <h3 className="font-bold flex items-center gap-2 mb-4 text-[#888]">
              <TerminalSquare size={16} /> Console Logs
            </h3>
            <div className="font-mono text-xs text-[#00ff00] flex flex-col gap-1.5 h-[200px] overflow-y-auto pr-2 custom-scrollbar flex-1">
              {logs.map((log, i) => (
                <div key={i} className={`${log.includes('[WARN]') ? 'text-yellow-400' : log.includes('[ENGINE]') ? 'text-cyan-400' : 'text-[#888]'}`}>
                  {log}
                </div>
              ))}
              {!isRunning && (
                <div className="text-loss mt-2">[ENGINE] Engine is halted by user. Standing by...</div>
              )}
              {isRunning && (
                <div className="animate-pulse text-yellow-400 mt-1">_</div>
              )}
              <div ref={logsEndRef} />
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-6">
          <Card>
            <h3 className="font-bold flex items-center gap-2 mb-5">
              <ShieldAlert size={16} className="text-primary" /> Risk Management
            </h3>
            <div className="flex flex-col gap-4">
              {RISK_PARAMS.map(r => (
                 <div key={r.label} className="flex justify-between items-center pb-3 border-b border-border last:border-0 last:pb-0">
                   <span className="text-xs font-semibold text-muted tracking-wider uppercase">{r.label}</span>
                   <span className={`font-bold text-sm ${r.color || 'text-primary'}`}>{r.val}</span>
                 </div>
              ))}
            </div>
          </Card>
          
          <Card className="border-info bg-info/5">
            <h3 className="font-bold flex items-center gap-2 mb-3">
              <Activity size={16} className="text-info" /> Backtest Results
            </h3>
            <p className="text-xs text-muted mb-4">
              Latest backtest for <strong>{MOCK_STRATEGIES.find(s => s.id === selectedStrategy)?.name}</strong>.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-xs text-muted">Win Rate</span>
                <span className="text-xs font-bold font-mono">68.4%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted">Max Drawdown</span>
                <span className="text-xs font-bold font-mono text-loss">-4.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted">Sharpe Ratio</span>
                <span className="text-xs font-bold font-mono text-profit">1.85</span>
              </div>
            </div>
            <button className="btn btn-outline btn-sm w-full mt-5">View Full Report</button>
          </Card>
        </div>
      </div>
      
      {showCreateModal && <CreateStrategyModal onClose={() => setShowCreateModal(false)} />}
      {showConfigModal && <ConfigureStrategyModal onClose={() => setShowConfigModal(false)} />}
    </div>
  )
}
