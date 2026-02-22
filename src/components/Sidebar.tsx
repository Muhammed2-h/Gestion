import { NavLink, useLocation } from 'react-router-dom'
import { X, LayoutDashboard, Briefcase, TrendingUp, ArrowLeftRight,
  PieChart, Settings, Wallet, Target, Zap, Cpu, Eye } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { label: 'Dashboard',    path: '/',             icon: LayoutDashboard, section: 'OVERVIEW'   },
  { label: 'Holdings',     path: '/holdings',     icon: Briefcase,       section: 'OVERVIEW'   },
  { label: 'Transactions', path: '/transactions', icon: ArrowLeftRight,  section: 'ACTIVITY'   },
  { label: 'Accounts',     path: '/accounts',     icon: Wallet,          section: 'ACTIVITY'   },
  { label: 'Analytics',    path: '/analytics',    icon: TrendingUp,      section: 'INSIGHTS'   },
  { label: 'Sector View',  path: '/sector',       icon: PieChart,        section: 'INSIGHTS'   },
  { label: 'Watchlist',    path: '/watchlist',    icon: Eye,             section: 'INSIGHTS'   },
  { label: 'Goals',        path: '/goals',        icon: Target,          section: 'INSIGHTS'   },
  { label: 'Algo Trading', path: '/algo',         icon: Cpu,             section: 'AUTOMATION' },
  { label: 'Integrations', path: '/integrations', icon: Zap,             section: 'SYSTEM'     },
  { label: 'Settings',     path: '/settings',     icon: Settings,        section: 'SYSTEM'     },
]

const sections = ['OVERVIEW', 'ACTIVITY', 'INSIGHTS', 'AUTOMATION', 'SYSTEM']

export default function Sidebar({ isOpen, onClose }: Props) {
  const location = useLocation()

  return (
    <aside className={`app-sidebar${isOpen ? ' open' : ''}`}>
      {/* Logo row + mobile close button */}
      <div className="sidebar-logo" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="sidebar-logo-mark">G</div>
          <div>
            <div className="sidebar-logo-text">Ges<span>tion</span></div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: '1px' }}>
              PORTFOLIO INTELLIGENCE
            </div>
          </div>
        </div>
        {/* Close button – only visible when sidebar is drawer (mobile) */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={onClose}
          title="Close menu"
          aria-label="Close sidebar"
          style={{ display: isOpen ? 'flex' : 'none' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {sections.map((section) => {
          const items = navItems.filter((i) => i.section === section)
          return (
            <div key={section}>
              <div className="nav-section-label">{section}</div>
              {items.map(({ label, path, icon: Icon }) => {
                const isActive = path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(path)
                return (
                  <NavLink
                    key={path}
                    to={path}
                    className={`nav-item${isActive ? ' active' : ''}`}
                    onClick={onClose}
                  >
                    <Icon className="nav-icon" size={18} />
                    {label}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--color-profit)',
            boxShadow: '0 0 6px var(--color-accent)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Market Live · NSE/BSE
          </span>
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          Gestion v0.1.0 · Offline First
        </div>
      </div>
    </aside>
  )
}
