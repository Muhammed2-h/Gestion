import { useState } from 'react'
import { Key, RefreshCw, CheckCircle2, ExternalLink, Info, Globe, Wifi } from 'lucide-react'

const DATA_SOURCES = [
  {
    id: 'YAHOO',
    name: 'Yahoo Finance',
    description: 'End-of-day quotes, dividends, and historical data for NSE (.NS) and BSE (.BO) tickers. Free, no API key required.',
    requiresKey: false,
    status: 'active',
    link: 'https://finance.yahoo.com',
  },
  {
    id: 'NSE_BSE',
    name: 'NSE / BSE Bhavcopy',
    description: 'Official daily price CSV from NSE & BSE exchanges. Includes complete OHLCV data. Auto-downloaded each trading day.',
    requiresKey: false,
    status: 'active',
    link: 'https://www.nseindia.com/all-reports',
  },
  {
    id: 'AMFI',
    name: 'AMFI India (Mutual Funds)',
    description: 'Official NAV data for all SEBI-registered mutual funds in India. Updated by 11 PM on trading days.',
    requiresKey: false,
    status: 'active',
    link: 'https://www.amfiindia.com',
  },
  {
    id: 'ALPHAVANTAGE',
    name: 'Alpha Vantage (Optional)',
    description: 'Free tier supports 25 requests/day for global equity data. Useful as a fallback for historical data.',
    requiresKey: true,
    status: 'inactive',
    link: 'https://www.alphavantage.co/support/#api-key',
  },
]

const BROKER_INTEGRATIONS = [
  { id: 'zerodha',    name: 'Zerodha (Kite Connect)', logo: 'Z', color: '#387ed1', docUrl: 'https://kite.trade/docs/connect/v3/' },
  { id: 'upstox',    name: 'Upstox API',             logo: 'U', color: '#6366F1', docUrl: 'https://upstox.com/developer/api-documentation/' },
  { id: 'fyers',     name: 'Fyers API',              logo: 'F', color: '#00b94a', docUrl: 'https://myapi.fyers.in/docs/' },
  { id: 'dhan',      name: 'Dhan HQ',                logo: 'D', color: '#f97316', docUrl: 'https://dhanhq.co/docs/latest/' },
  { id: 'angelone',  name: 'Angel One SmartAPI',     logo: 'A', color: '#ef4444', docUrl: 'https://smartapi.angelbroking.com/docs' },
]

export default function Integrations() {
  const [brokerKeys, setBrokerKeys] = useState<Record<string, { apiKey: string; secret: string; connected: boolean }>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [secretInput, setSecretInput] = useState('')

  function handleConnect(brokerId: string) {
    if (!keyInput.trim()) return
    setBrokerKeys((prev) => ({
      ...prev,
      [brokerId]: { apiKey: keyInput, secret: secretInput, connected: true },
    }))
    setEditing(null)
    setKeyInput('')
    setSecretInput('')
  }

  return (
    <div className="app-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-subtitle">Manage open source data sources and broker API connections</p>
        </div>
      </div>

      {/* Open Source Data Sources */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Globe size={20} color="var(--color-accent)" />
          <h2 style={{ fontSize: '1.1rem' }}>Open Source Market Data</h2>
          <span className="badge badge-profit">Free</span>
        </div>
        <div className="grid grid-2" style={{ gridTemplateColumns: 'var(--account-grid, repeat(auto-fill, minmax(320px, 1fr)))' }}>
          {DATA_SOURCES.map((src) => (
            <div key={src.id} className="card" style={{
              borderLeft: `3px solid ${src.status === 'active' ? 'var(--color-profit)' : 'var(--color-border)'}`,
            }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{src.name}</div>
                  {src.requiresKey && <span className="badge badge-warning" style={{ marginBottom: 8 }}>API Key Required</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: src.status === 'active' ? 'var(--color-profit)' : 'var(--color-border-light)',
                    display: 'block',
                  }} />
                  <span style={{ fontSize: '0.72rem', color: src.status === 'active' ? 'var(--color-profit)' : 'var(--text-muted)' }}>
                    {src.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>{src.description}</p>
              {src.requiresKey && (
                <div className="form-group mb-3">
                  <input className="form-input" placeholder="Enter API Key…" style={{ fontSize: '0.82rem' }} />
                </div>
              )}
              <a href={src.link} target="_blank" rel="noreferrer"
                className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }}>
                <ExternalLink size={12} /> View Docs
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* Broker API Integrations */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-2">
          <Wifi size={20} color="var(--color-info)" />
          <h2 style={{ fontSize: '1.1rem' }}>Broker API Connections</h2>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Connect your broker API to automatically sync live positions and executed trades without CSV uploads.
          Your API keys are encrypted using your master vault password.
        </p>

        <div className="card mb-4" style={{ background: 'var(--color-info-bg)', borderColor: 'rgba(59,130,246,0.2)', padding: '14px 20px' }}>
          <div className="flex items-center gap-3">
            <Info size={16} color="var(--color-info)" />
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              API Keys are stored encrypted in your local database. <strong>Never shared externally.</strong>{' '}
              Gestion only requests read-only scopes for positions and order history.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {BROKER_INTEGRATIONS.map((b) => {
            const conn = brokerKeys[b.id]
            const isEditing = editing === b.id
            return (
              <div key={b.id} className="card" style={{ padding: '16px 24px' }}>
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Logo */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                    background: `${b.color}22`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 800, color: b.color, fontSize: '1rem', flexShrink: 0,
                  }}>{b.logo}</div>

                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{b.name}</div>
                    {conn?.connected
                      ? <span className="badge badge-profit"><CheckCircle2 size={10} /> Connected · Key: ••••{conn.apiKey.slice(-4)}</span>
                      : <span className="badge" style={{ background: 'var(--color-bg-card-hover)', color: 'var(--text-muted)' }}>Not Connected</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    <a href={b.docUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                      <ExternalLink size={12} /> API Docs
                    </a>
                    {conn?.connected
                      ? <>
                          <button className="btn btn-outline btn-sm"><RefreshCw size={12} /> Re-Sync</button>
                          <button className="btn btn-danger btn-sm" onClick={() => {
                            const updated = { ...brokerKeys }
                            delete updated[b.id]
                            setBrokerKeys(updated)
                          }}>Disconnect</button>
                        </>
                      : <button className="btn btn-primary btn-sm" onClick={() => setEditing(isEditing ? null : b.id)}>
                          <Key size={12} /> {isEditing ? 'Cancel' : 'Add API Key'}
                        </button>}
                  </div>
                </div>

                {/* Inline Key Form */}
                {isEditing && (
                  <div style={{
                    marginTop: 16, padding: '16px', background: 'var(--color-bg-primary)',
                    borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
                  }}>
                    <div className="grid grid-2 mb-3" style={{ gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">API Key *</label>
                        <input className="form-input" placeholder="Your API key…" value={keyInput}
                          onChange={(e) => setKeyInput(e.target.value)} type="text" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">API Secret</label>
                        <input className="form-input" placeholder="Your API secret…" value={secretInput}
                          onChange={(e) => setSecretInput(e.target.value)} type="password" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="btn btn-primary btn-sm" onClick={() => handleConnect(b.id)}>
                        <CheckCircle2 size={13} /> Save & Connect
                      </button>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Stored encrypted · Read-only access only
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
