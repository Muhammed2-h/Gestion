import { useState } from 'react'
import { X, ArrowLeftRight } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import type { TransactionType, Exchange } from '@/types'

interface Props { onClose: () => void }

const today = new Date().toISOString().split('T')[0]

export default function AddTransactionModal({ onClose }: Props) {
  const { accounts, addTransaction } = usePortfolioStore()
  const [form, setForm] = useState({
    account_id: accounts[0]?.id ?? '',
    symbol: '',
    exchange: 'NSE' as Exchange,
    type: 'BUY' as TransactionType,
    quantity: '',
    price: '',
    brokerage: '0',
    stt: '0',
    exchange_charges: '0',
    gst: '0',
    transaction_date: today,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }))
    setErrors({})
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.account_id) e.account_id = 'Select an account'
    if (!form.symbol.trim()) e.symbol = 'Symbol is required'
    if (!form.quantity || parseFloat(form.quantity) <= 0) e.quantity = 'Enter valid quantity'
    if (!form.price || parseFloat(form.price) <= 0) e.price = 'Enter valid price'
    if (!form.transaction_date) e.transaction_date = 'Date is required'
    return e
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    addTransaction({
      account_id: form.account_id,
      symbol: form.symbol.trim().toUpperCase(),
      exchange: form.exchange,
      type: form.type,
      quantity: parseFloat(form.quantity),
      price: parseFloat(form.price),
      brokerage: parseFloat(form.brokerage) || 0,
      stt: parseFloat(form.stt) || 0,
      exchange_charges: parseFloat(form.exchange_charges) || 0,
      gst: parseFloat(form.gst) || 0,
      transaction_date: form.transaction_date,
    })
    onClose()
  }

  const totalValue = (parseFloat(form.quantity) || 0) * (parseFloat(form.price) || 0)
  const totalCharges = (parseFloat(form.brokerage) || 0) + (parseFloat(form.stt) || 0) + (parseFloat(form.exchange_charges) || 0) + (parseFloat(form.gst) || 0)

  const typeColor: Record<string, string> = { BUY: 'var(--color-info)', SELL: 'var(--color-loss)', DIVIDEND: 'var(--color-profit)' }

  return (
    <div style={overlay}>
      <div style={modalBox}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--color-info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeftRight size={20} color="var(--color-info)" />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Add Transaction</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Record a BUY, SELL or DIVIDEND</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {accounts.length === 0 && (
          <div style={{ background: 'var(--color-warning-bg)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--color-warning)' }}>
            ⚠️ No accounts found. Please add a broker account first.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type tabs */}
          <div style={{ display: 'flex', gap: 8, background: 'var(--color-bg-primary)', padding: 4, borderRadius: 'var(--radius-md)' }}>
            {(['BUY', 'SELL', 'DIVIDEND'] as TransactionType[]).map((t) => (
              <button key={t} type="button" onClick={() => set({ type: t })} style={{
                flex: 1, padding: '7px', border: 'none', borderRadius: 'calc(var(--radius-md) - 2px)',
                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
                background: form.type === t ? typeColor[t] : 'transparent',
                color: form.type === t ? 'white' : 'var(--text-muted)',
              }}>{t}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Account *</label>
              <select className="form-select" value={form.account_id} onChange={(e) => set({ account_id: e.target.value })}>
                <option value="">— Select Account —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors.account_id && <span style={{ fontSize: '0.72rem', color: 'var(--color-loss)' }}>{errors.account_id}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Symbol *</label>
              <input className="form-input" placeholder="e.g. RELIANCE" value={form.symbol}
                onChange={(e) => set({ symbol: e.target.value.toUpperCase() })} style={{ textTransform: 'uppercase' }} />
              {errors.symbol && <span style={{ fontSize: '0.72rem', color: 'var(--color-loss)' }}>{errors.symbol}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Exchange</label>
              <select className="form-select" value={form.exchange} onChange={(e) => set({ exchange: e.target.value as Exchange })}>
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input className="form-input" type="number" placeholder="0" min="0.001" step="any"
                value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} />
              {errors.quantity && <span style={{ fontSize: '0.72rem', color: 'var(--color-loss)' }}>{errors.quantity}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Price per Share (₹) *</label>
              <input className="form-input" type="number" placeholder="0.00" min="0.01" step="any"
                value={form.price} onChange={(e) => set({ price: e.target.value })} />
              {errors.price && <span style={{ fontSize: '0.72rem', color: 'var(--color-loss)' }}>{errors.price}</span>}
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Transaction Date *</label>
              <input className="form-input" type="date" value={form.transaction_date}
                onChange={(e) => set({ transaction_date: e.target.value })} max={today} />
            </div>
          </div>

          {/* Charges (collapsed by default) */}
          <details style={{ cursor: 'pointer' }}>
            <summary style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.65rem' }}>▶</span> Transaction Charges (optional)
            </summary>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              {[
                { label: 'Brokerage (₹)', key: 'brokerage' },
                { label: 'STT (₹)', key: 'stt' },
                { label: 'Exchange Charges (₹)', key: 'exchange_charges' },
                { label: 'GST (₹)', key: 'gst' },
              ].map(({ label, key }) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" type="number" min="0" step="any"
                    value={form[key as keyof typeof form]} onChange={(e) => set({ [key]: e.target.value } as any)} />
                </div>
              ))}
            </div>
          </details>

          {/* Summary */}
          {totalValue > 0 && (
            <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', padding: '10px 14px', border: '1px solid var(--color-border)', fontSize: '0.8rem' }}>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Trade Value:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {totalCharges > 0 && (
                <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Charges:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-loss)' }}>₹{totalCharges.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between" style={{ marginTop: 4, borderTop: '1px solid var(--color-border)', paddingTop: 6 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Net Amount:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>
                  ₹{(form.type === 'SELL' ? totalValue - totalCharges : totalValue + totalCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={accounts.length === 0}>
              Add {form.type}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)',
}
const modalBox: React.CSSProperties = {
  background: 'var(--color-bg-card)', border: '1px solid var(--color-border-light)',
  borderRadius: 'var(--radius-2xl)', padding: '28px 32px', width: '100%', maxWidth: 560,
  maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
}
