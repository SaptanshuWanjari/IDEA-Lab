import { useState } from 'react'
import { PanelLeftClose, PanelLeftOpen, Search, Bell, ChevronDown } from 'lucide-react'

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
}: {
  title: string
  onPaletteOpen?: () => void
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}) {
  const [notifOpen, setNotifOpen] = useState(false)

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
        <div className="relative">
          <button
            onClick={() => setNotifOpen(v => !v)}
            aria-label="Notifications"
            className="p-2 rounded-lg text-slate-500 hover:text-[#102A43] hover:bg-[#F1F5F9] relative transition-colors cursor-pointer"
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
        <div className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#F1F5F9] cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0D9488] to-[#0B7E73] text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs">
            PA
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-[#102A43] leading-tight">
              PravahOS Admin
            </div>
            <div className="text-[11px] text-slate-500 leading-tight">Administrator</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
    </header>
  )
}
