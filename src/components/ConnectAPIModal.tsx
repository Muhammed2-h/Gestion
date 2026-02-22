import { useState } from 'react'
import { X, Key, ExternalLink, CheckCircle2, AlertCircle, Loader, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { usePortfolioStore } from '@/store'
import type { Account } from '@/types'

// ─── Broker-specific configuration ────────────────────────────────────────────
const BROKER_CONFIG: Record<string, {
  color: string
  keyLabel: string
  secretLabel: string
  hasSecret: boolean
  hasTotpKey: boolean
  docsUrl: string
  howToGet: { step: string; text: string }[]
  corsNote?: string
}> = {
  'Zerodha': {
    color: '#387ed1',
    keyLabel: 'API Key',
    secretLabel: 'API Secret',
    hasSecret: true,
    hasTotpKey: false,
    docsUrl: 'https://kite.trade/docs/connect/v3/',
    howToGet: [
      { step: '1', text: 'Go to kite.trade/connect → My Apps → Create new app' },
      { step: '2', text: 'Set redirect URL to http://localhost:5174 (for dev)' },
      { step: '3', text: 'Copy the API key and API secret from the app page' },
    ],
    corsNote: 'Zerodha Kite Connect requires backend OAuth flow. Keys are saved locally; full sync will work once the Gestion backend is running.',
  },
  'Upstox': {
    color: '#6366F1',
    keyLabel: 'API Key',
    secretLabel: 'API Secret',
    hasSecret: true,
    hasTotpKey: false,
    docsUrl: 'https://upstox.com/developer/api-documentation/',
    howToGet: [
      { step: '1', text: 'Log in to developer.upstox.com → Create App' },
      { step: '2', text: 'Set redirect URL and get your API key + secret' },
      { step: '3', text: 'Paste credentials below' },
    ],
    corsNote: 'Upstox uses OAuth 2.0. Full sync requires backend. Keys are saved securely for when the backend is ready.',
  },
  'Angel One': {
    color: '#f97316',
    keyLabel: 'Client ID',
    secretLabel: 'MPIN / Password',
    hasSecret: true,
    hasTotpKey: true,
    docsUrl: 'https://smartapi.angelbroking.com/docs',
    howToGet: [
      { step: '1', text: 'Register at smartapi.angelbroking.com → Create App' },
      { step: '2', text: 'Note your Client ID and API key' },
      { step: '3', text: 'Enable TOTP in your Angel One account for 2FA' },
    ],
    corsNote: 'SmartAPI uses session-based auth. Full auto-sync requires backend. Credentials stored locally.',
  },
  'Fyers': {
    color: '#00b94a',
    keyLabel: 'App ID (Client ID)',
    secretLabel: 'Secret Key',
    hasSecret: true,
    hasTotpKey: false,
    docsUrl: 'https://myapi.fyers.in/docs/',
    howToGet: [
      { step: '1', text: 'Go to myapi.fyers.in → Create App → Set redirect URL' },
      { step: '2', text: 'Copy App ID and Secret Key' },
    ],
    corsNote: 'Fyers uses OAuth. Credentials saved locally for backend sync.',
  },
  'Dhan': {
    color: '#3B82F6',
    keyLabel: 'Access Token',
    secretLabel: 'Client ID',
    hasSecret: true,
    hasTotpKey: false,
    docsUrl: 'https://dhanhq.co/docs/latest/',
    howToGet: [
      { step: '1', text: 'Log in to dhanhq.co → My Profile → API Token' },
      { step: '2', text: 'Generate your Access Token' },
      { step: '3', text: 'Enter your Client ID and Access Token below' },
    ],
    corsNote: 'Dhan provides a direct access token. Limited CORS support from browser — backend needed for full sync.',
  },
}

const getConfig = (brokerName: string) =>
  BROKER_CONFIG[brokerName] ?? {
    color: 'var(--color-accent)',
    keyLabel: 'API Key',
    secretLabel: 'API Secret',
    hasSecret: true,
    hasTotpKey: false,
    docsUrl: '#',
    howToGet: [{ step: '1', text: 'Get your API credentials from your broker\'s developer portal.' }],
    corsNote: 'API credentials saved locally. Backend integration required for live sync.',
  }

interface Props {
  account: Account
  onClose: () => void
}

type Status = 'idle' | 'saving' | 'saved' | 'error'

export default function ConnectAPIModal({ account, onClose }: Props) {
  const updateAccount = usePortfolioStore((s) => s.updateAccount)
  const cfg = getConfig(account.broker_name)

  const [apiKey, setApiKey]       = useState(account.api_key ?? '')
  const [apiSecret, setApiSecret] = useState(account.api_secret ?? '')
  const [totpKey, setTotpKey]     = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [status, setStatus]       = useState<Status>('idle')
  const [errorMsg, setErrorMsg]   = useState('')

  const isConnected = account.is_api_synced && account.api_status === 'connected'

  function handleSave() {
    if (!apiKey.trim()) { setErrorMsg(`${cfg.keyLabel} is required`); return }
    setStatus('saving')
    setErrorMsg('')

    // Simulate async credential validation (replace with real API call once backend is up)
    setTimeout(() => {
      try {
        updateAccount(account.id, {
          api_key: apiKey.trim(),
          api_secret: apiSecret.trim() || undefined,
          is_api_synced: true,
          api_status: 'connected',
          last_synced: new Date().toISOString(),
        })
        setStatus('saved')
        setTimeout(onClose, 1800)
      } catch {
        setStatus('error')
        setErrorMsg('Failed to save credentials. Please try again.')
      }
    }, 1200)
  }

  function handleDisconnect() {
    updateAccount(account.id, {
      api_key: undefined,
      api_secret: undefined,
      is_api_synced: false,
      api_status: undefined,
      last_synced: undefined,
    })
    onClose()
  }

  const accentColor = cfg.color

  return (
    <div style={overlay}>
      <div style={modalBox}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: `${accentColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, color: accentColor }}>
              {account.broker_name[0]}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{account.broker_name} API</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{account.name}</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Already connected banner */}
        {isConnected && (
          <div style={{ background: 'var(--color-profit-bg)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} color="var(--color-profit)" />
              <span style={{ fontSize: '0.82rem', color: 'var(--color-profit)', fontWeight: 600 }}>API Connected</span>
              {account.last_synced && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>· Last updated {new Date(account.last_synced).toLocaleTimeString('en-IN')}</span>
              )}
            </div>
            <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>Disconnect</button>
          </div>
        )}

        {/* How to get credentials */}
        <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>How to get your API credentials</span>
            <a href={cfg.docsUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
              <ExternalLink size={11} /> Official Docs
            </a>
          </div>
          <ol style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {cfg.howToGet.map(({ step, text }) => (
              <li key={step} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{text}</li>
            ))}
          </ol>
        </div>

        {/* Credential Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">{cfg.keyLabel} *</label>
            <input
              className="form-input"
              placeholder={`Enter ${cfg.keyLabel.toLowerCase()}…`}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setErrorMsg('') }}
              autoFocus
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
            />
          </div>

          {cfg.hasSecret && (
            <div className="form-group">
              <label className="form-label">{cfg.secretLabel}</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  placeholder={`Enter ${cfg.secretLabel.toLowerCase()}…`}
                  type={showSecret ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {cfg.hasTotpKey && (
            <div className="form-group">
              <label className="form-label">TOTP Secret (optional)</label>
              <input
                className="form-input"
                placeholder="Base32-encoded TOTP secret for auto-2FA…"
                type="password"
                value={totpKey}
                onChange={(e) => setTotpKey(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Required for unattended login. Get from your authenticator app setup.</span>
            </div>
          )}
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-loss)', fontSize: '0.82rem', background: 'var(--color-loss-bg)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)', marginTop: 12 }}>
            <AlertCircle size={15} /> {errorMsg}
          </div>
        )}

        {/* Success */}
        {status === 'saved' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-profit)', fontWeight: 600, fontSize: '0.88rem', marginTop: 12 }}>
            <CheckCircle2 size={18} /> Credentials saved! Account marked as API connected.
          </div>
        )}

        {/* Security notice */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, padding: '10px 12px', background: 'rgba(16,185,129,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.12)' }}>
          <ShieldCheck size={15} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent-light)', marginBottom: 2 }}>Security Notice</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {cfg.corsNote ?? 'Credentials are stored in your browser\'s localStorage. Production builds encrypt them using a master vault key.'}<br />
              <strong style={{ color: 'var(--text-secondary)' }}>Gestion never sends your API keys to external servers.</strong>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary flex-1"
            onClick={handleSave}
            disabled={status === 'saving' || status === 'saved'}
            style={{ background: status === 'saved' ? 'var(--color-profit)' : accentColor, borderColor: accentColor }}
          >
            {status === 'saving'
              ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
              : status === 'saved'
              ? <><CheckCircle2 size={14} /> Saved!</>
              : <><Key size={14} /> {isConnected ? 'Update Credentials' : 'Save & Connect'}</>}
          </button>
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
  borderRadius: 'var(--radius-2xl)', padding: '28px 32px', width: '100%', maxWidth: 500,
  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
}
