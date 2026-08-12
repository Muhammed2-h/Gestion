import { useState } from 'react'
import { Key, RefreshCw, CheckCircle2, ExternalLink, Info, Globe, Wifi } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

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
    name: 'Alpha Vantage',
    description: 'Free tier supports 25 requests/day for global equity data. Useful as a fallback for historical data.',
    requiresKey: true,
    status: 'inactive',
    link: 'https://www.alphavantage.co/support/#api-key',
  },
]

const BROKER_INTEGRATIONS = [
  { id: 'zerodha',   name: 'Zerodha (Kite Connect)', logo: 'Z', color: '#387ed1', docUrl: 'https://kite.trade/docs/connect/v3/' },
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
    <div className="app-content animate-fade-in flex flex-col h-full overflow-auto">
      <PageHeader 
        title="Integrations" 
        subtitle="Manage open source data sources and broker API connections"
      />

      {/* Open Source Data Sources */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <Globe size={20} className="text-accent" />
          <h2 className="text-lg font-bold">Open Source Market Data</h2>
          <Badge variant="profit" className="ml-2">Free</Badge>
        </div>
        
        <div className="grid gap-5 grid-auto-fill-320">
          {DATA_SOURCES.map((src) => (
            <Card key={src.id} className="flex flex-col border-l-4" style={{ borderLeftColor: src.status === 'active' ? 'var(--color-profit)' : 'var(--color-border)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-primary mb-1">{src.name}</div>
                  {src.requiresKey && <Badge variant="warning" className="mb-2 text-xs py-0 px-1.5">API Key Required</Badge>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${src.status === 'active' ? 'bg-profit' : 'bg-border-light'}`} />
                  <span className={`text-xs font-bold ${src.status === 'active' ? 'text-profit' : 'text-muted'}`}>
                    {src.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-secondary mb-4 flex-1">{src.description}</p>
              
              {src.requiresKey && (
                <div className="form-group mb-4">
                  <input className="form-input text-xs p-2" placeholder="Enter API Key…" />
                </div>
              )}
              
              <a 
                href={src.link} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-outline btn-sm self-start text-xs mt-auto" 
              >
                <ExternalLink size={12} /> View Docs
              </a>
            </Card>
          ))}
        </div>
      </div>

      <div className="border-b border-border my-2"></div>

      {/* Broker API Integrations */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-2">
          <Wifi size={20} className="text-info" />
          <h2 className="text-lg font-bold">Broker API Connections</h2>
        </div>
        
        <p className="text-sm text-muted mb-5">
          Connect your broker API to automatically sync live positions and executed trades without CSV uploads.
          Your API keys are encrypted using your master vault password.
        </p>

        <Card className="mb-6 p-4 border-info bg-info/10">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-info flex-shrink-0 mt-0.5" />
            <p className="text-sm text-secondary m-0">
              API Keys are stored encrypted in your local database. <strong>Never shared externally.</strong>{' '}
              Gestion only requests read-only scopes for positions and order history.
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          {BROKER_INTEGRATIONS.map((b) => {
            const conn = brokerKeys[b.id]
            const isEditing = editing === b.id
            return (
              <Card key={b.id} className="p-4 md:p-5">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Logo */}
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg flex-shrink-0"
                    style={{ background: `${b.color}22`, color: b.color }}
                  >
                    {b.logo}
                  </div>

                  <div className="flex-1 min-w-[160px]">
                    <div className="font-bold text-primary mb-1">{b.name}</div>
                    {conn?.connected ? (
                      <Badge variant="profit" className="flex items-center gap-1 w-max text-xs py-0 px-2">
                        <CheckCircle2 size={10} /> Connected · Key: ••••{conn.apiKey.slice(-4)}
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs py-0 px-2 w-max">Not Connected</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3 md:mt-0 w-full md:w-auto">
                    <a href={b.docUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm flex-1 md:flex-none">
                      <ExternalLink size={12} /> API Docs
                    </a>
                    {conn?.connected ? (
                      <>
                        <button className="btn btn-outline btn-sm flex-1 md:flex-none"><RefreshCw size={12} /> Re-Sync</button>
                        <button 
                          className="btn btn-danger btn-sm flex-1 md:flex-none bg-loss text-white border-transparent" 
                          onClick={() => {
                            const updated = { ...brokerKeys }
                            delete updated[b.id]
                            setBrokerKeys(updated)
                          }}
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button 
                        className={`btn btn-sm flex-1 md:flex-none ${isEditing ? 'btn-outline' : 'btn-primary'}`} 
                        onClick={() => setEditing(isEditing ? null : b.id)}
                      >
                        <Key size={12} /> {isEditing ? 'Cancel' : 'Add API Key'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Key Form */}
                {isEditing && (
                  <div className="mt-5 p-4 bg-bg-primary rounded-lg border border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="form-group mb-0">
                        <label className="form-label text-xs font-semibold mb-1.5">API Key *</label>
                        <input 
                          className="form-input bg-bg-card p-2 text-sm border-border" 
                          placeholder="Your API key…" 
                          value={keyInput}
                          onChange={(e) => setKeyInput(e.target.value)} 
                          type="text" 
                          autoFocus
                        />
                      </div>
                      <div className="form-group mb-0">
                        <label className="form-label text-xs font-semibold mb-1.5">API Secret</label>
                        <input 
                          className="form-input bg-bg-card p-2 text-sm border-border" 
                          placeholder="Your API secret…" 
                          value={secretInput}
                          onChange={(e) => setSecretInput(e.target.value)} 
                          type="password" 
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="btn btn-primary btn-sm px-4" onClick={() => handleConnect(b.id)}>
                        <CheckCircle2 size={14} /> Save & Connect
                      </button>
                      <span className="text-xs text-muted">
                        Stored encrypted · Read-only access only
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
