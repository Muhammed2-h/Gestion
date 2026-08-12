import { useState, useMemo } from 'react'
import { Upload, Trash2, Plus, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import ImportCSVModal from '@/components/ImportCSVModal'
import AddTransactionModal from '@/components/AddTransactionModal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function Transactions() {
  const { transactions, accounts, deleteTransaction } = usePortfolioStore()
  const [filter, setFilter]     = useState<'ALL' | 'BUY' | 'SELL' | 'DIVIDEND'>('ALL')
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState<'add' | 'csv' | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50

  const getAccountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchFilter = filter === 'ALL' || t.type === filter
      if (!matchFilter) return false
      
      if (search) {
        const query = search.toLowerCase()
        return (
          t.symbol.toLowerCase().includes(query) ||
          t.type.toLowerCase().includes(query) ||
          t.transaction_date.includes(query)
        )
      }
      return true
    })
  }, [transactions, filter, search])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage])

  const totalPages = Math.ceil(filtered.length / pageSize)

  const exportCSV = () => {
    const headers = ['Date', 'Account', 'Symbol', 'Exchange', 'Type', 'Qty', 'Price', 'STT', 'Total']
    const rows = filtered.map(t => [
      t.transaction_date,
      getAccountName(t.account_id),
      t.symbol,
      t.exchange,
      t.type,
      t.quantity,
      t.price,
      t.stt,
      (t.price * t.quantity + t.brokerage + t.stt + t.exchange_charges + t.gst)
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `gestion_transactions_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="app-content animate-fade-in flex flex-col h-full">
      <PageHeader 
        title="Transactions" 
        subtitle={`${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <button className="btn btn-outline btn-sm" onClick={exportCSV} disabled={filtered.length === 0}><Download size={14} /> Export CSV</button>
            <button className="btn btn-outline btn-sm" onClick={() => setModal('csv')}><Upload size={14} /> Import CSV</button>
            <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}><Plus size={14} /> Add Transaction</button>
          </>
        }
      />

      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Filter tabs */}
          <div className="flex items-center gap-2">
            {(['ALL', 'BUY', 'SELL', 'DIVIDEND'] as const).map((f) => (
              <button 
                key={f} 
                onClick={() => { setFilter(f); setCurrentPage(1) }} 
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
              >
                {f} {f !== 'ALL' && <span className="opacity-70 ml-1">({transactions.filter((t) => t.type === f).length})</span>}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-bg-secondary border border-border rounded-md px-3 py-1.5 w-full max-w-xs">
            <Search size={14} className="text-muted" />
            <input 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }} 
              placeholder="Search symbol, date, type…"
              className="bg-transparent border-none outline-none text-primary text-sm w-full placeholder:text-muted" 
            />
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="text-center p-10 max-w-2xl mx-auto mt-10 w-full">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="mb-2">No Transactions Found</h3>
          <p className="text-muted mb-6">
            {search || filter !== 'ALL' ? 'Try adjusting your search or filters.' : 'Import your broker CSV or add a transaction manually.'}
          </p>
          {!search && filter === 'ALL' && (
            <div className="flex gap-3 justify-center">
              <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={15} /> Add Transaction</button>
              <button className="btn btn-outline" onClick={() => setModal('csv')}><Upload size={15} /> Import CSV</button>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-0 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="table-scroll-wrapper overflow-auto flex-1">
            <table className="data-table w-full relative">
              <thead>
                <tr>
                  <th className="bg-bg-card z-10 sticky top-0">Date</th>
                  <th className="bg-bg-card z-10 sticky top-0">Account</th>
                  <th className="bg-bg-card z-10 sticky top-0">Symbol</th>
                  <th className="bg-bg-card z-10 sticky top-0">Exch</th>
                  <th className="bg-bg-card z-10 sticky top-0 text-center">Type</th>
                  <th className="bg-bg-card z-10 sticky top-0 text-right">Qty</th>
                  <th className="bg-bg-card z-10 sticky top-0 text-right">Price</th>
                  <th className="bg-bg-card z-10 sticky top-0 text-right">Charges</th>
                  <th className="bg-bg-card z-10 sticky top-0 text-right">Total</th>
                  <th className="bg-bg-card z-10 sticky top-0 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t) => {
                  const charges = t.brokerage + t.stt + t.exchange_charges + t.gst
                  const total = t.price * t.quantity + charges
                  
                  return (
                    <tr key={t.id} className="hover:bg-bg-secondary transition-fast group">
                      <td className="text-xs text-secondary whitespace-nowrap">{formatDate(t.transaction_date)}</td>
                      <td className="text-sm text-muted">{getAccountName(t.account_id)}</td>
                      <td className="font-bold text-primary">{t.symbol}</td>
                      <td><Badge className="text-xs py-0.5 px-2">{t.exchange}</Badge></td>
                      <td className="text-center">
                        <Badge variant={t.type === 'BUY' ? 'info' : t.type === 'SELL' ? 'loss' : 'profit'} className="text-xs font-bold">
                          {t.type}
                        </Badge>
                      </td>
                      <td className="text-right font-mono text-sm">{t.quantity}</td>
                      <td className="text-right font-mono text-sm text-secondary">{formatCurrency(t.price)}</td>
                      <td className="text-right font-mono text-xs text-muted">{charges > 0 ? formatCurrency(charges) : '—'}</td>
                      <td className={`text-right font-mono font-bold text-sm ${t.type === 'SELL' ? 'text-profit' : 'text-primary'}`}>
                        {formatCurrency(total, true)}
                      </td>
                      <td>
                        <div className="flex items-center justify-center">
                          {confirmDel === t.id ? (
                            <div className="flex items-center gap-1">
                              <button className="btn btn-danger btn-sm text-xs py-0.5 px-2" onClick={() => { deleteTransaction(t.id); setConfirmDel(null) }}>Confirm</button>
                              <button className="btn btn-ghost btn-sm text-xs py-0.5 px-2" onClick={() => setConfirmDel(null)}>Cancel</button>
                            </div>
                          ) : (
                            <button 
                              className="p-1.5 text-muted hover:text-loss rounded-md hover:bg-loss-bg transition-fast opacity-0 group-hover:opacity-100" 
                              onClick={() => setConfirmDel(t.id)}
                              title="Delete Transaction"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="border-t border-border p-3 flex items-center justify-between bg-bg-card text-sm text-muted">
              <div>
                Showing <span className="text-primary font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-primary font-medium">{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="text-primary font-medium">{filtered.length}</span> records
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="p-1 border border-border rounded-md hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2">Page {currentPage} of {totalPages}</span>
                <button 
                  className="p-1 border border-border rounded-md hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {modal === 'add' && <AddTransactionModal onClose={() => setModal(null)} />}
      {modal === 'csv' && <ImportCSVModal      onClose={() => setModal(null)} />}
    </div>
  )
}
