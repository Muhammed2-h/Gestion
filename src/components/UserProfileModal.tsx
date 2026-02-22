import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Moon, Sun, Download, Upload, Trash2, User, Mail, ShieldAlert, LogOut } from 'lucide-react'
import { useSettingsStore, usePortfolioStore } from '@/store'
import { useAuthStore } from '@/store/authStore'

interface Props {
  onClose: () => void
}

export default function UserProfileModal({ onClose }: Props) {
  const { settings, updateSettings } = useSettingsStore()
  const { accounts, transactions, holdings } = usePortfolioStore()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [showConfirmWipe, setShowConfirmWipe] = useState(false)

  // ─── Theme Toggle ──────────────────────────────────────────────────────────
  function toggleTheme() {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark'
    updateSettings({ theme: newTheme })
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  // ─── Data Backup & Restore ─────────────────────────────────────────────────
  function handleBackup() {
    const data = {
      version: 1,
      exported_at: new Date().toISOString(),
      portfolio: { accounts, transactions, holdings },
      settings: settings,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gestion-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (!json.portfolio) throw new Error("Invalid backup file")
        
        // Restore portfolio
        usePortfolioStore.setState({
          accounts: json.portfolio.accounts || [],
          transactions: json.portfolio.transactions || [],
          holdings: json.portfolio.holdings || [],
        })
        usePortfolioStore.getState()._recompute()
        
        // Restore settings
        if (json.settings) {
          useSettingsStore.setState({ settings: json.settings })
          document.documentElement.setAttribute('data-theme', json.settings.theme || 'dark')
        }

        alert("Data restored successfully!")
        onClose()
      } catch (err) {
        alert("Failed to restore data. The file might be corrupted.")
        console.error(err)
      }
    }
    reader.readAsText(file)
  }

  // ─── Wipe Data ─────────────────────────────────────────────────────────────
  function handleWipe() {
    localStorage.removeItem('gestion-portfolio')
    localStorage.removeItem('gestion-settings')
    localStorage.removeItem('gestion-goals')
    window.location.reload()
  }

  const modalContent = (
    <div style={overlay}>
      <div style={modalBox} className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 style={{ margin: 0 }}>User Profile</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* User Info */}
        <div style={sectionBox} className="flex items-center gap-4 mb-4">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase() || 'G'}
          </div>
          <div className="flex-1">
            <h2 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{user?.name || 'Gestion User'}</h2>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Mail size={14} /> {user?.email || 'local-first@gestion.app'}
            </div>
            <div className="flex items-center gap-2 mt-1" style={{ color: 'var(--color-accent)', fontSize: '0.75rem', fontWeight: 600 }}>
              <User size={12} /> Local Storage Profile
            </div>
          </div>
          <div>
            <button 
              className="btn btn-outline" 
              style={{ color: 'var(--color-loss)', borderColor: 'rgba(239,68,68,0.2)', padding: '8px' }}
              onClick={() => { logout(); onClose(); }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div style={sectionBox} className="mb-4">
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preferences</div>
          
          <div className="flex items-center justify-between py-3 border-b border-[var(--color-border-light)]">
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Theme</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Switch between Dark and Light mode</div>
            </div>
            <button className="btn btn-outline" onClick={toggleTheme}>
              {settings.theme === 'dark' ? <><Sun size={14} /> Light Mode</> : <><Moon size={14} /> Dark Mode</>}
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Base Currency</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Currently fixed to INR (₹)</div>
            </div>
            <span className="badge badge-info">INR</span>
          </div>
        </div>

        {/* Data Management */}
        <div style={sectionBox} className="mb-4">
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data Management</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Your data is stored locally in your browser. Backup your data regularly to prevent accidental loss.
          </p>

          <div className="flex gap-3 mb-4">
            <button className="btn btn-outline flex-1" onClick={handleBackup}>
              <Download size={14} /> Export Backup
            </button>
            <button className="btn btn-outline flex-1" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> Restore Backup
            </button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleRestore} style={{ display: 'none' }} />
          </div>
        </div>

        {/* Danger Zone */}
        <div style={{ ...sectionBox, borderColor: 'rgba(239,68,68,0.2)', background: 'var(--color-loss-bg)' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--color-loss)', fontWeight: 600 }}>
            <ShieldAlert size={16} /> Danger Zone
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Permanently delete all accounts, transactions, and settings from this browser. This action cannot be undone unless you have a backup.
          </p>
          
          {showConfirmWipe ? (
            <div className="flex gap-2">
              <button className="btn btn-danger flex-1" onClick={handleWipe}>Yes, wipe all data</button>
              <button className="btn btn-outline flex-1" onClick={() => setShowConfirmWipe(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-outline" style={{ borderColor: 'var(--color-loss)', color: 'var(--color-loss)' }} onClick={() => setShowConfirmWipe(true)}>
              <Trash2 size={14} /> Factory Reset App
            </button>
          )}
        </div>

      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modalBox: React.CSSProperties = {
  background: 'var(--color-bg-card)', border: '1px solid var(--color-border-light)',
  borderRadius: 'var(--radius-xl)', padding: '24px 32px', width: '100%', maxWidth: 480,
  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
}
const sectionBox: React.CSSProperties = {
  background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)', padding: '16px',
}
