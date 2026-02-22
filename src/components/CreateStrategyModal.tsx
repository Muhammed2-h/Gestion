import { useState, useEffect, useId } from 'react'
import { X, Code, Play, TerminalSquare, SlidersHorizontal, Plus, Trash2, Info, ChevronDown } from 'lucide-react'

interface Props { onClose: () => void }

/* ─── Indicator Catalogue ─────────────────────────────────────────────────── */
interface IndicatorDef {
  id: string
  label: string
  category: string
  desc: string
  defaultPeriod: number
  defaultBuyValue: string
  defaultSellValue: string
  unit: string
}

const INDICATOR_CATALOGUE: IndicatorDef[] = [
  // Momentum
  { id: 'RSI',         label: 'RSI',                  category: 'Momentum',  desc: 'Relative Strength Index – overbought/oversold 0-100',        defaultPeriod: 14, defaultBuyValue: '30',   defaultSellValue: '70',   unit: 'level'  },
  { id: 'STOCH_K',     label: 'Stochastic %K',         category: 'Momentum',  desc: 'Stochastic oscillator fast line',                             defaultPeriod: 14, defaultBuyValue: '20',   defaultSellValue: '80',   unit: 'level'  },
  { id: 'STOCH_D',     label: 'Stochastic %D',         category: 'Momentum',  desc: 'Stochastic oscillator slow signal line',                       defaultPeriod: 3,  defaultBuyValue: '20',   defaultSellValue: '80',   unit: 'level'  },
  { id: 'CCI',         label: 'CCI',                   category: 'Momentum',  desc: 'Commodity Channel Index – divergence from avg price',          defaultPeriod: 20, defaultBuyValue: '-100', defaultSellValue: '100',  unit: 'level'  },
  { id: 'WILLIAMS_R',  label: 'Williams %R',           category: 'Momentum',  desc: 'Momentum indicator, range -100 to 0',                          defaultPeriod: 14, defaultBuyValue: '-80',  defaultSellValue: '-20',  unit: 'level'  },
  { id: 'MOM',         label: 'Momentum',              category: 'Momentum',  desc: 'Rate of change of price over N periods',                       defaultPeriod: 10, defaultBuyValue: '0',    defaultSellValue: '0',    unit: 'points' },
  { id: 'ROC',         label: 'Rate of Change (ROC)',  category: 'Momentum',  desc: 'Percentage price change over N periods',                        defaultPeriod: 12, defaultBuyValue: '0',    defaultSellValue: '0',    unit: '%'      },
  // Trend
  { id: 'EMA',         label: 'EMA',                   category: 'Trend',     desc: 'Exponential Moving Average – price crossover',                  defaultPeriod: 20, defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'     },
  { id: 'SMA',         label: 'SMA',                   category: 'Trend',     desc: 'Simple Moving Average – price crossover',                       defaultPeriod: 50, defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'     },
  { id: 'WMA',         label: 'WMA',                   category: 'Trend',     desc: 'Weighted Moving Average',                                       defaultPeriod: 20, defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'     },
  { id: 'DEMA',        label: 'DEMA',                  category: 'Trend',     desc: 'Double Exponential Moving Average – faster than EMA',           defaultPeriod: 21, defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'     },
  { id: 'TEMA',        label: 'TEMA',                  category: 'Trend',     desc: 'Triple Exponential Moving Average',                             defaultPeriod: 21, defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'     },
  { id: 'HULL',        label: 'Hull MA',               category: 'Trend',     desc: 'Hull Moving Average – low lag, smoother',                       defaultPeriod: 9,  defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'     },
  { id: 'VWAP',        label: 'VWAP',                  category: 'Trend',     desc: 'Volume Weighted Average Price – intraday anchor',               defaultPeriod: 1,  defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'     },
  { id: 'SUPERTREND',  label: 'Supertrend',            category: 'Trend',     desc: 'ATR-based trend direction indicator',                           defaultPeriod: 10, defaultBuyValue: '1',    defaultSellValue: '-1',   unit: 'dir'    },
  { id: 'ICHIMOKU',    label: 'Ichimoku Cloud',        category: 'Trend',     desc: 'Multi-line Japanese indicator for trend/support/resistance',    defaultPeriod: 9,  defaultBuyValue: '1',    defaultSellValue: '-1',   unit: 'signal' },
  // Volatility
  { id: 'MACD',        label: 'MACD Line',             category: 'Volatility',desc: 'Moving Avg Convergence Divergence – trend momentum',            defaultPeriod: 12, defaultBuyValue: '0',    defaultSellValue: '0',    unit: 'points' },
  { id: 'MACD_SIGNAL', label: 'MACD Signal',           category: 'Volatility',desc: 'MACD signal line (9-period EMA of MACD)',                       defaultPeriod: 9,  defaultBuyValue: '0',    defaultSellValue: '0',    unit: 'points' },
  { id: 'MACD_HIST',   label: 'MACD Histogram',        category: 'Volatility',desc: 'MACD histogram (MACD - Signal)',                                defaultPeriod: 26, defaultBuyValue: '0',    defaultSellValue: '0',    unit: 'points' },
  { id: 'ATR',         label: 'ATR',                   category: 'Volatility',desc: 'Average True Range – measures market volatility',               defaultPeriod: 14, defaultBuyValue: '20',   defaultSellValue: '20',   unit: '₹'     },
  { id: 'BB_UPPER',    label: 'Bollinger Upper',       category: 'Volatility',desc: 'Upper Bollinger Band – dynamic resistance',                     defaultPeriod: 20, defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'     },
  { id: 'BB_LOWER',    label: 'Bollinger Lower',       category: 'Volatility',desc: 'Lower Bollinger Band – dynamic support',                        defaultPeriod: 20, defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'     },
  { id: 'BB_WIDTH',    label: 'Bollinger Width',       category: 'Volatility',desc: 'Band width – measures volatility expansion/contraction',        defaultPeriod: 20, defaultBuyValue: '0.1',  defaultSellValue: '0.5',  unit: 'ratio'  },
  { id: 'KELTNER_UPPER',label: 'Keltner Upper',        category: 'Volatility',desc: 'Upper Keltner Channel',                                         defaultPeriod: 20, defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'    },
  { id: 'KELTNER_LOWER',label: 'Keltner Lower',        category: 'Volatility',desc: 'Lower Keltner Channel',                                         defaultPeriod: 20, defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'    },
  { id: 'DONCHIAN_HIGH',label: 'Donchian High',        category: 'Volatility',desc: 'N-period highest high (breakout)',                               defaultPeriod: 20, defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'    },
  { id: 'DONCHIAN_LOW', label: 'Donchian Low',         category: 'Volatility',desc: 'N-period lowest low (breakdown)',                                defaultPeriod: 20, defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'    },
  // Volume
  { id: 'OBV',         label: 'OBV',                   category: 'Volume',    desc: 'On Balance Volume – cumulative volume flow',                    defaultPeriod: 1,  defaultBuyValue: '0',    defaultSellValue: '0',    unit: 'volume' },
  { id: 'ADL',         label: 'A/D Line',              category: 'Volume',    desc: 'Accumulation/Distribution Line',                                defaultPeriod: 1,  defaultBuyValue: '0',    defaultSellValue: '0',    unit: 'volume' },
  { id: 'MFI',         label: 'MFI',                   category: 'Volume',    desc: 'Money Flow Index – volume-weighted RSI',                        defaultPeriod: 14, defaultBuyValue: '20',   defaultSellValue: '80',   unit: 'level'  },
  { id: 'CMF',         label: 'CMF',                   category: 'Volume',    desc: 'Chaikin Money Flow – buying vs selling pressure',               defaultPeriod: 20, defaultBuyValue: '0',    defaultSellValue: '0',    unit: 'ratio'  },
  { id: 'VWMA',        label: 'VWMA',                  category: 'Volume',    desc: 'Volume-Weighted Moving Average',                                defaultPeriod: 20, defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'     },
  // Price Action
  { id: 'PRICE',       label: 'Price (LTP)',            category: 'Price',     desc: 'Current last traded price',                                     defaultPeriod: 1,  defaultBuyValue: '100',  defaultSellValue: '200',  unit: '₹'     },
  { id: 'HIGH',        label: 'Day High',              category: 'Price',     desc: 'Current session high price',                                    defaultPeriod: 1,  defaultBuyValue: '100',  defaultSellValue: '200',  unit: '₹'     },
  { id: 'LOW',         label: 'Day Low',               category: 'Price',     desc: 'Current session low price',                                     defaultPeriod: 1,  defaultBuyValue: '100',  defaultSellValue: '200',  unit: '₹'     },
  { id: 'OPEN',        label: 'Open Price',            category: 'Price',     desc: 'Session open price',                                            defaultPeriod: 1,  defaultBuyValue: '100',  defaultSellValue: '200',  unit: '₹'     },
  { id: 'PREV_CLOSE',  label: 'Prev. Close',           category: 'Price',     desc: 'Previous session close price',                                  defaultPeriod: 1,  defaultBuyValue: '100',  defaultSellValue: '200',  unit: '₹'     },
  // Other
  { id: 'ADX',         label: 'ADX',                   category: 'Trend',     desc: 'Average Directional Index – trend strength 0-100',              defaultPeriod: 14, defaultBuyValue: '25',   defaultSellValue: '25',   unit: 'level'  },
  { id: 'AROON_UP',    label: 'Aroon Up',              category: 'Trend',     desc: 'Aroon Up – time since recent high',                             defaultPeriod: 25, defaultBuyValue: '70',   defaultSellValue: '30',   unit: 'level'  },
  { id: 'AROON_DN',    label: 'Aroon Down',            category: 'Trend',     desc: 'Aroon Down – time since recent low',                            defaultPeriod: 25, defaultBuyValue: '30',   defaultSellValue: '70',   unit: 'level'  },
  { id: 'PSAR',        label: 'Parabolic SAR',         category: 'Trend',     desc: 'Stop and Reverse trend-following tool',                         defaultPeriod: 1,  defaultBuyValue: 'price',defaultSellValue: 'price', unit: '₹'    },
]

const CATEGORIES = Array.from(new Set(INDICATOR_CATALOGUE.map(i => i.category)))

const CONDITIONS = [
  { val: '>',  label: '> Greater Than'      },
  { val: '<',  label: '< Less Than'         },
  { val: '>=', label: '≥ Greater or Equal'  },
  { val: '<=', label: '≤ Less or Equal'     },
  { val: '==', label: '= Equals'            },
  { val: 'crosses_above', label: '↑ Crosses Above' },
  { val: 'crosses_below', label: '↓ Crosses Below' },
]

/* ─── Rule type ──────────────────────────────────────────────────────────── */
interface Rule {
  id: string
  indicator: string
  condition: string
  value: string
  period: string
  logic: 'AND' | 'OR'
}

function makeRule(ind: IndicatorDef, side: 'buy' | 'sell'): Rule {
  return {
    id: Math.random().toString(36).slice(2),
    indicator: ind.id,
    condition: side === 'buy' ? '<' : '>',
    value: side === 'buy' ? ind.defaultBuyValue : ind.defaultSellValue,
    period: String(ind.defaultPeriod),
    logic: 'AND',
  }
}

/* ─── Code Generator ─────────────────────────────────────────────────────── */
function generateCode(
  name: string, asset: string, timeframe: string,
  buyRules: Rule[], sellRules: Rule[]
): string {
  const mapCond = (c: string) => {
    if (c === 'crosses_above') return '/* crosses_above */'
    if (c === 'crosses_below') return '/* crosses_below */'
    return c
  }
  const ruleToExpr = (r: Rule) => {
    const def = INDICATOR_CATALOGUE.find(d => d.id === r.indicator)!
    const fn = `hooks.use${r.indicator}(${r.period}, tick)`
    const cond = r.condition === 'crosses_above'
      ? `hooks.crossesAbove(hooks.use${r.indicator}(${r.period}, tick), ${r.value})`
      : r.condition === 'crosses_below'
      ? `hooks.crossesBelow(hooks.use${r.indicator}(${r.period}, tick), ${r.value})`
      : `${fn} ${mapCond(r.condition)} ${r.value}`
    return `  /* ${def.label} ${r.condition} ${r.value} */\n  ${cond}`
  }

  const buyBlock = buyRules.map((r, i) =>
    i === 0 ? ruleToExpr(r) : `  ${r.logic === 'AND' ? '&&' : '||'} ${ruleToExpr(r).trim()}`
  ).join('\n')

  const sellBlock = sellRules.map((r, i) =>
    i === 0 ? ruleToExpr(r) : `  ${r.logic === 'AND' ? '&&' : '||'} ${ruleToExpr(r).trim()}`
  ).join('\n')

  return `// ─── ${name || 'My Strategy'} ────────────────────────────────────────────
// Asset: ${asset}  |  Timeframe: ${timeframe}
// Auto-generated by Gestion Visual Builder

/**
 * @param {Object} tick - real-time market tick data
 * @param {number} tick.close - LTP / close
 * @param {number} tick.open  - open price
 * @param {number} tick.high  - day high
 * @param {number} tick.low   - day low
 * @param {number} tick.volume
 */
function onTick(tick) {
  const shouldBuy =
${buyBlock}

  const shouldSell =
${sellBlock}

  if (shouldSell) {
    execute.sell({ symbol: '${asset}', qty: 1, type: 'MARKET' })
  } else if (shouldBuy) {
    execute.buy({ symbol: '${asset}', qty: 1, type: 'MARKET' })
  }
}

// Risk Management
const STOP_LOSS_PCT  = 1.5   // 1.5% stop loss
const TARGET_PCT     = 3.0   // 3.0% take profit

function onOrderFill(order) {
  if (order.type === 'BUY') {
    execute.setStopLoss(order.price * (1 - STOP_LOSS_PCT / 100))
    execute.setTarget(order.price  * (1 + TARGET_PCT    / 100))
  }
}
`
}

/* ─── RuleRow component ──────────────────────────────────────────────────── */
function RuleRow({
  rule, onUpdate, onDelete, showDelete,
  side
}: {
  rule: Rule
  onUpdate: (patch: Partial<Rule>) => void
  onDelete: () => void
  showDelete: boolean
  side: 'buy' | 'sell'
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const def = INDICATOR_CATALOGUE.find(d => d.id === rule.indicator)!
  const color = side === 'buy' ? 'var(--color-profit)' : 'var(--color-loss)'
  const colorDim = side === 'buy' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 120px 72px auto',
        gap: 8, alignItems: 'end'
      }}>
        {/* Indicator */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: 4 }}>
            Indicator
            <span
              style={{ cursor: 'pointer', marginLeft: 5, color: 'var(--text-muted)', position: 'relative', display: 'inline-block' }}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Info size={11} />
              {showTooltip && (
                <span style={{
                  position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                  borderRadius: 6, padding: '6px 10px', whiteSpace: 'nowrap',
                  fontSize: '0.7rem', color: 'var(--text-secondary)', zIndex: 100,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)', lineHeight: 1.5, maxWidth: 240, whiteSpace: 'normal' as any,
                }}>
                  <strong style={{ color: 'var(--color-accent)' }}>{def.label}</strong><br />
                  {def.desc}<br />
                  <span style={{ color: 'var(--text-muted)' }}>Default Period: {def.defaultPeriod}</span>
                </span>
              )}
            </span>
          </label>
          <select
            className="form-select"
            style={{ fontSize: '0.82rem' }}
            value={rule.indicator}
            onChange={(e) => {
              const newDef = INDICATOR_CATALOGUE.find(d => d.id === e.target.value)!
              onUpdate({
                indicator: newDef.id,
                period: String(newDef.defaultPeriod),
                value: side === 'buy' ? newDef.defaultBuyValue : newDef.defaultSellValue,
              })
            }}
          >
            {CATEGORIES.map(cat => (
              <optgroup key={cat} label={`── ${cat} ──`}>
                {INDICATOR_CATALOGUE.filter(d => d.category === cat).map(d => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: 4 }}>Condition</label>
          <select
            className="form-select"
            style={{ fontSize: '0.82rem' }}
            value={rule.condition}
            onChange={(e) => onUpdate({ condition: e.target.value })}
          >
            {CONDITIONS.map(c => (
              <option key={c.val} value={c.val}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Value */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: 4 }}>Value ({def.unit})</label>
          <input
            type="text"
            className="form-input"
            style={{ fontSize: '0.82rem' }}
            value={rule.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
          />
        </div>

        {/* Period */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: 4 }}>Period</label>
          <input
            type="number"
            className="form-input"
            style={{ fontSize: '0.82rem' }}
            value={rule.period}
            onChange={(e) => onUpdate({ period: e.target.value })}
          />
        </div>

        {/* Delete */}
        <div style={{ paddingBottom: 1 }}>
          <button
            className="btn btn-ghost btn-icon"
            style={{ color: showDelete ? 'var(--color-loss)' : 'var(--color-border)', opacity: showDelete ? 1 : 0.3 }}
            disabled={!showDelete}
            onClick={onDelete}
            title="Remove rule"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Modal ─────────────────────────────────────────────────────────── */
export default function CreateStrategyModal({ onClose }: Props) {
  const [name,      setName]      = useState('')
  const [asset,     setAsset]     = useState('NIFTY')
  const [timeframe, setTimeframe] = useState('15m')
  const [exchange,  setExchange]  = useState('NSE')
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual')
  const [code,      setCode]      = useState('')

  const rsiDef  = INDICATOR_CATALOGUE.find(d => d.id === 'RSI')!
  const [buyRules,  setBuyRules]  = useState<Rule[]>([makeRule(rsiDef, 'buy')])
  const [sellRules, setSellRules] = useState<Rule[]>([makeRule(rsiDef, 'sell')])

  // ── Code sync from visual ──
  useEffect(() => {
    const generated = generateCode(name, `${asset}:${exchange}`, timeframe, buyRules, sellRules)
    setCode(generated)
  }, [name, asset, exchange, timeframe, buyRules, sellRules])

  function updateBuyRule(id: string, patch: Partial<Rule>) {
    setBuyRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }
  function updateSellRule(id: string, patch: Partial<Rule>) {
    setSellRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }
  function addBuyRule() {
    setBuyRules(prev => [...prev, makeRule(rsiDef, 'buy')])
  }
  function addSellRule() {
    setSellRules(prev => [...prev, makeRule(rsiDef, 'sell')])
  }

  return (
    <div style={overlay}>
      <div style={modalBox} className="animate-fade-in">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Code size={18} color="var(--color-accent)" />
              Create Advanced Strategy
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Build algorithmic execution rules with {INDICATOR_CATALOGUE.length} available indicators
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close"><X size={18} /></button>
        </div>

        {/* ── Strategy Params ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Strategy Name</label>
            <input className="form-input" placeholder="e.g. RSI Reverb v2" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Symbol</label>
            <input className="form-input" placeholder="NIFTY" value={asset} onChange={e => setAsset(e.target.value.toUpperCase())} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Exchange</label>
            <select className="form-select" value={exchange} onChange={e => setExchange(e.target.value)}>
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
              <option value="NFO">NFO (F&O)</option>
              <option value="MCX">MCX</option>
              <option value="CDS">CDS</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Timeframe</label>
            <select className="form-select" value={timeframe} onChange={e => setTimeframe(e.target.value)}>
              <option value="1m">1 min · Scalping</option>
              <option value="3m">3 min · Scalping</option>
              <option value="5m">5 min · Intraday</option>
              <option value="10m">10 min · Intraday</option>
              <option value="15m">15 min · Intraday</option>
              <option value="30m">30 min · Intraday</option>
              <option value="1h">1 hr · Swing</option>
              <option value="4h">4 hr · Swing</option>
              <option value="1d">Daily · Positional</option>
              <option value="1w">Weekly · Long-term</option>
            </select>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: 4, marginBottom: 20 }}>
          {[
            { id: 'visual', icon: <SlidersHorizontal size={14} />, label: 'Visual Builder' },
            { id: 'code',   icon: <TerminalSquare size={14} />,    label: 'Source Code' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: activeTab === tab.id ? 'var(--color-accent-dim)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--text-muted)',
                border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                fontWeight: activeTab === tab.id ? 700 : 400, cursor: 'pointer', fontSize: '0.82rem',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', transition: 'all 0.15s',
              }}
            >
              {tab.icon} {tab.label}
              {tab.id === 'visual' && (
                <span style={{ fontSize: '0.65rem', background: 'var(--color-accent)', color: '#000', borderRadius: 99, padding: '1px 6px', fontWeight: 700 }}>
                  {buyRules.length + sellRules.length} rules
                </span>
              )}
            </button>
          ))}
          {/* indicator count badge */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 99, padding: '2px 10px' }}>
              {INDICATOR_CATALOGUE.length} indicators available
            </span>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────── */}
        {activeTab === 'visual' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* BUY RULES */}
            <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-profit)', display: 'inline-block' }} />
                  <span style={{ fontWeight: 700, color: 'var(--color-profit)', fontSize: '0.8rem', letterSpacing: '0.08em' }}>ENTRY / BUY RULES</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 99, padding: '1px 8px' }}>
                    Execute BUY order when ALL/ANY conditions match
                  </span>
                </div>
                <button
                  className="btn btn-sm"
                  style={{ fontSize: '0.75rem', gap: 5, color: 'var(--color-profit)', borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)' }}
                  onClick={addBuyRule}
                >
                  <Plus size={12} /> Add Rule
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {buyRules.map((rule, i) => (
                  <div key={rule.id}>
                    {i > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                        <button
                          onClick={() => updateBuyRule(rule.id, { logic: rule.logic === 'AND' ? 'OR' : 'AND' })}
                          style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-accent)', background: 'var(--color-accent-dim)', border: '1px solid var(--color-accent)', borderRadius: 99, padding: '2px 10px', cursor: 'pointer' }}
                        >
                          {rule.logic}
                        </button>
                        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                      </div>
                    )}
                    <RuleRow
                      rule={rule}
                      onUpdate={patch => updateBuyRule(rule.id, patch)}
                      onDelete={() => setBuyRules(prev => prev.filter(r => r.id !== rule.id))}
                      showDelete={buyRules.length > 1}
                      side="buy"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SELL RULES */}
            <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-loss)', display: 'inline-block' }} />
                  <span style={{ fontWeight: 700, color: 'var(--color-loss)', fontSize: '0.8rem', letterSpacing: '0.08em' }}>EXIT / SELL RULES</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 99, padding: '1px 8px' }}>
                    Execute SELL order when condition matches
                  </span>
                </div>
                <button
                  className="btn btn-sm"
                  style={{ fontSize: '0.75rem', gap: 5, color: 'var(--color-loss)', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}
                  onClick={addSellRule}
                >
                  <Plus size={12} /> Add Rule
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sellRules.map((rule, i) => (
                  <div key={rule.id}>
                    {i > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                        <button
                          onClick={() => updateSellRule(rule.id, { logic: rule.logic === 'AND' ? 'OR' : 'AND' })}
                          style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-accent)', background: 'var(--color-accent-dim)', border: '1px solid var(--color-accent)', borderRadius: 99, padding: '2px 10px', cursor: 'pointer' }}
                        >
                          {rule.logic}
                        </button>
                        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                      </div>
                    )}
                    <RuleRow
                      rule={rule}
                      onUpdate={patch => updateSellRule(rule.id, patch)}
                      onDelete={() => setSellRules(prev => prev.filter(r => r.id !== rule.id))}
                      showDelete={sellRules.length > 1}
                      side="sell"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Preview code strip */}
            <div style={{ background: '#0c0c0c', border: '1px solid #1e1e1e', borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>💡 Code is auto-generating live from rules — switch to <strong style={{ color: 'var(--color-accent)' }}>Source Code</strong> tab to edit</span>
              <button
                style={{ fontSize: '0.72rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setActiveTab('code')}
              >
                View Code →
              </button>
            </div>
          </div>
        ) : (
          /* ── CODE SANDBOX ──────────────────────────────────────────── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-warning)' }}>
                ⚠️ Manual edits here will not sync back to Visual Builder
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-accent)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 99, padding: '2px 10px' }}>
                  V8 Sandbox Isolated
                </span>
                <button
                  style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => {
                    const generated = generateCode(name, `${asset}:${exchange}`, timeframe, buyRules, sellRules)
                    setCode(generated)
                  }}
                >
                  ↺ Regenerate from rules
                </button>
              </div>
            </div>
            <textarea
              style={{
                fontFamily: 'var(--font-mono), "Fira Code", monospace',
                fontSize: '0.8rem', lineHeight: 1.7,
                minHeight: 360, padding: 18,
                background: '#070b0e', color: '#a8e6c8',
                border: '1px solid #1a2a22', borderRadius: 'var(--radius-lg)',
                resize: 'vertical', outline: 'none', width: '100%', boxSizing: 'border-box',
              }}
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
            />
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 20 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Execution hooked to{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Zerodha Kite API</strong>
            <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>·</span>
            <span style={{ color: 'var(--color-profit)' }}>● Paper Mode</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={onClose}
              style={{ gap: 7 }}
            >
              <Play size={14} fill="currentColor" /> Deploy &amp; Test Sandbox
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(6px)', padding: '20px',
}
const modalBox: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border-light)',
  borderRadius: 'var(--radius-2xl)',
  padding: '28px 30px',
  width: '100%',
  maxWidth: 900,
  maxHeight: '92vh',
  overflowY: 'auto',
  boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
}
