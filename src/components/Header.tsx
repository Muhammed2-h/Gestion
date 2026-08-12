import { RefreshCw, Bell, Search, TrendingUp, TrendingDown, Menu, Sun, Moon } from 'lucide-react'
import { useState } from 'react'
import { usePortfolioStore, useSettingsStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatPct } from '@/lib/utils'
import UserProfileModal from '@/components/UserProfileModal'

interface Props {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: Props) {
  const summary           = usePortfolioStore((s) => s.summary)
  const refreshMarketData = usePortfolioStore((s) => s.refreshMarketData)
  const settings          = useSettingsStore((s) => s.settings)
  const updateSettings    = useSettingsStore((s) => s.updateSettings)
  const user              = useAuthStore((s) => s.user)
  const [showProfile,   setShowProfile]   = useState(false)
  const [isRefreshing,  setIsRefreshing]  = useState(false)

  const isProfit = summary.day_pnl >= 0
  const hasData  = summary.current_value > 0

  return (
    <header className="app-header">
      {/* ── Hamburger (mobile only) ───────────────────────────────── */}
      <button
        className="mobile-menu-btn"
        onClick={onMenuClick}
        aria-label="Open menu"
        title="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* ── Search ───────────────────────────────────────────────── */}
      <div className="header-search">
        <Search size={15} color="var(--text-muted)" />
        <input
          placeholder="Search symbols…"
          className="header-search-input"
        />
      </div>

      {/* ── Day P&L Ticker ───────────────────────────────────────── */}
      {hasData && (
        <div className={`header-ticker ${isProfit ? 'profit' : 'loss'}`}>
          {isProfit ? <TrendingUp size={15} color="var(--color-profit)" /> : <TrendingDown size={15} color="var(--color-loss)" />}
          <span className={`header-ticker-text ${isProfit ? 'profit' : 'loss'}`}>
            Today: {formatCurrency(summary.day_pnl, true)} ({formatPct(summary.day_pnl_pct)})
          </span>
        </div>
      )}

      {/* ── Portfolio value ──────────────────────────────────────── */}
      {hasData && (
        <div className="header-portfolio-value">
          <span className="header-portfolio-amount">
            {formatCurrency(summary.current_value, true)}
          </span>
          <span className="header-portfolio-label">Portfolio</span>
        </div>
      )}

      <div className="flex-1" />

      {/* ── Actions ──────────────────────────────────────────────── */}
      <button
        className="btn btn-ghost btn-icon text-muted"
        data-tooltip="Refresh Market Data"
        data-tooltip-pos="bottom"
        data-tooltip-align="right"
        aria-label="Refresh Market Data"
        onClick={async () => {
          setIsRefreshing(true)
          try { await refreshMarketData() } finally { setIsRefreshing(false) }
        }}
        disabled={isRefreshing}
      >
        <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
      </button>

      <button 
        className="btn btn-ghost btn-icon text-muted" 
        data-tooltip="Notifications" 
        data-tooltip-pos="bottom"
        data-tooltip-align="right"
        aria-label="Notifications" 
      >
        <Bell size={17} />
      </button>

      <button 
        className="btn btn-ghost btn-icon text-muted" 
        data-tooltip="Toggle Theme" 
        data-tooltip-pos="bottom"
        data-tooltip-align="right"
        aria-label="Toggle Theme" 
        onClick={() => updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })}
      >
        {settings.theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
      </button>

      <div
        className="header-avatar"
        onClick={() => setShowProfile(true)}
        role="button"
        aria-label="User profile"
        title="User profile"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setShowProfile(true)}
      >
        {user?.name?.[0]?.toUpperCase() || 'G'}
      </div>

      {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} />}
    </header>
  )
}

