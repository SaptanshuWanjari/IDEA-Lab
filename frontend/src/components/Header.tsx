import { useState, useRef, useEffect } from 'react'
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  ChevronDown,
  User,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { useApp } from '../App'

const SUB: Record<string, string> = {
  Dashboard: 'Command Desk · Q3 compliance cycle · All departments',
  Regulations: 'RBI circulars ledger · Intake to MAP extraction',
  'Regulation Detail': 'Circular folio · Obligations, owners and evidence',
  'Digital Twin': 'Scenario estimates · Workload and timeline model',
  'MAP Tasks': 'Measurable Action Points · Owners and due dates',
  'MAP Review': 'Maker–checker queue · Approve, return or reject',
  Evidence: 'Evidence vault · Traceability per MAP',
  Reports: 'Audit packages · RBI-ready export',
  Users: 'Officers and roles · Access control',
  Settings: 'Account, organisation & preferences · Access control',
  Login: 'Secure sign in',
}

function today(): string {
  try {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function Header({
  title,
  onPaletteOpen,
  sidebarCollapsed,
  onToggleSidebar,
  onLogout,
}: {
  title: string
  onPaletteOpen?: () => void
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
  onLogout?: () => void
}) {
  const { user, navigate, logout: ctxLogout } = useApp()
  const handleLogout = onLogout ?? ctxLogout

  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setNotifOpen(false)
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const userEmail = user?.email || 'admin@pravah.in'
  const userRole = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Administrator'

  const displayName = (() => {
    if (!user?.email) return 'PravahOS Admin'
    const prefix = user.email.split('@')[0]
    if (prefix.toLowerCase() === 'admin') return 'PravahOS Admin'
    return prefix.charAt(0).toUpperCase() + prefix.slice(1)
  })()

  const userInitials = (() => {
    if (!user?.email) return 'PA'
    const prefix = user.email.split('@')[0]
    if (prefix.toLowerCase() === 'admin') return 'PA'
    return prefix.slice(0, 2).toUpperCase()
  })()

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-3.5 bg-white/95 backdrop-blur-md border-b border-[#E2EAF2] sticky top-0 z-40">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
            className="w-8.5 h-8.5 rounded-lg flex items-center justify-center bg-transparent border border-[#E2EAF2] text-slate-500 hover:text-[#102A43] hover:bg-[#F1F5F9] transition-colors shrink-0 cursor-pointer"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        <div className="min-w-0">
          <div className="text-xs text-slate-400 mb-0.5 font-medium">{today()}</div>
          <h1 className="text-2xl font-bold text-[#102A43] tracking-tight m-0 leading-tight">
            {title}
          </h1>
          <p className="text-xs text-slate-500 m-0 whitespace-nowrap overflow-hidden text-ellipsis">
            {SUB[title] ?? 'Bank compliance operations'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Search command bar */}
        <button
          onClick={onPaletteOpen}
          className="hidden sm:flex items-center gap-2 w-64 md:w-72 h-9 px-3 bg-[#F1F5F9] border border-[#E2EAF2] hover:border-slate-300 rounded-lg text-slate-400 text-left transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="text-[13px] flex-1 text-slate-500">Search circulars, MAPs</span>
          <kbd className="text-[10px] bg-white border border-[#E2EAF2] rounded px-1.5 py-0.5 text-slate-500 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Notifications toggle */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => {
              setNotifOpen(v => !v)
              setProfileOpen(false)
            }}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className={`p-2 rounded-lg relative transition-colors cursor-pointer ${
              notifOpen
                ? 'bg-[#F1F5F9] text-[#102A43]'
                : 'text-slate-500 hover:text-[#102A43] hover:bg-[#F1F5F9]'
            }`}
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-[#E2EAF2] p-4 shadow-xl z-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#102A43]">Notifications</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  3 new
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  {
                    t: 'MAP overdue — IT infrastructure changes',
                    m: 'Escalation Level 1 · 2h ago',
                    dot: 'bg-red-500',
                  },
                  {
                    t: 'Evidence batch requires review — 18 files',
                    m: 'Evidence vault · 4h ago',
                    dot: 'bg-amber-500',
                  },
                  {
                    t: 'Circular uploaded — Credit Risk Management',
                    m: 'Regulations · 6h ago',
                    dot: 'bg-[#0D9488]',
                  },
                ].map((n, i) => (
                  <div key={i} className="flex gap-2.5 py-2.5 first:pt-2 last:pb-0">
                    <span className={`w-2 h-2 rounded-full ${n.dot} mt-1.5 shrink-0`} />
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-[#102A43] leading-snug">
                        {n.t}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{n.m}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile menu */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen(v => !v)
              setNotifOpen(false)
            }}
            aria-label="Officer Profile & Settings"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className={`flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl border transition-all cursor-pointer text-left select-none ${
              profileOpen
                ? 'bg-[#F1F5F9] border-[#CBD5E1] shadow-xs'
                : 'border-transparent hover:bg-[#F1F5F9] hover:border-[#E2EAF2]'
            }`}
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0D9488] to-[#0B7E73] text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                {userInitials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-[#102A43] leading-tight">
                {displayName}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                {userRole}
              </div>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                profileOpen ? 'rotate-180 text-[#0D9488]' : 'text-slate-400'
              }`}
            />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-[#E2EAF2] shadow-2xl p-2 z-50 text-left transition-all animate-in fade-in slide-in-from-top-1 duration-150"
            >
              {/* User Identity Card */}
              <div className="p-3 bg-gradient-to-br from-slate-50 to-[#F0FDFA] rounded-xl border border-[#E2EAF2] mb-1.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0D9488] to-[#0B7E73] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs ring-2 ring-white">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-[#102A43] truncate">
                      {displayName}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                      {userEmail}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-[#0D9488]/10 text-[#0D9488]">
                    <Shield className="w-3 h-3" />
                    {userRole}
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Session
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-0.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false)
                    navigate('settings', 'Profile')
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[#F1F5F9] transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-[#0D9488]/10 text-slate-500 group-hover:text-[#0D9488] flex items-center justify-center shrink-0 transition-colors">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-[#102A43] group-hover:text-[#0D9488] leading-tight">
                      Account Profile
                    </div>
                    <div className="text-[10.5px] text-slate-500 leading-tight mt-0.5">
                      Identity & officer contact info
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false)
                    navigate('settings', 'Security')
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[#F1F5F9] transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-[#0D9488]/10 text-slate-500 group-hover:text-[#0D9488] flex items-center justify-center shrink-0 transition-colors">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-[#102A43] group-hover:text-[#0D9488] leading-tight">
                      Security & MFA
                    </div>
                    <div className="text-[10.5px] text-slate-500 leading-tight mt-0.5">
                      Credentials, 2FA & active devices
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false)
                    navigate('settings', 'Notifications')
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[#F1F5F9] transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-[#0D9488]/10 text-slate-500 group-hover:text-[#0D9488] flex items-center justify-center shrink-0 transition-colors">
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-[#102A43] group-hover:text-[#0D9488] leading-tight">
                      System Preferences
                    </div>
                    <div className="text-[10.5px] text-slate-500 leading-tight mt-0.5">
                      Notifications & compliance alerts
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                </button>

                {onPaletteOpen && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false)
                      onPaletteOpen()
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[#F1F5F9] transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-[#0D9488]/10 text-slate-500 group-hover:text-[#0D9488] flex items-center justify-center shrink-0 transition-colors">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium text-[#102A43] leading-tight">
                        Quick Command Search
                      </div>
                      <div className="text-[10.5px] text-slate-500 leading-tight mt-0.5">
                        Keyboard shortcut lookup
                      </div>
                    </div>
                    <kbd className="text-[10px] bg-white border border-[#E2EAF2] rounded px-1.5 py-0.5 text-slate-500 font-mono">
                      ⌘K
                    </kbd>
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="my-1.5 h-[1px] bg-[#E2EAF2]" />

              {/* Logout Action */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false)
                  handleLogout?.()
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left text-red-600 hover:text-red-700 hover:bg-red-50/80 transition-colors cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-red-100/70 group-hover:bg-red-100 flex items-center justify-center shrink-0 text-red-600 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold leading-tight">
                    Sign Out
                  </div>
                  <div className="text-[10.5px] text-red-500/80 leading-tight mt-0.5">
                    End active session & return to login
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

