import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { usePortfolioStore } from '@/store'
import { formatCurrency, formatPct, computeTaxReport } from '@/lib/utils'
import { Download } from 'lucide-react'

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
      <div className="app-content animate-fade-in">
        <div className="page-header"><div><h1 className="page-title">Analytics</h1><p className="page-subtitle">No data yet</p></div></div>
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📈</div>
          <h3 style={{ marginBottom: 8 }}>No Analytics Yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Add transactions to see performance analytics, returns, and tax reports.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-content animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Analytics</h1><p className="page-subtitle">Performance, risk, and tax analysis</p></div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm"><Download size={14} /> Tax Report PDF</button>
        </div>
      </div>

      <div className="grid grid-4 mb-6">
        {[
          { label: 'Absolute Return', val: formatPct(summary.total_pnl_pct), good: summary.total_pnl_pct >= 0 },
          { label: 'Total P&L',       val: formatCurrency(summary.total_pnl, true), good: summary.total_pnl >= 0 },
          { label: 'STCG',            val: formatCurrency(stcg, true),  good: false },
          { label: 'LTCG',            val: formatCurrency(ltcg, true),  good: true },
        ].map(({ label, val, good }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ fontSize: '1.3rem', color: good ? 'var(--color-profit)' : 'var(--color-loss)' }}>{val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2 mb-6">
        {/* Returns bar chart */}
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Portfolio Returns</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>Based on your actual transactions</p>
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
          ) : <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No return data yet</div>}
        </div>

        {/* Radar */}
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Portfolio Score</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Quality benchmark (0-100)</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={scores} cx="50%" cy="50%" outerRadius={80}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Radar name="Portfolio" dataKey="value" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tax Report */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3>Tax Summary (Auto-computed FIFO)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Based on your recorded transactions. Verify with your CA before filing ITR.
            </p>
          </div>
        </div>
        <div className="grid grid-3 mb-6">
          {[
            { label: 'Short-Term Capital Gain (STCG)', val: stcg, note: 'Taxed @ 20% (post Jul 2024)', color: 'var(--color-warning)' },
            { label: 'Long-Term Capital Gain (LTCG)',  val: ltcg, note: '12.5% above ₹1.25L exemption', color: 'var(--color-info)' },
            { label: 'Dividend Income',                val: totalDiv, note: `Across ${divTxns.length} dividend entries`, color: 'var(--color-profit)' },
          ].map(({ label, val, note, color }) => (
            <div key={label} className="stat-card">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ fontSize: '1.25rem', color }}>{formatCurrency(val, true)}</div>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{note}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', padding: '14px 20px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10, color: 'var(--text-primary)' }}>Transaction Charges</div>
          <div className="grid grid-3">
            {[ { label: 'STT Paid', val: totalStt }, { label: 'Total Charges', val: totalCharges }, { label: 'Transactions', val: transactions.length } ].map(({ label, val }) => (
              <div key={label} className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {typeof val === 'number' && label !== 'Transactions' ? formatCurrency(val) : val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
