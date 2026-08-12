import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { useSettingsStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import Auth from '@/pages/Auth'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import MobileBottomNav from '@/components/MobileBottomNav'
import Dashboard from '@/pages/Dashboard'
import Holdings from '@/pages/Holdings'
import Transactions from '@/pages/Transactions'
import Accounts from '@/pages/Accounts'
import Analytics from '@/pages/Analytics'
import SectorView from '@/pages/SectorView'
import Goals from '@/pages/Goals'
import AlgoTrading from '@/pages/AlgoTrading'
import TradingTerminal from '@/pages/TradingTerminal'
import Integrations from '@/pages/Integrations'
import Settings from '@/pages/Settings'
import Watchlist from '@/pages/Watchlist'

function NotFound() {
  return (
    <div className="app-content not-found-container">
      <div className="not-found-code">404</div>
      <h2>Page not found</h2>
      <a href="/" className="btn btn-primary">← Back to Dashboard</a>
    </div>
  )
}

export default function App() {
  const settings  = useSettingsStore((s) => s.settings)
  const user      = useAuthStore((s) => s.user)
  const navigate  = useNavigate()
  const location  = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change (mobile UX)
  useEffect(() => { 
    if (sidebarOpen) setSidebarOpen(false) 
  }, [location.pathname, sidebarOpen])

  // Close sidebar on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark')
  }, [settings.theme])

  // OAuth redirect handler
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (location.pathname === '/' && (params.has('code') || params.has('request_token'))) {
      const pendingSyncId = sessionStorage.getItem('sync_oauth_account_id')
      if (pendingSyncId) navigate('/accounts' + location.search, { replace: true })
    }
  }, [location, navigate])

  const toggleSidebar = useCallback(() => setSidebarOpen(o => !o), [])
  const closeSidebar  = useCallback(() => setSidebarOpen(false), [])

  if (!user) {
    return <Auth />
  }

  return (
    <div className="app-shell">
      {/* Off-canvas backdrop (mobile only) */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="app-main">
        <Header onMenuClick={toggleSidebar} />
        <Routes>
          <Route path="/"             element={<Dashboard />} />
          <Route path="/holdings"     element={<Holdings />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/accounts"     element={<Accounts />} />
          <Route path="/analytics"    element={<Analytics />} />
          <Route path="/sector"       element={<SectorView />} />
          <Route path="/goals"        element={<Goals />} />
          <Route path="/algo"         element={<AlgoTrading />} />
          <Route path="/trading"      element={<TradingTerminal />} />
          <Route path="/watchlist"    element={<Watchlist />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/settings"     element={<Settings />} />
          <Route path="*"             element={<NotFound />} />
        </Routes>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileBottomNav />
    </div>
  )
}
