import { useState, useMemo } from 'react'
import { Search, RefreshCw, PlusCircle, Upload } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import { formatCurrency, formatPct } from '@/lib/utils'
import UpdatePriceModal from '@/components/UpdatePriceModal'
import AddTransactionModal from '@/components/AddTransactionModal'
import ImportCSVModal from '@/components/ImportCSVModal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Holding } from '@/types'

export default function Holdings() {
  const { holdings, summary } = usePortfolioStore()
  const [search, setSearch]       = useState('')
  const [sortBy, setSortBy]       = useState<keyof Holding | 'weight'>('current_value')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc')
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null)
  const [modal, setModal] = useState<'transaction' | 'csv' | null>(null)

  const maxPnl = useMemo(() => {
    if (holdings.length === 0) return 1
    return Math.max(...holdings.map(h => Math.abs(h.unrealized_pnl || 0)))
  }, [holdings])

  const filtered = useMemo(() => {
    return holdings
      .filter((h) => h.symbol.toLowerCase().includes(search.toLowerCase()) || (h.sector ?? '').toLowerCase().includes(search.toLowerCase()))
      .map(h => ({
        ...h,
        weight: summary.current_value > 0 ? (h.current_value / summary.current_value) * 100 : 0
      }))
      .sort((a, b) => {
        const av = (a[sortBy as keyof typeof a] as number) ?? 0
        const bv = (b[sortBy as keyof typeof b] as number) ?? 0
        return sortDir === 'desc' ? bv - av : av - bv
      })
  }, [holdings, search, sortBy, sortDir, summary.current_value])

  function toggleSort(col: keyof Holding | 'weight') {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(col); setSortDir('desc') }
  }

  function renderSortIcon(col: keyof Holding | 'weight') {
    if (sortBy !== col) return <span className="opacity-0 group-hover:opacity-50 ml-1">↕</span>;
    return <span className="text-accent ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  const Th = ({ label, sortKey, align = 'left' }: { label: string, sortKey?: keyof Holding | 'weight', align?: 'left'|'right'|'center' }) => (
    <th 
      className={`group cursor-pointer select-none bg-bg-card z-10 sticky top-0 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
      onClick={() => sortKey && toggleSort(sortKey)}
    >
      <div className={`flex items-center ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        {label}
        {sortKey && renderSortIcon(sortKey)}
      </div>
    </th>
  )

  if (holdings.length === 0) {
    return (
      <div className="app-content animate-fade-in flex flex-col items-center justify-center">
        <PageHeader 
          title="Holdings" 
          subtitle="No positions yet" 
          actions={
            <>
              <button className="btn btn-outline btn-sm" onClick={() => setModal('csv')}><Upload size={14} /> Import CSV</button>
              <button className="btn btn-primary btn-sm" onClick={() => setModal('transaction')}><PlusCircle size={14} /> Add Transaction</button>
            </>
          } 
        />
        <div className="card text-center p-10 max-w-2xl mx-auto mt-10 w-full">
          <div className="text-5xl mb-4">💼</div>
          <h3 className="mb-2">No Holdings Yet</h3>
          <p className="text-muted mb-6">Add transactions or import a CSV to see your holdings here.</p>
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
    <div className="app-content animate-fade-in flex flex-col h-full">
      <PageHeader 
        title="Holdings" 
        subtitle={`${filtered.length} position${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setModal('csv')}><Upload size={14} /> Import CSV</button>
            <button className="btn btn-primary btn-sm" onClick={() => setModal('transaction')}><PlusCircle size={14} /> Add Transaction</button>
          </>
        }
      />

      {/* Summary bar */}
      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-muted mb-1 font-semibold uppercase tracking-wider">Invested</div>
              <div className="font-mono font-bold text-primary">{formatCurrency(summary.total_invested, true)}</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-xs text-muted mb-1 font-semibold uppercase tracking-wider">Current Value</div>
              <div className="font-mono font-bold text-accent">{formatCurrency(summary.current_value, true)}</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-xs text-muted mb-1 font-semibold uppercase tracking-wider">Unrealised P&L</div>
              <div className={`font-mono font-bold ${summary.total_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatCurrency(summary.total_pnl, true)} ({formatPct(summary.total_pnl_pct)})
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-bg-secondary border border-border rounded-md px-3 py-1.5 flex-1 max-w-xs">
            <Search size={14} className="text-muted" />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search symbols or sectors…"
              className="bg-transparent border-none outline-none text-primary text-sm w-full placeholder:text-muted" 
            />
          </div>
        </div>
      </Card>

      <Card className="p-0 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="table-scroll-wrapper overflow-auto flex-1">
          <table className="data-table w-full relative">
            <thead>
              <tr>
                <Th label="Symbol" sortKey="symbol" />
                <Th label="Sector" sortKey="sector" />
                <Th label="Qty" sortKey="total_quantity" align="right" />
                <Th label="Avg Price" sortKey="average_price" align="right" />
                <Th label="LTP" sortKey="current_price" align="right" />
                <Th label="Invested" sortKey="invested_value" align="right" />
                <Th label="Value" sortKey="current_value" align="right" />
                <Th label="Weight %" sortKey="weight" align="right" />
                <Th label="P&L" sortKey="unrealized_pnl" align="right" />
                <th className="bg-bg-card z-10 sticky top-0 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                const isUp = h.unrealized_pnl >= 0
                const priceNotSet = h.current_price === h.average_price
                const pnlBarWidth = Math.min(100, Math.max(2, (Math.abs(h.unrealized_pnl) / maxPnl) * 100))
                
                return (
                  <tr key={h.id} className="group hover:bg-bg-secondary transition-fast">
                    <td>
                      <div className="font-bold text-primary">{h.symbol}</div>
                      <div className="text-xs text-muted">{h.exchange} · {h.account_name}</div>
                    </td>
                    <td>
                      {h.sector 
                        ? <Badge variant="default" className="text-[0.65rem] py-0.5 px-2">{h.sector}</Badge>
                        : <span className="text-xs text-muted italic">—</span>}
                    </td>
                    <td className="text-right font-mono text-sm">{h.total_quantity}</td>
                    <td className="text-right font-mono text-sm text-secondary">{formatCurrency(h.average_price)}</td>
                    <td className="text-right font-mono text-sm">
                      {priceNotSet 
                        ? <span className="text-xs text-warning italic">Not set</span>
                        : <span className="font-semibold text-primary">{formatCurrency(h.current_price)}</span>}
                    </td>
                    <td className="text-right font-mono text-sm text-secondary">{formatCurrency(h.invested_value, true)}</td>
                    <td className="text-right font-mono text-sm font-semibold text-accent">{formatCurrency(h.current_value, true)}</td>
                    <td className="text-right font-mono text-sm text-secondary">{h.weight.toFixed(1)}%</td>
                    <td className="text-right min-w-[140px]">
                      {priceNotSet ? (
                        <span className="text-warning">—</span>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <div className={`font-mono text-sm font-bold ${isUp ? 'text-profit' : 'text-loss'}`}>
                            {formatCurrency(h.unrealized_pnl, true)} ({formatPct(h.unrealized_pnl_pct)})
                          </div>
                          <div className="w-full bg-bg-secondary h-1.5 rounded-full overflow-hidden flex justify-end">
                            <div 
                              className={`h-full rounded-full ${isUp ? 'bg-profit' : 'bg-loss'}`} 
                              style={{ width: `${pnlBarWidth}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="p-1.5 text-muted hover:text-accent rounded-md hover:bg-accent-dim transition-fast"
                          title="Update Price"
                          onClick={() => setSelectedHolding(h)}
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          className="p-1.5 text-muted hover:text-primary rounded-md hover:bg-bg-primary transition-fast"
                          title="Add Trade"
                          onClick={() => setModal('transaction')}
                        >
                          <PlusCircle size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedHolding && <UpdatePriceModal holding={selectedHolding} onClose={() => setSelectedHolding(null)} />}
      {modal === 'transaction' && <AddTransactionModal onClose={() => setModal(null)} />}
      {modal === 'csv'         && <ImportCSVModal      onClose={() => setModal(null)} />}
    </div>
  )
}
