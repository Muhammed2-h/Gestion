import { useState, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Treemap } from 'recharts'
import { RefreshCw, Cpu, CheckCircle2, AlertTriangle, ExternalLink, Tag } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import { formatCurrency } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const SECTOR_COLORS = [
  '#10B981','#3B82F6','#F59E0B','#8B5CF6','#EC4899',
  '#EF4444','#06B6D4','#84CC16','#F97316','#A78BFA',
  '#34D399','#60A5FA','#FCD34D','#C084FC','#FB7185',
]

// ─── Treemap ──────────────────────────────────────────────────────────────────
const CustomTreemapContent = ({ x, y, width, height, name, value, fill }: { x?: number, y?: number, width?: number, height?: number, name?: string, value?: number, fill?: string }) => {
  if (width === undefined || height === undefined || x === undefined || y === undefined || value === undefined) return null
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
      <div className="app-content animate-fade-in flex flex-col items-center justify-center">
        <PageHeader title="Sector View" subtitle="No holdings" />
        <Card className="text-center p-10 max-w-2xl mx-auto mt-10 w-full">
          <div className="text-5xl mb-4">🏭</div>
          <h3 className="mb-2">No Holdings Yet</h3>
          <p className="text-muted mb-6">Add transactions first, then Auto-Analyse to classify sectors.</p>
          <a href="/transactions" className="btn btn-primary inline-flex mx-auto">Go to Transactions →</a>
        </Card>
      </div>
    )
  }

  return (
    <div className="app-content animate-fade-in flex flex-col h-full overflow-auto">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <PageHeader 
        title="Sector View" 
        subtitle={
          <span>
            {sectorData.length} sector{sectorData.length !== 1 ? 's' : ''} · {holdings.length} positions
            {uncategorisedCount > 0 && (
              <span className="ml-2 text-warning font-semibold text-xs">
                · ⚠ {uncategorisedCount} uncategorised
              </span>
            )}
          </span>
        }
        actions={
          <button
            className={`btn btn-sm ${analyseState === 'running' ? 'btn-outline' : 'btn-primary'}`}
            onClick={handleAutoAnalyse}
            disabled={analyseState === 'running'}
          >
            {analyseState === 'running'
              ? <><RefreshCw size={14} className="animate-spin" /> Analysing…</>
              : <><Cpu size={14} /> Auto-Analyse Sectors</>
            }
          </button>
        }
      />

      {/* ── Auto-analyse status banner ───────────────────────────────── */}
      {analyseState === 'running' && (
        <Card className="mb-4 p-4 border-info bg-info-bg">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm text-secondary">
              <RefreshCw size={14} className="animate-spin text-[#3B82F6]" />
              <span>Querying Yahoo Finance &amp; static sector database…</span>
            </div>
            <span className="font-mono text-xs text-muted">
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="bg-bg-primary rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : '0%',
                background: 'linear-gradient(90deg, #3B82F6, #10B981)',
              }} 
            />
          </div>
          <p className="text-[0.7rem] text-muted mt-2">
            Symbols are processed in batches of 3 with a short pause to respect rate limits.
          </p>
        </Card>
      )}

      {analyseState === 'done' && result && (
        <Card className="mb-4 p-4 border-profit-bg bg-profit-bg">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-profit" />
            <div className="flex-1 flex items-center flex-wrap">
              <span className="font-bold text-profit text-sm mr-4">
                {result.tagged} of {result.total} symbols classified
              </span>
              <span className="text-xs text-muted">
                Yahoo Finance: <strong className="text-secondary">{result.yahooCount}</strong>
                <span className="mx-2">·</span>
                Static map: <strong className="text-secondary">{result.staticCount}</strong>
              </span>
            </div>
            <button className="text-muted hover:text-primary transition-fast p-1" onClick={() => setAnalyseState('idle')}>✕</button>
          </div>
        </Card>
      )}

      {analyseState === 'error' && (
        <Card className="mb-4 p-4 border-loss-bg bg-loss-bg">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-loss" />
            <span className="font-bold text-loss text-sm flex-1">
              Network error — check your connection and try again.
            </span>
            <button className="text-muted hover:text-primary transition-fast p-1" onClick={() => setAnalyseState('idle')}>✕</button>
          </div>
        </Card>
      )}

      {/* ── Uncategorised hint ───────────────────────────────────────── */}
      {analyseState === 'idle' && uncategorisedCount > 0 && (
        <Card className="mb-4 p-3 border-warning bg-warning/10 flex items-center gap-3">
          <Tag size={16} className="text-warning flex-shrink-0" />
          <p className="text-sm text-warning m-0 flex-1">
            <strong>{uncategorisedCount}</strong> holding{uncategorisedCount !== 1 ? 's are' : ' is'} uncategorised.
            Click <strong>Auto-Analyse Sectors</strong> above to automatically classify them.
          </p>
        </Card>
      )}

      {/* ── Charts ──────────────────────────────────────────────────── */}
      <div className="grid grid-2 gap-5 mb-6">
        {/* Pie + Legend */}
        <Card>
          <div className="mb-4">
            <h3 className="font-bold">Sector Allocation</h3>
            <p className="text-xs text-muted mt-1">By current value</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={sectorData} dataKey="value" nameKey="sector" cx="50%" cy="50%" outerRadius={110} innerRadius={60} paddingAngle={4}>
                {sectorData.map((_, i) => <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />)}
              </Pie>
              <Tooltip
                formatter={(v: unknown) => formatCurrency(Number(v), true)}
                contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 mt-4">
            {sectorData.map((s, i) => (
              <div key={s.sector} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                  <span className="text-sm text-secondary">{s.sector}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-primary">{formatCurrency(s.value, true)}</span>
                  <span className="font-bold text-sm min-w-[44px] text-right" style={{ color: SECTOR_COLORS[i % SECTOR_COLORS.length] }}>
                    {s.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Treemap */}
        <Card>
          <div className="mb-4">
            <h3 className="font-bold">Treemap</h3>
            <p className="text-xs text-muted mt-1">Size = current value</p>
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <Treemap data={treemapData} dataKey="size" content={<CustomTreemapContent />} />
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Holdings per sector ──────────────────────────────────────── */}
      <Card>
        <h3 className="font-bold mb-6">Holdings by Sector</h3>
        {sectorData.length === 0 && (
          <p className="text-muted text-center py-6">
            No sector data yet. Click <strong>Auto-Analyse Sectors</strong> above.
          </p>
        )}
        <div className="flex flex-col gap-6">
          {sectorData.map((sector, i) => {
            const sh = holdings.filter((h) => (h.sector || 'Uncategorised') === sector.sector)
            const color = SECTOR_COLORS[i % SECTOR_COLORS.length]
            return (
              <div key={sector.sector}>
                {/* Sector header bar */}
                <div 
                  className="flex items-center gap-3 mb-3 p-2 px-3 rounded-md border"
                  style={{ background: `${color}15`, borderColor: `${color}30` }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="font-bold text-sm">{sector.sector}</span>
                  <span className="text-[0.7rem] text-muted">
                    {sh.length} holding{sh.length !== 1 ? 's' : ''} · {sector.pct.toFixed(1)}% of portfolio
                  </span>
                  <span className="ml-auto font-mono text-sm font-bold" style={{ color }}>
                    {formatCurrency(sector.value, true)}
                  </span>
                </div>
                
                {/* Holdings grid */}
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                  {sh.map((h) => (
                    <div
                      key={h.id}
                      className="bg-bg-primary rounded-md p-3 border"
                      style={{ borderColor: `${color}25` }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-bold text-sm">{h.symbol}</div>
                        <Badge variant="default" className="text-[0.6rem] py-0 px-1.5" style={{ background: `${color}20`, color }}>
                          {h.exchange}
                        </Badge>
                      </div>
                      <div className="font-mono text-sm text-accent mb-2">
                        {formatCurrency(h.current_value, true)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted font-mono">
                          {h.total_quantity} @ {formatCurrency(h.average_price)}
                        </span>
                        <span className={`text-xs font-bold ${h.unrealized_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
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
      </Card>

      {/* ── Source info footer ───────────────────────────────────────── */}
      <div className="text-center mt-6 text-xs text-muted mb-4">
        Sector data sourced from{' '}
        <a href="https://finance.yahoo.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">
          Yahoo Finance <ExternalLink size={10} />
        </a>
        {' '}&amp; built-in NSE 200+ sector database. Refresh any time.
      </div>
    </div>
  )
}
