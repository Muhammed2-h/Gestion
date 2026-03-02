import { useState } from 'react'
import { X, Building2 } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import type { AccountType } from '@/types'

const BROKERS = ['Zerodha', 'Upstox', 'Groww', 'Angel One', 'ICICI Direct', 'HDFC Securities', 'Motilal Oswal', 'Fyers', 'Dhan', 'Other']

interface Props { onClose: () => void }

export default function AddAccountModal({ onClose }: Props) {
  const addAccount = usePortfolioStore((s) => s.addAccount)
  const [name, setName] = useState('')
  const [broker, setBroker] = useState('Zerodha')
  const [type, setType] = useState<AccountType>('equity')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Account name is required'); return }
    addAccount({ name: name.trim(), broker_name: broker, type, is_api_synced: false })
    onClose()
  }

  return (
    <div style={overlay}>
      <div style={modalBox}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--color-accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={20} color="var(--color-accent)" />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Add Broker Account</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Connect a new brokerage account</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Account Name *</label>
            <input className="form-input" placeholder="e.g. Zerodha – Primary" value={name}
              onChange={(e) => { setName(e.target.value); setError('') }} autoFocus />
            {error && <span style={{ fontSize: '0.75rem', color: 'var(--color-loss)' }}>{error}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Broker</label>
            <select className="form-select" value={broker} onChange={(e) => setBroker(e.target.value)}>
              {BROKERS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Account Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'var(--modal-grid-4, repeat(4, 1fr))', gap: 8 }}>
              {(['equity', 'fno', 'mf', 'cash'] as AccountType[]).map((t) => (
                <label key={t} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '8px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: `1px solid ${type === t ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: type === t ? 'var(--color-accent-dim)' : 'var(--color-bg-primary)',
                  color: type === t ? 'var(--color-accent-light)' : 'var(--text-muted)',
                  fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', transition: 'all 0.15s',
                }}>
                  <input type="radio" value={t} checked={type === t} onChange={() => setType(t)} style={{ display: 'none' }} />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1">Add Account</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)',
}
const modalBox: React.CSSProperties = {
  background: 'var(--color-bg-card)', border: '1px solid var(--color-border-light)',
  borderRadius: 'var(--radius-2xl)', padding: '28px 32px', width: '100%', maxWidth: 480,
  boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
}
