import { useState } from 'react'
import { X, TrendingUp } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import type { Holding } from '@/types'

const SECTORS = ['Banking', 'IT', 'Energy', 'Auto', 'FMCG', 'Pharma', 'NBFC', 'Consumer', 'Metal', 'Telecom', 'Infrastructure', 'Real Estate', 'Defence', 'Other']

interface Props { holding: Holding; onClose: () => void }

export default function UpdatePriceModal({ holding, onClose }: Props) {
  const updateHoldingPrice = usePortfolioStore((s) => s.updateHoldingPrice)
  const [price, setPrice]         = useState(holding.current_price.toFixed(2))
  const [dayChange, setDayChange] = useState(holding.day_change?.toFixed(2) ?? '0')
  const [sector, setSector]       = useState(holding.sector ?? '')

  const newPrice    = parseFloat(price) || 0
  const newPnl      = (newPrice - holding.average_price) * holding.total_quantity
  const newPnlPct   = holding.average_price > 0 ? ((newPrice - holding.average_price) / holding.average_price) * 100 : 0
  const dayChangePct = newPrice > 0 ? ((parseFloat(dayChange) || 0) / (newPrice - (parseFloat(dayChange) || 0))) * 100 : 0

  function handleSave() {
    updateHoldingPrice(
      holding.symbol, holding.exchange, holding.account_id,
      newPrice, parseFloat(dayChange) || 0, dayChangePct, sector
    )
    onClose()
  }

  return (
    <div style={overlay}>
      <div style={modalBox}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0 }}>{holding.symbol}</h3>
              <span className="chip">{holding.exchange}</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
              Update current market price · {holding.total_quantity} shares
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Avg cost reference */}
          <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Your Avg. Cost:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
              ₹{holding.average_price.toFixed(2)}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Current Market Price (LTP) *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>₹</span>
              <input className="form-input" type="number" min="0.01" step="any"
                value={price} onChange={(e) => setPrice(e.target.value)}
                style={{ paddingLeft: 28 }} autoFocus />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Day Change (₹)</label>
            <input className="form-input" type="number" step="any"
              value={dayChange} onChange={(e) => setDayChange(e.target.value)}
              placeholder="e.g. 15.25 or -8.50" />
          </div>

          <div className="form-group">
            <label className="form-label">Sector</label>
            <select className="form-select" value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="">— Select Sector —</option>
              {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Live P&L preview */}
          {newPrice > 0 && (
            <div style={{ background: newPnl >= 0 ? 'var(--color-profit-bg)' : 'var(--color-loss-bg)', border: `1px solid ${newPnl >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Unrealised P&L Preview</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {holding.total_quantity} × ₹{newPrice.toFixed(2)}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: newPnl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}>
                    {newPnl >= 0 ? '+' : ''}₹{newPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: newPnlPct >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}>
                    ({newPnlPct >= 0 ? '+' : ''}{newPnlPct.toFixed(2)}%)
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary flex-1" onClick={handleSave} disabled={!newPrice || newPrice <= 0}>
              <TrendingUp size={14} /> Update Price
            </button>
          </div>
        </div>
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
  borderRadius: 'var(--radius-2xl)', padding: '28px 32px', width: '100%', maxWidth: 440,
  boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
}
