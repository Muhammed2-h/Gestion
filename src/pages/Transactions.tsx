import { useState } from 'react'
import { Upload, Trash2, Plus } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import ImportCSVModal from '@/components/ImportCSVModal'
import AddTransactionModal from '@/components/AddTransactionModal'

const TYPE_BADGE: Record<string, string> = { BUY: 'badge-info', SELL: 'badge-loss', DIVIDEND: 'badge-profit' }

export default function Transactions() {
  const { transactions, accounts, deleteTransaction } = usePortfolioStore()
  const [filter, setFilter]     = useState<'ALL' | 'BUY' | 'SELL' | 'DIVIDEND'>('ALL')
  const [modal, setModal]       = useState<'add' | 'csv' | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const filtered = transactions.filter((t) => filter === 'ALL' || t.type === filter)
  const getAccountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id

  return (
    <div className="app-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setModal('csv')}><Upload size={14} /> Import CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}><Plus size={14} /> Add Transaction</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {(['ALL', 'BUY', 'SELL', 'DIVIDEND'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}>
            {f} {f !== 'ALL' && `(${transactions.filter((t) => t.type === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📋</div>
          <h3 style={{ marginBottom: 8 }}>No Transactions Yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Import your broker CSV or add a transaction manually.</p>
          <div className="flex gap-3 justify-center">
            <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={15} /> Add Transaction</button>
            <button className="btn btn-outline" onClick={() => setModal('csv')}><Upload size={15} /> Import CSV</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Account</th><th>Symbol</th><th>Exch</th><th>Type</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Price (₹)</th>
                <th style={{ textAlign: 'right' }}>STT (₹)</th>
                <th style={{ textAlign: 'right' }}>Total (₹)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const total = t.price * t.quantity + t.brokerage + t.stt + t.exchange_charges + t.gst
                return (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(t.transaction_date)}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{getAccountName(t.account_id)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.symbol}</td>
                    <td><span className="chip" style={{ fontSize: '0.68rem' }}>{t.exchange}</span></td>
                    <td><span className={`badge ${TYPE_BADGE[t.type]}`}>{t.type}</span></td>
                    <td className="col-num">{t.quantity}</td>
                    <td className="col-num">{formatCurrency(t.price)}</td>
                    <td className="col-num" style={{ color: 'var(--text-muted)' }}>{t.stt > 0 ? formatCurrency(t.stt) : '—'}</td>
                    <td className="col-num" style={{ fontWeight: 700, color: t.type === 'SELL' ? 'var(--color-profit)' : 'var(--color-loss)' }}>
                      {formatCurrency(total, true)}
                    </td>
                    <td>
                      {confirmDel === t.id ? (
                        <div className="flex gap-1">
                          <button className="btn btn-danger btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => { deleteTransaction(t.id); setConfirmDel(null) }}>Confirm</button>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => setConfirmDel(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)', padding: 4 }} onClick={() => setConfirmDel(t.id)}><Trash2 size={13} /></button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'add' && <AddTransactionModal onClose={() => setModal(null)} />}
      {modal === 'csv' && <ImportCSVModal      onClose={() => setModal(null)} />}
    </div>
  )
}
