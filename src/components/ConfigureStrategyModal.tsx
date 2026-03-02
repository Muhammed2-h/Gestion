import { useState } from 'react'
import { X, Settings2, ShieldAlert, Zap, Database, Save, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react'

interface Props { onClose: () => void }

// ─── Types ────────────────────────────────────────────────────────────────────
interface StrategyConfig {
  id: string
  name: string
  active: boolean
  maxOrdersPerDay: number
  capitalPct: number
}

interface RiskConfig {
  maxDailyLoss: number
  maxOrdersTotal: number
  maxCapitalPct: number
  killSwitch: boolean
  slippageTolerance: number
  trailingStopPct: number
}

interface BrokerConfig {
  broker: string
  apiKey: string
  apiSecret: string
  mode: 'paper' | 'live'
}

const DEFAULT_STRATEGIES: StrategyConfig[] = [
  { id: 'momentum',  name: 'Nifty Momentum Scanner', active: true,  maxOrdersPerDay: 10, capitalPct: 20 },
  { id: 'mean_rev',  name: 'BankNifty Reversion',    active: false, maxOrdersPerDay: 8,  capitalPct: 15 },
  { id: 'grid',      name: 'Reliance Grid',           active: true,  maxOrdersPerDay: 20, capitalPct: 10 },
  { id: 'options',   name: 'Iron Condor Auto',        active: false, maxOrdersPerDay: 4,  capitalPct: 10 },
  { id: 'arbitrage', name: 'Pairs Arbitrage',         active: true,  maxOrdersPerDay: 30, capitalPct: 5  },
  { id: 'scalp_pro', name: 'Scalper Pro',             active: false, maxOrdersPerDay: 50, capitalPct: 5  },
]

const TABS = ['Broker', 'Risk', 'Strategies', 'Data'] as const
type Tab = typeof TABS[number]

export default function ConfigureStrategyModal({ onClose }: Props) {
  const [activeTab, setActiveTab]     = useState<Tab>('Broker')
  const [saved, setSaved]             = useState(false)
  const [strategies, setStrategies]   = useState<StrategyConfig[]>(DEFAULT_STRATEGIES)
  const [broker, setBroker]           = useState<BrokerConfig>({
    broker: 'zerodha', apiKey: '', apiSecret: '', mode: 'paper',
  })
  const [risk, setRisk]               = useState<RiskConfig>({
    maxDailyLoss: 5000,
    maxOrdersTotal: 50,
    maxCapitalPct: 25,
    killSwitch: true,
    slippageTolerance: 0.5,
    trailingStopPct: 1.5,
  })

  function handleSave() {
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1200)
  }

  function toggleStrategy(id: string) {
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s))
  }

  function updateStrategy(id: string, field: keyof StrategyConfig, value: any) {
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const totalCapital = strategies.filter(s => s.active).reduce((a, s) => a + s.capitalPct, 0)
  const isOverAllocated = totalCapital > 100

  return (
    <div style={overlay}>
      <div style={modalBox} className="animate-fade-in">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings2 size={18} color="var(--color-accent)" />
              Engine Configuration
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Broker connection, risk limits, strategy toggles &amp; data settings
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close"><X size={18} /></button>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: 4, marginBottom: 24 }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 18px', border: 'none', cursor: 'pointer', fontSize: '0.82rem',
                fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? 'var(--color-accent)' : 'var(--text-muted)',
                background: activeTab === tab ? 'var(--color-accent-dim)' : 'transparent',
                borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                transition: 'all 0.15s',
              }}
            >
              {tab === 'Broker'     && <Zap       size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />}
              {tab === 'Risk'       && <ShieldAlert size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />}
              {tab === 'Strategies' && <Settings2 size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />}
              {tab === 'Data'       && <Database   size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />}
              {tab}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* BROKER TAB                                                 */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Broker' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Broker selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'var(--modal-grid-2, 1fr 1fr)', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Broker</label>
                <select className="form-select" value={broker.broker} onChange={e => setBroker(b => ({ ...b, broker: e.target.value }))}>
                  <option value="zerodha">Zerodha Kite</option>
                  <option value="upstox">Upstox</option>
                  <option value="angel">Angel One (SmartAPI)</option>
                  <option value="fyers">Fyers</option>
                  <option value="dhan">Dhan</option>
                  <option value="5paisa">5paisa</option>
                  <option value="shoonya">Shoonya (Finvasia)</option>
                  <option value="paytm">Paytm Money</option>
                  <option value="iifl">IIFL Securities</option>
                  <option value="dummy">Dummy (Paper Only)</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Mode</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  {(['paper', 'live'] as const).map(m => (
                    <label key={m} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '9px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      border: `1px solid ${broker.mode === m
                        ? m === 'live' ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'
                        : 'var(--color-border)'}`,
                      background: broker.mode === m
                        ? m === 'live' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)'
                        : 'var(--color-bg-primary)',
                      fontWeight: broker.mode === m ? 700 : 400,
                      fontSize: '0.82rem',
                      color: broker.mode === m
                        ? m === 'live' ? 'var(--color-loss)' : '#60A5FA'
                        : 'var(--text-muted)',
                    }}>
                      <input type="radio" name="mode" value={m} checked={broker.mode === m}
                        onChange={() => setBroker(b => ({ ...b, mode: m }))}
                        style={{ display: 'none' }} />
                      {m === 'paper' ? '📄 Paper' : '⚡ Live'}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {broker.mode === 'live' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', fontSize: '0.79rem', color: 'var(--color-loss)' }}>
                ⚠️ <strong>Live mode</strong> will place real orders using your broker account. Use Paper mode for testing.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'var(--modal-grid-2, 1fr 1fr)', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">API Key</label>
                <input
                  type="text" className="form-input"
                  placeholder="Paste your API key…"
                  value={broker.apiKey}
                  onChange={e => setBroker(b => ({ ...b, apiKey: e.target.value }))}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.05em' }}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">API Secret</label>
                <input
                  type="password" className="form-input"
                  placeholder="Paste your API secret…"
                  value={broker.apiSecret}
                  onChange={e => setBroker(b => ({ ...b, apiSecret: e.target.value }))}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <button className="btn btn-outline" style={{ alignSelf: 'flex-start', gap: 7 }}>
              <RefreshCw size={13} /> Test Connection
            </button>

            <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px 18px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Where to find your API credentials:</strong><br />
              • <strong>Zerodha</strong> → kite.zerodha.com/settings → API → Create App<br />
              • <strong>Upstox</strong> → developer.upstox.com → My Apps → Create App<br />
              • <strong>Angel One</strong> → smartapi.angelbroking.com → Create App<br />
              • <strong>Fyers</strong> → myapi.fyers.in → App Overview<br />
              Your credentials are stored locally only — never sent to any external server.
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* RISK TAB                                                   */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Risk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'var(--modal-grid-2, 1fr 1fr)', gap: 14 }}>

              {/* Kill Switch */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: risk.killSwitch ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${risk.killSwitch ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Kill Switch</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Immediately halts all live order placement when triggered
                  </div>
                </div>
                <button
                  onClick={() => setRisk(r => ({ ...r, killSwitch: !r.killSwitch }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {risk.killSwitch
                    ? <><ToggleRight size={36} color="var(--color-profit)" /><span style={{ color: 'var(--color-profit)', fontWeight: 700, fontSize: '0.8rem' }}>ARMED</span></>
                    : <><ToggleLeft  size={36} color="var(--color-loss)"   /><span style={{ color: 'var(--color-loss)',   fontWeight: 700, fontSize: '0.8rem' }}>DISABLED</span></>
                  }
                </button>
              </div>

              {/* Numeric risk params */}
              {[
                { key: 'maxDailyLoss',       label: 'Max Daily Loss (₹)',        suffix: '₹',  min: 500,  max: 100000, step: 500 },
                { key: 'maxOrdersTotal',      label: 'Max Orders / Day',          suffix: '',   min: 1,    max: 500,    step: 1   },
                { key: 'maxCapitalPct',       label: 'Max Capital Allocation (%)',suffix: '%',  min: 1,    max: 100,    step: 1   },
                { key: 'slippageTolerance',   label: 'Slippage Tolerance (%)',    suffix: '%',  min: 0.1,  max: 5,      step: 0.1 },
                { key: 'trailingStopPct',     label: 'Trailing Stop Loss (%)',    suffix: '%',  min: 0.1,  max: 20,     step: 0.1 },
              ].map(({ key, label, suffix, min, max, step }) => (
                <div key={key} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>{label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="number" className="form-input"
                      min={min} max={max} step={step}
                      value={risk[key as keyof RiskConfig] as number}
                      onChange={e => setRisk(r => ({ ...r, [key]: parseFloat(e.target.value) }))}
                      style={{ flex: 1, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                    />
                    {suffix && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>{suffix}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Risk summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'var(--modal-grid-3, repeat(3, 1fr))', gap: 10 }}>
              {[
                { label: 'Max Daily Loss',     val: `₹${risk.maxDailyLoss.toLocaleString('en-IN')}`, color: 'var(--color-loss)' },
                { label: 'Max Orders / Day',   val: risk.maxOrdersTotal.toString(),                   color: 'var(--color-warning)' },
                { label: 'Max Capital',         val: `${risk.maxCapitalPct}%`,                         color: 'var(--color-accent)' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ padding: '12px 14px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 800, color }}>{val}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* STRATEGIES TAB                                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Strategies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isOverAllocated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--color-loss)' }}>
                ⚠️ Total capital allocated by active strategies is <strong>{totalCapital}%</strong> — over 100%. Reduce per-strategy limits.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {strategies.filter(s => s.active).length} of {strategies.length} active •&nbsp;
                <span style={{ color: isOverAllocated ? 'var(--color-loss)' : 'var(--color-profit)', fontWeight: 600 }}>
                  {totalCapital}% capital allocated
                </span>
              </span>
            </div>

            {strategies.map(s => (
              <div key={s.id} style={{
                display: 'grid', gridTemplateColumns: 'var(--algo-exec-grid, auto 1fr 140px 120px)',
                alignItems: 'center', gap: 14,
                padding: '14px 16px',
                background: s.active ? 'rgba(16,185,129,0.04)' : 'var(--color-bg-primary)',
                border: `1px solid ${s.active ? 'rgba(16,185,129,0.2)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                transition: 'all 0.15s',
              }}>
                {/* Toggle */}
                <button onClick={() => toggleStrategy(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  {s.active
                    ? <ToggleRight size={26} color="var(--color-profit)" />
                    : <ToggleLeft  size={26} color="var(--color-border)" />
                  }
                </button>

                {/* Name */}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: s.active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {s.active ? 'Enabled · will execute orders' : 'Disabled · no orders'}
                  </div>
                </div>

                {/* Max orders */}
                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Max Orders/Day</label>
                  <input
                    type="number" className="form-input" min={1} max={100}
                    value={s.maxOrdersPerDay}
                    onChange={e => updateStrategy(s.id, 'maxOrdersPerDay', +e.target.value)}
                    style={{ padding: '5px 8px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                    disabled={!s.active}
                  />
                </div>

                {/* Capital % */}
                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Capital %</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number" className="form-input" min={1} max={100}
                      value={s.capitalPct}
                      onChange={e => updateStrategy(s.id, 'capitalPct', +e.target.value)}
                      style={{ flex: 1, padding: '5px 8px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                      disabled={!s.active}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* DATA TAB                                                   */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Data' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              {
                label: 'Market Data Feed',
                desc: 'Source for live tick data and OHLCV bars',
                options: ['Zerodha WebSocket (Kite Connect)', 'Yahoo Finance (EOD)', 'Upstox WebSocket', 'Angel One SmartAPI'],
                def: 0,
              },
              {
                label: 'Tick Interval',
                desc: 'How frequently the engine re-evaluates strategies',
                options: ['1 second', '5 seconds', '10 seconds', '30 seconds', '1 minute'],
                def: 2,
              },
              {
                label: 'Historical Bars for Indicators',
                desc: 'Look-back window used to compute RSI, MACD, etc.',
                options: ['50 bars', '100 bars', '200 bars', '500 bars'],
                def: 1,
              },
              {
                label: 'Order Routing',
                desc: 'Where to send orders after signal generation',
                options: ['Direct (broker API)', 'Smart Order Router', 'Manual confirmation required'],
                def: 0,
              },
            ].map(({ label, desc, options, def }) => (
              <div key={label} className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{label}</label>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 6px' }}>{desc}</p>
                <select className="form-select" defaultValue={options[def]}>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}

            <div style={{ padding: '14px 18px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Note:</strong> Tick interval affects CPU load. Faster intervals improve signal precision but consume more resources. For most strategies, 10-30s is optimal.
            </div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 24 }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Settings are stored locally in your browser
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ gap: 7 }}>
              {saved
                ? <><span>✓</span> Saved!</>
                : <><Save size={14} /> Apply Changes</>
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(6px)', padding: 20,
}
const modalBox: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border-light)',
  borderRadius: 'var(--radius-2xl)',
  padding: '28px 30px',
  width: '100%', maxWidth: 760,
  maxHeight: '92vh', overflowY: 'auto',
  boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
}
