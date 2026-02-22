import { useState, useRef } from 'react'
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import { parseZerodhaCsv } from '@/lib/utils'

interface Props { onClose: () => void }

export default function ImportCSVModal({ onClose }: Props) {
  const { accounts, addTransactionsBulk } = usePortfolioStore()
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [broker, setBroker] = useState('Zerodha')
  const [parsed, setParsed] = useState<ReturnType<typeof parseZerodhaCsv>>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [imported, setImported] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const rows = parseZerodhaCsv(text)
        if (rows.length === 0) {
          setError('No valid transactions found. Check the CSV format.')
        } else {
          setParsed(rows)
        }
      } catch {
        setError('Failed to parse CSV. Please check the file format.')
      }
    }
    reader.readAsText(file)
  }

  function handleImport() {
    if (!accountId || parsed.length === 0) return
    addTransactionsBulk(parsed.map((r) => ({ ...r, account_id: accountId } as any)))
    setImported(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div style={overlay}>
      <div style={modalBox}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--color-accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={20} color="var(--color-accent)" />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Import CSV</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Import transactions from broker CSV</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Broker + Account selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Broker Format</label>
              <select className="form-select" value={broker} onChange={(e) => setBroker(e.target.value)}>
                <option value="Zerodha">Zerodha (Kite Tradebook)</option>
                <option value="Upstox">Upstox (coming soon)</option>
                <option value="Groww">Groww (coming soon)</option>
                <option value="Angel One">Angel One (coming soon)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Import Into Account</label>
              <select className="form-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">— Select Account —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* CSV instructions */}
          <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>How to export from Zerodha:</div>
            <ol style={{ paddingLeft: 16, lineHeight: 2 }}>
              <li>Log in to Kite → <strong>Console</strong> → Reports → Tradebook</li>
              <li>Set the date range and download as <strong>CSV</strong></li>
              <li>Upload that CSV file below</li>
            </ol>
          </div>

          {/* File drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${fileName ? 'var(--color-accent)' : 'var(--color-border-light)'}`,
              borderRadius: 'var(--radius-xl)', padding: '28px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              cursor: 'pointer', transition: 'all 0.2s',
              background: fileName ? 'var(--color-accent-dim)' : 'var(--color-bg-primary)',
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) {
                const fakeEvent = { target: { files: [file] } } as any
                handleFile(fakeEvent)
              }
            }}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
            {fileName
              ? <><FileText size={28} color="var(--color-accent)" /><span style={{ fontWeight: 600, color: 'var(--color-accent-light)', fontSize: '0.88rem' }}>{fileName}</span></>
              : <><Upload size={28} color="var(--text-muted)" /><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Click to browse or drag & drop CSV</span></>}
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-loss)', fontSize: '0.82rem', background: 'var(--color-loss-bg)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Preview table */}
          {parsed.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 8 }}>
                Preview: {parsed.length} transactions found
              </div>
              <div style={{ maxHeight: 180, overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <table className="data-table" style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th><th>Symbol</th><th>Type</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 10).map((r, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)' }}>{r.transaction_date}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.symbol}</td>
                        <td><span className={`badge badge-${r.type === 'BUY' ? 'info' : r.type === 'SELL' ? 'loss' : 'profit'}`}>{r.type}</span></td>
                        <td className="col-num">{r.quantity}</td>
                        <td className="col-num">{r.price.toFixed(2)}</td>
                      </tr>
                    ))}
                    {parsed.length > 10 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', padding: 8 }}>…and {parsed.length - 10} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {imported && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-profit)', fontWeight: 600, fontSize: '0.88rem' }}>
              <CheckCircle2 size={18} /> {parsed.length} transactions imported successfully!
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary flex-1"
              onClick={handleImport}
              disabled={parsed.length === 0 || !accountId || imported}
            >
              <Upload size={14} /> Import {parsed.length > 0 ? `${parsed.length} Transactions` : ''}
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
  borderRadius: 'var(--radius-2xl)', padding: '28px 32px', width: '100%', maxWidth: 580,
  maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
}
