import type { Page } from '../App'
import {
  LayoutGrid,
  FileText,
  CheckSquare,
  Paperclip,
  BarChart3,
  Users,
  Settings,
  Shield,
} from 'lucide-react'

interface NavItem {
  id: Page
  label: string
  title?: string
  group: 'main' | 'admin'
  icon: React.ReactNode
}

const ICON = {
  dashboard: <LayoutGrid className="w-4.5 h-4.5" strokeWidth={1.8} />,
  regulations: <FileText className="w-4.5 h-4.5" strokeWidth={1.8} />,
  maps: <CheckSquare className="w-4.5 h-4.5" strokeWidth={1.8} />,
  evidence: <Paperclip className="w-4.5 h-4.5" strokeWidth={1.8} />,
  reports: <BarChart3 className="w-4.5 h-4.5" strokeWidth={1.8} />,
  users: <Users className="w-4.5 h-4.5" strokeWidth={1.8} />,
  settings: <Settings className="w-4.5 h-4.5" strokeWidth={1.8} />,
}

const nav: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', title: 'Dashboard', group: 'main', icon: ICON.dashboard },
  { id: 'regulations', label: 'Regulations', title: 'Regulations', group: 'main', icon: ICON.regulations },
  { id: 'map-tasks', label: 'MAPs', title: 'MAP Tasks', group: 'main', icon: ICON.maps },
  { id: 'evidence', label: 'Evidence', title: 'Evidence', group: 'main', icon: ICON.evidence },
  { id: 'reports', label: 'Reports', title: 'Reports', group: 'main', icon: ICON.reports },
  { id: 'users', label: 'Users', title: 'Users', group: 'admin', icon: ICON.users },
  { id: 'settings', label: 'Settings', title: 'Settings', group: 'admin', icon: ICON.settings },
]

export default function Sidebar({
  currentPage,
  onNavigate,
  collapsed = false,
}: {
  currentPage: Page
  onNavigate: (p: Page) => void
  onLogout: () => void
  onPalette?: () => void
  collapsed?: boolean
}) {
  const mainItems = nav.filter(n => n.group === 'main')
  const adminItems = nav.filter(n => n.group === 'admin')

  return (
    <aside
      className={`pv-rail bg-white border-r border-[#E2EAF2] ${collapsed ? 'is-collapsed' : ''}`}
      aria-label="Primary navigation"
    >
      {/* Brand header */}
      <div className={`flex items-center gap-2.5 overflow-hidden transition-all duration-300 ${
        collapsed ? 'p-3.5 justify-center' : 'px-4 py-3.5'
      }`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0D9488] to-[#0B7E73] text-white flex items-center justify-center shrink-0 shadow-sm">
          <Shield className="w-4.5 h-4.5" />
        </div>
        <span className="pv-sidebar-label text-[17px] font-bold text-[#102A43] tracking-tight">
          PravahOS
        </span>
      </div>

      {/* Nav navigation items */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden transition-all duration-300 ${
        collapsed ? 'px-1.5 py-1' : 'px-2.5 py-1'
      }`}>
        {mainItems.map(item => {
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              className={`pv-nav-item ${collapsed ? 'is-collapsed' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              title={item.title || item.label}
            >
              <span className="pv-nav-icon">{item.icon}</span>
              <span className="pv-sidebar-label">{item.label}</span>
            </button>
          )
        })}

        {/* Divider */}
        <div className={`h-[1px] bg-[#E2EAF2] transition-all duration-300 ${
          collapsed ? 'my-2.5 mx-1' : 'my-3 mx-1'
        }`} />

        {adminItems.map(item => {
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              className={`pv-nav-item ${collapsed ? 'is-collapsed' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              title={item.title || item.label}
            >
              <span className="pv-nav-icon">{item.icon}</span>
              <span className="pv-sidebar-label">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
