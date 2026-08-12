import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { usePortfolioStore } from '@/store'
import { formatCurrency, formatPct, computeTaxReport } from '@/lib/utils'
import { Download, TrendingUp, TrendingDown, Scale, Target, Activity } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'

export default function Analytics() {
  const { summary, transactions, holdings } = usePortfolioStore()

  // Build return bars from summary
  const pnlPct = summary.total_pnl_pct
  const returnsBars = [
    { period: 'Total', ret: parseFloat(pnlPct.toFixed(2)) },
    { period: 'CAGR',  ret: parseFloat(summary.cagr.toFixed(2)) },
    { period: 'XIRR',  ret: parseFloat(summary.xirr.toFixed(2)) },
  ].filter((r) => r.ret !== 0)

  // Tax computation from real transactions
  const buys  = transactions.filter((t) => t.type === 'BUY').map((t)  => ({ quantity: t.quantity, price: t.price, date: t.transaction_date }))
  const sells = transactions.filter((t) => t.type === 'SELL').map((t) => ({ quantity: t.quantity, price: t.price, date: t.transaction_date }))
  const { stcg, ltcg } = computeTaxReport(buys, sells)

  const divTxns  = transactions.filter((t) => t.type === 'DIVIDEND')
  const totalDiv = divTxns.reduce((s, t) => s + t.price * t.quantity, 0)
  const totalStt = transactions.reduce((s, t) => s + t.stt, 0)
  const totalCharges = transactions.reduce((s, t) => s + t.brokerage + t.stt + t.exchange_charges + t.gst, 0)

  const isEmpty = transactions.length === 0

  // Radar scores (scaled)
  const scores = [
    { metric: 'Return',   value: Math.min(100, Math.max(0, pnlPct * 2)) },
    { metric: 'CAGR',     value: Math.min(100, Math.max(0, summary.cagr * 3)) },
    { metric: 'XIRR',     value: Math.min(100, Math.max(0, summary.xirr * 3)) },
    { metric: 'Positions', value: Math.min(100, holdings.length * 10) },
    { metric: 'Dividend',  value: Math.min(100, totalDiv > 0 ? 60 : 0) },
    { metric: 'Activity',  value: Math.min(100, transactions.length * 5) },
  ]

  if (isEmpty) {
    return (
      <div className="app-content animate-fade-in flex flex-col items-center justify-center">
        <PageHeader title="Analytics" subtitle="No data yet" />
        <Card className="text-center p-10 max-w-2xl mx-auto mt-10 w-full">
          <div className="text-5xl mb-4">📈</div>
          <h3 className="mb-2">No Analytics Yet</h3>
          <p className="text-muted">Add transactions to see performance analytics, returns, and tax reports.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="app-content animate-fade-in flex flex-col h-full overflow-auto">
      <PageHeader 
        title="Analytics" 
        subtitle="Performance, risk, and tax analysis"
        actions={<button className="btn btn-outline btn-sm"><Download size={14} /> Tax Report PDF</button>}
      />

      <div className="grid grid-4 gap-5 mb-6">
        <StatCard 
          label="Absolute Return" 
          value={formatPct(summary.total_pnl_pct)} 
          trend={summary.total_pnl_pct >= 0 ? 'up' : 'down'}
          icon={summary.total_pnl_pct >= 0 ? <TrendingUp /> : <TrendingDown />}
        />
        <StatCard 
          label="Total P&L" 
          value={formatCurrency(summary.total_pnl, true)} 
          trend={summary.total_pnl >= 0 ? 'up' : 'down'}
          icon={summary.total_pnl >= 0 ? <TrendingUp /> : <TrendingDown />}
        />
        <StatCard 
          label="STCG" 
          value={formatCurrency(stcg, true)} 
          trend="down"
          icon={<Activity />}
        />
        <StatCard 
          label="LTCG" 
          value={formatCurrency(ltcg, true)} 
          trend="up"
          icon={<Scale />}
        />
      </div>

      <div className="grid grid-2 gap-5 mb-6">
        {/* Returns bar chart */}
        <Card className="flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold">Portfolio Returns</h3>
            <p className="text-xs text-muted">Based on your actual transactions</p>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[220px]">
            {returnsBars.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={returnsBars} barCategoryGap="50%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip formatter={(v: any) => [`${Number(v)}%`, 'Return']} contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                  <Bar dataKey="ret" radius={[4,4,0,0]}>
                    {returnsBars.map((e, i) => <Cell key={i} fill={e.ret >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="text-muted text-sm">No return data yet</div>}
          </div>
        </Card>

        {/* Radar */}
        <Card className="flex flex-col">
          <div className="mb-2">
            <h3 className="font-bold">Portfolio Score</h3>
            <p className="text-xs text-muted">Quality benchmark (0-100)</p>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={scores} cx="50%" cy="50%" outerRadius={80}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Radar name="Portfolio" dataKey="value" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tax Report */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold flex items-center gap-2">
              <Target size={16} className="text-accent" /> Tax Summary (Auto-computed FIFO)
            </h3>
            <p className="text-xs text-muted mt-1">
              Based on your recorded transactions. Verify with your CA before filing ITR.
            </p>
          </div>
        </div>
        
        <div className="grid grid-3 gap-5 mb-6">
          {[
            { label: 'Short-Term Capital Gain (STCG)', val: stcg, note: 'Taxed @ 20% (post Jul 2024)', color: 'text-warning' },
            { label: 'Long-Term Capital Gain (LTCG)',  val: ltcg, note: '12.5% above ₹1.25L exemption', color: 'text-info' },
            { label: 'Dividend Income',                val: totalDiv, note: `Across ${divTxns.length} dividend entries`, color: 'text-profit' },
          ].map(({ label, val, note, color }) => (
            <div key={label} className="bg-bg-primary rounded-md p-4 border border-border border-l-[3px]" style={{ borderLeftColor: 'currentColor' }}>
              <div className="text-xs text-muted uppercase tracking-wider mb-2 font-semibold">{label}</div>
              <div className={`text-2xl font-bold font-mono mb-1 ${color}`}>{formatCurrency(val, true)}</div>
              <div className="text-[0.65rem] text-muted italic">{note}</div>
            </div>
          ))}
        </div>
        
        <div className="bg-bg-primary rounded-lg p-4 border border-border">
          <div className="font-semibold text-sm mb-3 text-primary">Transaction Charges Breakdown</div>
          <div className="grid grid-3 gap-6">
            {[ 
              { label: 'STT Paid', val: totalStt }, 
              { label: 'Total Charges', val: totalCharges }, 
              { label: 'Transactions', val: transactions.length } 
            ].map(({ label, val }) => (
              <div key={label} className="flex flex-col">
                <span className="text-xs text-muted uppercase tracking-wider mb-1">{label}</span>
                <span className="font-mono text-primary font-bold">
                  {typeof val === 'number' && label !== 'Transactions' ? formatCurrency(val) : val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
