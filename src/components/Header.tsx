import { RefreshCw, Bell, Search, TrendingUp, TrendingDown, Menu } from 'lucide-react'
import { useState } from 'react'
import { usePortfolioStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatPct } from '@/lib/utils'
import UserProfileModal from '@/components/UserProfileModal'

interface Props {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: Props) {
  const summary           = usePortfolioStore((s) => s.summary)
  const refreshMarketData = usePortfolioStore((s) => s.refreshMarketData)
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
      <div
        className="header-search"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 12px', flex: 1, maxWidth: 300 }}
      >
        <Search size={15} color="var(--text-muted)" />
        <input
          placeholder="Search symbols…"
          style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', width: '100%' }}
        />
      </div>

      {/* ── Day P&L Ticker ───────────────────────────────────────── */}
      {hasData && (
        <div
          className="header-ticker"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', background: isProfit ? 'var(--color-profit-bg)' : 'var(--color-loss-bg)', border: `1px solid ${isProfit ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 'var(--radius-md)', padding: '6px 14px' }}
        >
          {isProfit ? <TrendingUp size={15} color="var(--color-profit)" /> : <TrendingDown size={15} color="var(--color-loss)" />}
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isProfit ? 'var(--color-profit)' : 'var(--color-loss)' }}>
            Today: {formatCurrency(summary.day_pnl, true)} ({formatPct(summary.day_pnl_pct)})
          </span>
        </div>
      )}

      {/* ── Portfolio value ──────────────────────────────────────── */}
      {hasData && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'var(--color-accent-dim)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.2)', flexShrink: 0 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-accent-light)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
            {formatCurrency(summary.current_value, true)}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Portfolio</span>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* ── Actions ──────────────────────────────────────────────── */}
      <button
        className="btn btn-ghost btn-icon"
        data-tooltip="Refresh Market Data"
        title="Refresh Market Data"
        style={{ color: 'var(--text-muted)' }}
        onClick={async () => {
          setIsRefreshing(true)
          try { await refreshMarketData() } finally { setIsRefreshing(false) }
        }}
        disabled={isRefreshing}
      >
        <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
      </button>

      <button className="btn btn-ghost btn-icon" data-tooltip="Notifications" title="Notifications" style={{ color: 'var(--text-muted)' }}>
        <Bell size={17} />
      </button>

      <div
        style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: 'white', cursor: 'pointer', flexShrink: 0 }}
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
