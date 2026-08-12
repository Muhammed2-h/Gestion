import { useState, useMemo } from 'react'
import { Plus, Trash2, Zap, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import { formatDate } from '@/lib/utils'
import AddAccountModal from '@/components/AddAccountModal'
import ConnectAPIModal from '@/components/ConnectAPIModal'
import SyncModal from '@/components/SyncModal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
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

  // Grouping accounts
  const groupedAccounts = useMemo(() => {
    return {
      connected: accounts.filter(a => a.is_api_synced),
      manual: accounts.filter(a => !a.is_api_synced)
    }
  }, [accounts])

  if (accounts.length === 0) {
    return (
      <div className="app-content animate-fade-in flex flex-col items-center justify-center">
        <PageHeader title="Accounts" subtitle="No accounts added" />
        <Card className="text-center p-10 max-w-2xl mx-auto mt-10 w-full">
          <div className="text-5xl mb-4">🏦</div>
          <h3 className="mb-2">Add Your First Account</h3>
          <p className="text-muted mb-6">Connect a broker account to start tracking your portfolio.</p>
          <button className="btn btn-primary btn-lg mx-auto" onClick={() => setShowAdd(true)}>
            <Plus size={18} /> Add Broker Account
          </button>
        </Card>
        {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} />}
      </div>
    )
  }

  const renderAccountCard = (acc: Account) => {
    const color = BROKER_COLORS[acc.broker_name] ?? 'var(--color-accent)'
    const stats = getAccountStats(acc.id)
    
    return (
      <Card key={acc.id} className="border-t-[3px] flex flex-col" style={{ borderTopColor: color }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-md flex items-center justify-center font-bold text-lg" 
              style={{ background: `${color}22`, color }}
            >
              {acc.broker_name[0]}
            </div>
            <div>
              <div className="font-bold text-primary">{acc.name}</div>
              <div className="text-xs text-muted">{acc.broker_name}</div>
            </div>
          </div>
          <Badge variant={acc.is_api_synced ? (acc.api_status === 'error' ? 'loss' : 'profit') : 'warning'} className="text-xs font-bold py-1 px-2 flex items-center gap-1">
            {acc.is_api_synced 
              ? (acc.api_status === 'error' ? <><AlertCircle size={10} /> Sync Error</> : <><CheckCircle size={10} /> API Synced</>) 
              : 'Manual Entry'}
          </Badge>
        </div>

        <div className="grid grid-2 gap-2.5 mb-4">
          {[
            { label: 'Positions',    val: String(stats.positions) },
            { label: 'Transactions', val: String(stats.trades) },
            { label: 'Invested',     val: stats.invested > 0 ? `₹${(stats.invested/100000).toFixed(1)}L` : '—' },
            { label: 'P&L',          val: stats.pnl !== 0 ? `${stats.pnl >= 0 ? '+' : ''}₹${(stats.pnl/100000).toFixed(1)}L` : '—', color: stats.pnl >= 0 ? 'text-profit' : 'text-loss' },
          ].map(({ label, val, color: vc }) => (
            <div key={label} className="bg-bg-primary rounded-md p-2">
              <div className="text-xs text-muted uppercase tracking-wider mb-0.5">{label}</div>
              <div className={`font-bold text-sm font-mono ${vc ?? 'text-primary'}`}>{val}</div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            Added {formatDate(acc.created_at)}
            <Badge variant="default" className="text-xs ml-1 px-1.5 py-0 uppercase">{acc.type}</Badge>
          </div>
          {acc.last_synced && (
            <span className="italic">Synced {new Date(acc.last_synced).toLocaleDateString()}</span>
          )}
        </div>

        <div className="flex gap-2 mt-auto">
          {acc.api_key && (
            <button
              className="btn btn-sm flex-1"
              style={{ background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: 'white' }}
              onClick={() => setSyncingAcc(acc)}
            >
              <RefreshCw size={12} /> Sync Now
            </button>
          )}
          {acc.is_api_synced && acc.api_status === 'connected'
            ? <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--color-profit)', color: 'var(--color-profit)' }} onClick={() => setConnectingAcc(acc)}>
                <Zap size={12} /> Re-key
              </button>
            : <button className="btn btn-outline btn-sm flex-1" onClick={() => setConnectingAcc(acc)}>
                <Zap size={12} /> Connect API
              </button>}
          {confirmDel === acc.id ? (
            <div className="flex items-center gap-1 bg-loss-bg p-1 rounded-md">
              <button className="btn btn-danger btn-sm text-xs py-1 px-2" onClick={() => { deleteAccount(acc.id); setConfirmDel(null) }}>Delete</button>
              <button className="btn btn-ghost btn-sm text-xs py-1 px-2 text-primary" onClick={() => setConfirmDel(null)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm text-muted hover:text-loss hover:bg-loss-bg transition-fast" onClick={() => setConfirmDel(acc.id)}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </Card>
    )
  }

  const renderAddCard = () => (
    <Card 
      className="border-dashed border-border-light bg-transparent flex flex-col items-center justify-center gap-3 min-h-[220px] cursor-pointer hover:border-accent hover:bg-accent-dim transition-fast"
      onClick={() => setShowAdd(true)}
    >
      <Plus size={28} className="text-accent" />
      <div className="text-center">
        <div className="font-semibold text-primary mb-1">Add Account</div>
        <div className="text-sm text-muted">Connect broker or track manually</div>
      </div>
    </Card>
  )

  return (
    <div className="app-content animate-fade-in flex flex-col h-full overflow-auto">
      <PageHeader 
        title="Broker Accounts" 
        subtitle={`${accounts.length} linked account${accounts.length !== 1 ? 's' : ''}`}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Account</button>
        }
      />

      {groupedAccounts.connected.length > 0 && (
        <div className="mb-8">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Zap size={16} className="text-accent" /> API Connected Brokers
          </h3>
          <div className="grid grid-3 gap-5 grid-auto-fill-320">
            {groupedAccounts.connected.map(renderAccountCard)}
            {groupedAccounts.manual.length === 0 && renderAddCard()}
          </div>
        </div>
      )}

      {groupedAccounts.manual.length > 0 && (
        <div className="mb-8">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <RefreshCw size={16} className="text-muted" /> Manual Accounts
          </h3>
          <div className="grid grid-3 gap-5 grid-auto-fill-320">
            {groupedAccounts.manual.map(renderAccountCard)}
            {renderAddCard()}
          </div>
        </div>
      )}

      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} />}
      {connectingAcc && <ConnectAPIModal account={connectingAcc} onClose={() => setConnectingAcc(null)} />}
      {syncingAcc && <SyncModal account={syncingAcc} onClose={() => setSyncingAcc(null)} />}
    </div>
  )
}
