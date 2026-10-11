import type { Page } from '../App'
import logo from '../logo.svg'
import {
  LayoutGrid,
  FileText,
  CheckSquare,
  Paperclip,
  BarChart3,
  Users,
  Settings,
  Network,
  LogOut,
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
  twin: <Network className="w-4.5 h-4.5" strokeWidth={1.8} />,
  evidence: <Paperclip className="w-4.5 h-4.5" strokeWidth={1.8} />,
  reports: <BarChart3 className="w-4.5 h-4.5" strokeWidth={1.8} />,
  users: <Users className="w-4.5 h-4.5" strokeWidth={1.8} />,
  settings: <Settings className="w-4.5 h-4.5" strokeWidth={1.8} />,
}

const nav: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', title: 'Dashboard', group: 'main', icon: ICON.dashboard },
  { id: 'regulations', label: 'Regulations', title: 'Regulations', group: 'main', icon: ICON.regulations },
  { id: 'map-tasks', label: 'MAPs', title: 'MAP Tasks', group: 'main', icon: ICON.maps },
  { id: 'digital-twin', label: 'Digital Twin', title: 'Digital Twin & Dependencies', group: 'main', icon: ICON.twin },
  { id: 'evidence', label: 'Evidence', title: 'Evidence', group: 'main', icon: ICON.evidence },
  { id: 'reports', label: 'Reports', title: 'Reports', group: 'main', icon: ICON.reports },
  { id: 'users', label: 'Users', title: 'Users', group: 'admin', icon: ICON.users },
  { id: 'settings', label: 'Settings', title: 'Settings', group: 'admin', icon: ICON.settings },
]

export default function Sidebar({
  currentPage,
  onNavigate,
  onLogout,
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
        <img
          src={logo}
          alt="PravahOS"
          className="w-8 h-8 rounded-lg object-contain shrink-0 shadow-xs"
        />
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

      {/* Sidebar Sign Out Footer */}
      <div className={`border-t border-[#E2EAF2] ${collapsed ? 'p-1.5' : 'p-2'}`}>
        <button
          onClick={onLogout}
          className={`pv-nav-item text-slate-500 hover:text-red-600 hover:bg-red-50/70 transition-colors w-full ${
            collapsed ? 'is-collapsed justify-center' : ''
          }`}
          title="Sign out (terminate session)"
        >
          <span className="pv-nav-icon text-slate-400 group-hover:text-red-600">
            <LogOut className="w-4.5 h-4.5" strokeWidth={1.8} />
          </span>
          <span className="pv-sidebar-label">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
