import { useState, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Treemap } from 'recharts'
import { RefreshCw, Cpu, CheckCircle2, AlertTriangle, ExternalLink, Tag } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import { formatCurrency } from '@/lib/utils'

const SECTOR_COLORS = [
  '#10B981','#3B82F6','#F59E0B','#8B5CF6','#EC4899',
  '#EF4444','#06B6D4','#84CC16','#F97316','#A78BFA',
  '#34D399','#60A5FA','#FCD34D','#C084FC','#FB7185',
]

// ─── Treemap ──────────────────────────────────────────────────────────────────
const CustomTreemapContent = ({ x, y, width, height, name, value, fill }: any) => {
  if (width < 40 || height < 30) return null
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="var(--color-bg-primary)" strokeWidth={2} rx={4} />
      <text x={x + width / 2} y={y + height / 2 - 8}  textAnchor="middle" fill="#fff" fontSize={13} fontWeight={700}>{name}</text>
      <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={11}>
        {formatCurrency(value, true)}
      </text>
    </g>
  )
}

// ─── Status banner ────────────────────────────────────────────────────────────
type AnalyseState = 'idle' | 'running' | 'done' | 'error'

interface AnalyseResult {
  tagged: number
  total: number
  yahooCount: number
  staticCount: number
}

export default function SectorView() {
  const { holdings, summary, autoTagSectors } = usePortfolioStore()

  const [analyseState, setAnalyseState] = useState<AnalyseState>('idle')
  const [progress, setProgress]         = useState({ done: 0, total: 0 })
  const [result, setResult]             = useState<AnalyseResult | null>(null)

  // ── Trigger auto-analyse ──────────────────────────────────────────────────
  const handleAutoAnalyse = useCallback(async () => {
    setAnalyseState('running')
    setResult(null)

    const total = new Set(holdings.map((h) => `${h.symbol}::${h.exchange}`)).size
    setProgress({ done: 0, total })

    try {
      const { tagged, source } = await autoTagSectors((done, total) => {
        setProgress({ done, total })
      })

      const yahooCount  = Object.values(source).filter((s) => s === 'yahoo').length
      const staticCount = Object.values(source).filter((s) => s === 'static').length

      setResult({ tagged, total, yahooCount, staticCount })
      setAnalyseState('done')
    } catch {
      setAnalyseState('error')
    }
  }, [holdings, autoTagSectors])

  // ── Derived sector data ───────────────────────────────────────────────────
  const sectorMap = new Map<string, number>()
  for (const h of holdings) {
    const s = h.sector || 'Uncategorised'
    sectorMap.set(s, (sectorMap.get(s) ?? 0) + h.current_value)
  }

  const sectorData = Array.from(sectorMap.entries()).map(([sector, value], i) => ({
    sector,
    value,
    pct: summary.current_value > 0 ? (value / summary.current_value) * 100 : 0,
    color: SECTOR_COLORS[i % SECTOR_COLORS.length],
  }))

  const treemapData = sectorData.map((s, i) => ({
    name: s.sector, size: s.value, fill: SECTOR_COLORS[i % SECTOR_COLORS.length]
  }))

  const uncategorisedCount = holdings.filter((h) => !h.sector || h.sector === 'Uncategorised').length
  const hasData = holdings.length > 0

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!hasData) {
    return (
      <div className="app-content animate-fade-in">
        <div className="page-header">
          <div><h1 className="page-title">Sector View</h1><p className="page-subtitle">No holdings</p></div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏭</div>
          <h3 style={{ marginBottom: 8 }}>No Holdings Yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Add transactions first, then Auto-Analyse to classify sectors.</p>
          <a href="/transactions" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>Go to Transactions →</a>
        </div>
      </div>
    )
  }

  return (
    <div className="app-content animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sector View</h1>
          <p className="page-subtitle">
            {sectorData.length} sector{sectorData.length !== 1 ? 's' : ''} · {holdings.length} positions
            {uncategorisedCount > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--color-warning)', fontSize: '0.78rem' }}>
                · ⚠ {uncategorisedCount} uncategorised
              </span>
            )}
          </p>
        </div>
        <div className="page-actions">
          <button
            className={`btn ${analyseState === 'running' ? 'btn-outline' : 'btn-primary'}`}
            onClick={handleAutoAnalyse}
            disabled={analyseState === 'running'}
            style={{ gap: 7 }}
          >
            {analyseState === 'running'
              ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Analysing…</>
              : <><Cpu size={14} /> Auto-Analyse Sectors</>
            }
          </button>
        </div>
      </div>

      {/* ── Auto-analyse status banner ───────────────────────────────── */}
      {analyseState === 'running' && (
        <div className="card mb-4" style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)', padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite', color: '#3B82F6' }} />
              <span>Querying Yahoo Finance &amp; static sector database…</span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {progress.done} / {progress.total}
            </span>
          </div>
          <div style={{ background: 'var(--color-bg-primary)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : '0%',
              background: 'linear-gradient(90deg, #3B82F6, #10B981)',
              borderRadius: 99,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8, margin: '8px 0 0' }}>
            Symbols are processed in batches of 3 with a short pause to respect rate limits.
          </p>
        </div>
      )}

      {analyseState === 'done' && result && (
        <div className="card mb-4" style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)', padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="var(--color-profit)" />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, color: 'var(--color-profit)', fontSize: '0.88rem' }}>
                {result.tagged} of {result.total} symbols classified
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 12 }}>
                Yahoo Finance: <strong style={{ color: 'var(--text-secondary)' }}>{result.yahooCount}</strong>
                &nbsp;· Static map: <strong style={{ color: 'var(--text-secondary)' }}>{result.staticCount}</strong>
              </span>
            </div>
            <button
              style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setAnalyseState('idle')}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {analyseState === 'error' && (
        <div className="card mb-4" style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color="var(--color-loss)" />
            <span style={{ fontWeight: 600, color: 'var(--color-loss)', fontSize: '0.85rem' }}>
              Network error — check your connection and try again.
            </span>
            <button
              style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setAnalyseState('idle')}
            >✕</button>
          </div>
        </div>
      )}

      {/* ── Uncategorised hint ───────────────────────────────────────── */}
      {analyseState === 'idle' && uncategorisedCount > 0 && (
        <div className="card mb-4" style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Tag size={16} color="var(--color-warning)" />
          <p style={{ fontSize: '0.82rem', color: 'var(--color-warning)', margin: 0, flex: 1 }}>
            <strong>{uncategorisedCount}</strong> holding{uncategorisedCount !== 1 ? 's are' : ' is'} uncategorised.
            Click <strong>Auto-Analyse Sectors</strong> above to automatically classify them using Yahoo Finance and a built-in NSE sector database.
          </p>
        </div>
      )}

      {/* ── Charts ──────────────────────────────────────────────────── */}
      <div className="grid grid-2 mb-6">
        {/* Pie + Legend */}
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Sector Allocation</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>By current value</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={sectorData} dataKey="value" nameKey="sector" cx="50%" cy="50%" outerRadius={110} innerRadius={60} paddingAngle={4}>
                {sectorData.map((_, i) => <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />)}
              </Pie>
              <Tooltip
                formatter={(v: any) => formatCurrency(Number(v), true)}
                contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {sectorData.map((s, i) => (
              <div key={s.sector} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: SECTOR_COLORS[i % SECTOR_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.sector}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {formatCurrency(s.value, true)}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: SECTOR_COLORS[i % SECTOR_COLORS.length], minWidth: 44, textAlign: 'right' }}>
                    {s.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Treemap */}
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Treemap</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>Size = current value</p>
          <ResponsiveContainer width="100%" height={380}>
            <Treemap data={treemapData} dataKey="size" content={<CustomTreemapContent />} />
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Holdings per sector ──────────────────────────────────────── */}
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>Holdings by Sector</h3>
        {sectorData.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
            No sector data yet. Click <strong>Auto-Analyse Sectors</strong> above.
          </p>
        )}
        {sectorData.map((sector, i) => {
          const sh = holdings.filter((h) => (h.sector || 'Uncategorised') === sector.sector)
          return (
            <div key={sector.sector} style={{ marginBottom: 24 }}>
              {/* Sector header bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                padding: '8px 12px', borderRadius: 'var(--radius-md)',
                background: `${SECTOR_COLORS[i % SECTOR_COLORS.length]}15`,
                border: `1px solid ${SECTOR_COLORS[i % SECTOR_COLORS.length]}30`,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: SECTOR_COLORS[i % SECTOR_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{sector.sector}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {sh.length} holding{sh.length !== 1 ? 's' : ''} · {sector.pct.toFixed(1)}% of portfolio
                </span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: SECTOR_COLORS[i % SECTOR_COLORS.length], fontWeight: 600 }}>
                  {formatCurrency(sector.value, true)}
                </span>
              </div>
              {/* Holdings grid */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {sh.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      flex: '1 1 170px',
                      background: 'var(--color-bg-primary)',
                      border: `1px solid ${SECTOR_COLORS[i % SECTOR_COLORS.length]}25`,
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{h.symbol}</div>
                      <span style={{ fontSize: '0.65rem', background: `${SECTOR_COLORS[i % SECTOR_COLORS.length]}20`, color: SECTOR_COLORS[i % SECTOR_COLORS.length], padding: '2px 7px', borderRadius: 99, fontWeight: 600 }}>
                        {h.exchange}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--color-accent)', marginTop: 4 }}>
                      {formatCurrency(h.current_value, true)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {h.total_quantity} @ {formatCurrency(h.average_price)}
                      </span>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700,
                        color: h.unrealized_pnl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)',
                      }}>
                        {h.unrealized_pnl >= 0 ? '+' : ''}{h.unrealized_pnl_pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Source info footer ───────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        Sector data sourced from{' '}
        <a href="https://finance.yahoo.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>
          Yahoo Finance <ExternalLink size={10} style={{ verticalAlign: 'middle' }} />
        </a>
        {' '}&amp; built-in NSE 200+ sector database. Refresh any time.
      </div>

    </div>
  )
}
