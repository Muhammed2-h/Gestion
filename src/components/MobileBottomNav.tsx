import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Eye, PieChart, Settings } from 'lucide-react'

// Show only top 5 most-used pages in the bottom nav
const BOTTOM_NAV = [
  { label: 'Dashboard', path: '/',           icon: LayoutDashboard },
  { label: 'Holdings',  path: '/holdings',   icon: Briefcase       },
  { label: 'Watchlist', path: '/watchlist',  icon: Eye             },
  { label: 'Sectors',   path: '/sector',     icon: PieChart        },
  { label: 'Settings',  path: '/settings',   icon: Settings        },
]

export default function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {BOTTOM_NAV.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
          end={path === '/'}
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
