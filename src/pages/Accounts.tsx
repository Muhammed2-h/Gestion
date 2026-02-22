import { useState } from 'react'
import { Plus, Trash2, Zap, CheckCircle, RefreshCw } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import { formatDate } from '@/lib/utils'
import AddAccountModal from '@/components/AddAccountModal'
import ConnectAPIModal from '@/components/ConnectAPIModal'
import SyncModal from '@/components/SyncModal'
import type { Account } from '@/types'

const BROKER_COLORS: Record<string, string> = {
  Zerodha: '#387ed1', Upstox: '#6366F1', Groww: '#00d09c',
  'Angel One': '#f97316', 'ICICI Direct': '#ef4444',
  'Motilal Oswal': '#8B5CF6', Fyers: '#00b94a', Dhan: '#3B82F6',
}

export default function Accounts() {
  const { accounts, holdings, transactions, deleteAccount } = usePortfolioStore()
  const [showAdd, setShowAdd]             = useState(false)
  const [confirmDel, setConfirmDel]       = useState<string | null>(null)
  const [connectingAcc, setConnectingAcc] = useState<Account | null>(null)
  const [syncingAcc, setSyncingAcc]       = useState<Account | null>(() => {
    // Check if we are returning from an OAuth flow
    const params = new URLSearchParams(window.location.search)
    if (params.has('code') || params.has('request_token')) {
      const id = sessionStorage.getItem('sync_oauth_account_id')
      if (id) {
        const match = usePortfolioStore.getState().accounts.find(a => a.id === id)
        return match || null
      }
    }
    return null
  })

  const getAccountStats = (id: string) => {
    const h = holdings.filter((h) => h.account_id === id)
    const t = transactions.filter((t) => t.account_id === id)
    const invested  = h.reduce((s, x) => s + x.invested_value, 0)
    const current   = h.reduce((s, x) => s + x.current_value, 0)
    return { positions: h.length, trades: t.length, invested, current, pnl: current - invested }
  }

  if (accounts.length === 0) {
    return (
      <div className="app-content animate-fade-in">
        <div className="page-header">
          <div><h1 className="page-title">Accounts</h1><p className="page-subtitle">No accounts added</p></div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏦</div>
          <h3 style={{ marginBottom: 8 }}>Add Your First Account</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Connect a broker account to start tracking your portfolio.</p>
          <button className="btn btn-primary btn-lg" onClick={() => setShowAdd(true)}><Plus size={18} /> Add Broker Account</button>
        </div>
        {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} />}
      </div>
    )
  }

  return (
    <div className="app-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounts</h1>
          <p className="page-subtitle">{accounts.length} broker account{accounts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Account</button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {accounts.map((acc) => {
          const color = BROKER_COLORS[acc.broker_name] ?? 'var(--color-accent)'
          const stats = getAccountStats(acc.id)
          return (
            <div key={acc.id} className="card" style={{ borderTop: `3px solid ${color}` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-lg)', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color }}>
                    {acc.broker_name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{acc.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{acc.broker_name}</div>
                  </div>
                </div>
                <span className={`badge ${acc.is_api_synced ? 'badge-profit' : 'badge-warning'}`}>
                  {acc.is_api_synced ? <><CheckCircle size={10} /> API</> : 'Manual'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'Positions',    val: String(stats.positions) },
                  { label: 'Transactions', val: String(stats.trades) },
                  { label: 'Invested',     val: stats.invested > 0 ? `₹${(stats.invested/100000).toFixed(1)}L` : '—' },
                  { label: 'P&L',          val: stats.pnl !== 0 ? `${stats.pnl >= 0 ? '+' : ''}₹${(stats.pnl/100000).toFixed(1)}L` : '—', color: stats.pnl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' },
                ].map(({ label, val, color: vc }) => (
                  <div key={label} style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: vc ?? 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                Added {formatDate(acc.created_at)} · Type: <span className="chip" style={{ fontSize: '0.65rem' }}>{acc.type.toUpperCase()}</span>
              </div>

              <div className="flex gap-2">
                {acc.api_key && (
                  <button
                    className="btn btn-sm flex-1"
                    style={{ background: '#6366F1', borderColor: '#6366F1', color: 'white' }}
                    onClick={() => setSyncingAcc(acc)}
                  >
                    <RefreshCw size={12} /> Sync Now
                  </button>
                )}
                {acc.is_api_synced && acc.api_status === 'connected'
                  ? <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--color-profit)', color: 'var(--color-profit)' }} onClick={() => setConnectingAcc(acc)}>
                      <Zap size={12} /> Re-key
                    </button>
                  : <button className="btn btn-outline btn-sm" onClick={() => setConnectingAcc(acc)}>
                      <Zap size={12} /> Connect API
                    </button>}
                {confirmDel === acc.id ? (
                  <div className="flex gap-1">
                    <button className="btn btn-danger btn-sm" onClick={() => { deleteAccount(acc.id); setConfirmDel(null) }}>Confirm Delete</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>Cancel</button>
                  </div>
                ) : (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }} onClick={() => setConfirmDel(acc.id)}><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          )
        })}

        {/* Add account CTA */}
        <div className="card" style={{ border: '1px dashed var(--color-border-light)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 220, cursor: 'pointer', transition: 'all 0.25s' }}
          onClick={() => setShowAdd(true)}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.background = 'var(--color-accent-dim)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-light)'; e.currentTarget.style.background = 'transparent' }}>
          <Plus size={28} color="var(--color-accent)" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Add Account</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Connect broker or track manually</div>
          </div>
        </div>
      </div>

      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} />}
      {connectingAcc && <ConnectAPIModal account={connectingAcc} onClose={() => setConnectingAcc(null)} />}
      {syncingAcc && <SyncModal account={syncingAcc} onClose={() => setSyncingAcc(null)} />}
    </div>
  )
}
