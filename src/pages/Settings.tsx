import { useState } from 'react'
import { Save } from 'lucide-react'
import { useSettingsStore } from '@/store'

export default function Settings() {
  const { settings, updateSettings } = useSettingsStore()
  const [local, setLocal] = useState(settings)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    updateSettings(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="app-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your Gestion environment</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={15} /> {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
        {/* General */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>General</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Base Currency</label>
              <select className="form-select" value={local.base_currency}
                onChange={(e) => setLocal({ ...local, base_currency: e.target.value })}>
                <option value="INR">INR – Indian Rupee (₹)</option>
                <option value="USD">USD – US Dollar ($)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date Format</label>
              <select className="form-select" value={local.date_format}
                onChange={(e) => setLocal({ ...local, date_format: e.target.value })}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Source */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Primary Market Data Source</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'YAHOO',        label: 'Yahoo Finance',       note: 'Free · NSE & BSE · EOD data' },
              { id: 'NSE_BSE',      label: 'NSE/BSE Bhavcopy',    note: 'Free · Official exchange data' },
              { id: 'AMFI',         label: 'AMFI India (MF NAV)', note: 'Free · Mutual funds only' },
              { id: 'ALPHAVANTAGE', label: 'Alpha Vantage',        note: '25 req/day free tier' },
              { id: 'MANUAL',       label: 'Manual Only',          note: 'No auto-fetch' },
            ].map((ds) => (
              <label key={ds.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 'var(--radius-md)',
                border: `1px solid ${local.data_source === ds.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: local.data_source === ds.id ? 'var(--color-accent-dim)' : 'var(--color-bg-primary)',
                cursor: 'pointer', transition: 'all var(--transition-fast)',
              }}>
                <input type="radio" name="data_source" value={ds.id} checked={local.data_source === ds.id}
                  onChange={() => setLocal({ ...local, data_source: ds.id })}
                  style={{ accentColor: 'var(--color-accent)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: local.data_source === ds.id ? 'var(--color-accent-light)' : 'var(--text-primary)' }}>
                    {ds.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ds.note}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Privacy & Data</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Enable telemetry', note: 'Share anonymous usage statistics to improve Gestion', defaultChecked: false },
              { label: 'Encrypt local database', note: 'Requires master password on startup', defaultChecked: true },
            ].map(({ label, note, defaultChecked }) => (
              <div key={label} className="flex items-center justify-between" style={{
                padding: '12px 14px', background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{note}</div>
                </div>
                <input type="checkbox" defaultChecked={defaultChecked} style={{ width: 18, height: 18, accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Backup */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Backup & Export</h3>
          <div className="flex gap-3 flex-wrap">
            <button className="btn btn-outline">📦 Export Full Backup (.json)</button>
            <button className="btn btn-outline">📊 Export Holdings CSV</button>
            <button className="btn btn-danger">🗑️ Reset All Data</button>
          </div>
        </div>
      </div>
    </div>
  )
}
