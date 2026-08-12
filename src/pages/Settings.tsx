import { useState } from 'react'
import { Save, Download, Trash2, Shield, Settings2, Globe } from 'lucide-react'
import { useSettingsStore } from '@/store'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'

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
    <div className="app-content animate-fade-in flex flex-col h-full overflow-auto">
      <PageHeader 
        title={
          <span className="flex items-center gap-3">
            <Settings2 size={24} className="text-accent" />
            Settings
          </span>
        }
        subtitle="Configure your Gestion environment"
        actions={
          <button 
            className={`btn px-5 font-bold transition-all duration-300 ${saved ? 'bg-profit text-white border-profit' : 'btn-primary'}`} 
            onClick={handleSave}
          >
            <Save size={16} /> {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        }
      />

      <div className="flex flex-col gap-6 max-w-2xl pb-10">
        {/* General */}
        <Card className="flex flex-col">
          <h3 className="font-bold flex items-center gap-2 mb-5">
            <Globe size={18} className="text-primary" /> General
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="form-group mb-0">
              <label className="form-label text-xs font-semibold mb-2">Base Currency</label>
              <select 
                className="form-select bg-bg-primary border-border text-sm p-2.5" 
                value={local.base_currency}
                onChange={(e) => setLocal({ ...local, base_currency: e.target.value })}
              >
                <option value="INR">INR – Indian Rupee (₹)</option>
                <option value="USD">USD – US Dollar ($)</option>
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-xs font-semibold mb-2">Date Format</label>
              <select 
                className="form-select bg-bg-primary border-border text-sm p-2.5" 
                value={local.date_format}
                onChange={(e) => setLocal({ ...local, date_format: e.target.value })}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Data Source */}
        <Card className="flex flex-col">
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <Globe size={18} className="text-primary" /> Primary Market Data Source
          </h3>
          <div className="flex flex-col gap-3">
            {[
              { id: 'YAHOO',        label: 'Yahoo Finance',       note: 'Free · NSE & BSE · EOD data' },
              { id: 'NSE_BSE',      label: 'NSE/BSE Bhavcopy',    note: 'Free · Official exchange data' },
              { id: 'AMFI',         label: 'AMFI India (MF NAV)', note: 'Free · Mutual funds only' },
              { id: 'ALPHAVANTAGE', label: 'Alpha Vantage',       note: '25 req/day free tier' },
              { id: 'MANUAL',       label: 'Manual Only',         note: 'No auto-fetch' },
            ].map((ds) => (
              <label 
                key={ds.id} 
                className={`flex items-center gap-4 p-4 rounded-lg border transition-fast cursor-pointer ${
                  local.data_source === ds.id 
                    ? 'border-accent bg-accent-dim' 
                    : 'border-border bg-bg-primary hover:border-border-light'
                }`}
              >
                <input 
                  type="radio" 
                  name="data_source" 
                  value={ds.id} 
                  checked={local.data_source === ds.id}
                  onChange={() => setLocal({ ...local, data_source: ds.id })}
                  className="w-4 h-4 accent-accent" 
                />
                <div>
                  <div className={`font-bold text-sm ${local.data_source === ds.id ? 'text-accent-light' : 'text-primary'}`}>
                    {ds.label}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{ds.note}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        {/* Privacy */}
        <Card className="flex flex-col">
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <Shield size={18} className="text-primary" /> Privacy & Data
          </h3>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Enable telemetry', note: 'Share anonymous usage statistics to improve Gestion', defaultChecked: false },
              { label: 'Encrypt local database', note: 'Requires master password on startup', defaultChecked: true },
            ].map(({ label, note, defaultChecked }) => (
              <div 
                key={label} 
                className="flex items-center justify-between p-4 bg-bg-primary border border-border rounded-lg"
              >
                <div>
                  <div className="font-bold text-sm text-primary">{label}</div>
                  <div className="text-xs text-muted mt-0.5">{note}</div>
                </div>
                <input 
                  type="checkbox" 
                  defaultChecked={defaultChecked} 
                  className="w-5 h-5 accent-accent cursor-pointer rounded" 
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Backup */}
        <Card className="flex flex-col border-warning bg-warning/5">
          <h3 className="font-bold flex items-center gap-2 mb-4 text-warning">
            Backup & Export
          </h3>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-outline bg-bg-card font-semibold text-sm">
              <Download size={14} /> Export Full Backup
            </button>
            <button className="btn btn-outline bg-bg-card font-semibold text-sm">
              <Download size={14} /> Export Holdings CSV
            </button>
            <button className="btn btn-danger font-semibold text-sm ml-auto bg-loss text-white border-transparent">
              <Trash2 size={14} /> Reset All Data
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
