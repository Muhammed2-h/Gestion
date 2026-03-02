import React, { useState } from 'react'
import { TrendingUp, TrendingDown, Search, RefreshCw, PlusCircle, Upload } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import { formatCurrency, formatPct } from '@/lib/utils'
import UpdatePriceModal from '@/components/UpdatePriceModal'
import AddTransactionModal from '@/components/AddTransactionModal'
import ImportCSVModal from '@/components/ImportCSVModal'
import type { Holding } from '@/types'

export default function Holdings() {
  const { holdings, summary } = usePortfolioStore()
  const [search, setSearch]       = useState('')
  const [sortBy, setSortBy]       = useState<keyof Holding>('current_value')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc')
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null)
  const [modal, setModal] = useState<'transaction' | 'csv' | null>(null)

  const filtered = holdings
    .filter((h) => h.symbol.toLowerCase().includes(search.toLowerCase()) || (h.sector ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = (a[sortBy] as number) ?? 0
      const bv = (b[sortBy] as number) ?? 0
      return sortDir === 'desc' ? bv - av : av - bv
    })

  function toggleSort(col: keyof Holding) {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(col); setSortDir('desc') }
  }

  function renderSortIcon(col: keyof Holding) {
    if (sortBy !== col) return null;
    return <span style={{ fontSize: '0.6rem', color: 'var(--color-accent)' }}>{sortDir === 'desc' ? '▼' : '▲'}</span>
  }

  if (holdings.length === 0) {
    return (
      <div className="app-content animate-fade-in">
        <div className="page-header">
          <div><h1 className="page-title">Holdings</h1><p className="page-subtitle">No positions yet</p></div>
          <div className="page-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setModal('csv')}><Upload size={14} /> Import CSV</button>
            <button className="btn btn-primary btn-sm" onClick={() => setModal('transaction')}><PlusCircle size={14} /> Add Transaction</button>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>💼</div>
          <h3 style={{ marginBottom: 8 }}>No Holdings Yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Add transactions or import a CSV to see your holdings here.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button className="btn btn-primary" onClick={() => setModal('transaction')}><PlusCircle size={15} /> Add Transaction</button>
            <button className="btn btn-outline" onClick={() => setModal('csv')}><Upload size={15} /> Import CSV</button>
          </div>
        </div>
        {modal === 'transaction' && <AddTransactionModal onClose={() => setModal(null)} />}
        {modal === 'csv'         && <ImportCSVModal      onClose={() => setModal(null)} />}
      </div>
    )
  }

  return (
    <div className="app-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Holdings</h1>
          <p className="page-subtitle">{filtered.length} position{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setModal('csv')}><Upload size={14} /> Import CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('transaction')}><PlusCircle size={14} /> Add Transaction</button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="card mb-6" style={{ padding: '14px 24px' }}>
        <div className="flex items-center gap-6 flex-wrap">
          {[
            { label: 'Invested', val: formatCurrency(summary.total_invested, true), color: 'var(--text-primary)' },
            { label: 'Current Value', val: formatCurrency(summary.current_value, true), color: 'var(--color-accent)' },
            { label: 'Unrealised P&L', val: `${formatCurrency(summary.total_pnl, true)} (${formatPct(summary.total_pnl_pct)})`, color: summary.total_pnl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' },
          ].map(({ label, val, color }, i) => (
            <React.Fragment key={label}>
              {i > 0 && <div style={{ width: 1, height: 36, background: 'var(--color-border)' }} />}
              <div>
                <div className="stat-label">{label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color }}>{val}</div>
              </div>
            </React.Fragment>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 12px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', width: 160 }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-scroll-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Sector</th>
                <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('total_quantity')}>Qty {renderSortIcon('total_quantity')}</th>
                <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('average_price')}>Avg Cost {renderSortIcon('average_price')}</th>
                <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('current_price')}>Market Price {renderSortIcon('current_price')}</th>
                <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('current_value')}>Value {renderSortIcon('current_value')}</th>
                <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('unrealized_pnl')}>P&L {renderSortIcon('unrealized_pnl')}</th>
                <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('unrealized_pnl_pct')}>P&L % {renderSortIcon('unrealized_pnl_pct')}</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                const isUp = h.unrealized_pnl >= 0
                const priceNotSet = h.current_price === h.average_price
                return (
                  <tr key={h.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{h.symbol}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{h.exchange} · {h.account_name}</div>
                    </td>
                    <td>
                      {h.sector
                        ? <span className="chip">{h.sector}</span>
                        : <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                    </td>
                    <td className="col-num">{h.total_quantity}</td>
                    <td className="col-num">{formatCurrency(h.average_price)}</td>
                    <td className="col-num">
                      {priceNotSet
                        ? <span style={{ fontSize: '0.72rem', color: 'var(--color-warning)', fontStyle: 'italic' }}>Not set</span>
                        : <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(h.current_price)}</span>}
                    </td>
                    <td className="col-num" style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{formatCurrency(h.current_value, true)}</td>
                    <td className="col-num" style={{ color: isUp ? 'var(--color-profit)' : 'var(--color-loss)', fontWeight: 600 }}>
                      {priceNotSet ? '—' : formatCurrency(h.unrealized_pnl, true)}
                    </td>
                    <td className="col-num">
                      {priceNotSet
                        ? <span style={{ color: 'var(--color-warning)' }}>—</span>
                        : <span className={`badge ${isUp ? 'badge-profit' : 'badge-loss'}`}>
                            {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {formatPct(h.unrealized_pnl_pct)}
                          </span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                        onClick={() => setSelectedHolding(h)}
                      >
                        <RefreshCw size={11} /> Update Price
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedHolding && <UpdatePriceModal holding={selectedHolding} onClose={() => setSelectedHolding(null)} />}
      {modal === 'transaction' && <AddTransactionModal onClose={() => setModal(null)} />}
      {modal === 'csv'         && <ImportCSVModal      onClose={() => setModal(null)} />}
    </div>
  )
}
