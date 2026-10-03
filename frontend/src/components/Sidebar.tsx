import type { Page } from '../App'

interface NavItem { id: Page; label: string; section: string; icon: React.ReactNode }

const ICON = {
  dashboard: (<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>),
  regulations: (<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>),
  twin: (<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>),
  tasks: (<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>),
  evidence: (<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>),
  reports: (<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>),
  users: (<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  settings: (<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>),
}

const nav: NavItem[] = [
  { id: 'dashboard', label: 'Command Desk', section: 'Oversight', icon: ICON.dashboard },
  { id: 'regulations', label: 'Circulars', section: 'Oversight', icon: ICON.regulations },
  { id: 'digital-twin', label: 'Digital Twin', section: 'Oversight', icon: ICON.twin },
  { id: 'map-tasks', label: 'MAP Tasks', section: 'Execution', icon: ICON.tasks },
  { id: 'evidence', label: 'Evidence', section: 'Execution', icon: ICON.evidence },
  { id: 'reports', label: 'Audit Reports', section: 'Execution', icon: ICON.reports },
  { id: 'users', label: 'Officers', section: 'Administration', icon: ICON.users },
  { id: 'settings', label: 'Controls', section: 'Administration', icon: ICON.settings },
]

export default function Sidebar({ currentPage, onNavigate, onLogout }: {
  currentPage: Page; onNavigate: (p: Page) => void; onLogout: () => void; onPalette?: () => void
}) {
  let lastSection = ''
  return (
    <aside className="pv-rail" style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 248,
      background: 'linear-gradient(180deg, #0C1B2D 0%, #0A1626 100%)',
      color: '#D8DEE6', display: 'flex', flexDirection: 'column', zIndex: 60,
      borderRight: '1px solid #1D2F44',
    }}>
      {/* crest */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(160deg, #D9BC6B, #9A7B2E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 19, color: '#0C1B2D',
          }}>P</div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: '#F6F1E2', lineHeight: 1 }}>PravahOS</div>
            <div className="pv-mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: '#9AA7B8', marginTop: 4 }}>RBI COMPLIANCE DESK</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <span className="pv-mono" style={{ fontSize: 9.5, letterSpacing: '0.1em', color: '#D9BC6B', border: '1px solid rgba(217,188,107,0.4)', borderRadius: 999, padding: '3px 9px' }}>● PILOT LIVE</span>
          <span className="pv-mono" style={{ fontSize: 9.5, letterSpacing: '0.1em', color: '#9AA7B8', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '3px 9px' }}>Q3 CYCLE</span>
        </div>
      </div>

      {/* nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }} aria-label="Primary">
        {nav.map((item) => {
          const showHead = item.section !== lastSection
          lastSection = item.section
          const active = currentPage === item.id
          return (
            <div key={item.id}>
              {showHead && (
                <div className="pv-mono" style={{ fontSize: 9.5, letterSpacing: '0.16em', color: '#6E7D90', padding: '12px 10px 6px' }}>
                  {item.section.toUpperCase()}
                </div>
              )}
              <button
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 11,
                  padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(217,188,107,0.13)' : 'transparent',
                  color: active ? '#F6F1E2' : '#AEB9C6',
                  fontSize: 13.5, fontWeight: active ? 600 : 500, fontFamily: 'Inter',
                  boxShadow: active ? 'inset 2px 0 0 #D9BC6B' : 'none',
                  transition: 'background 0.13s, color 0.13s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ color: active ? '#D9BC6B' : '#7C8A9C', display: 'flex' }}>{item.icon}</span>
                {item.label}
              </button>
            </div>
          )
        })}
      </nav>

      {/* officer footer */}
      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#D9BC6B', color: '#0C1B2D', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>AK</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#F6F1E2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Aisha Khan</div>
            <div className="pv-mono" style={{ fontSize: 9, letterSpacing: '0.08em', color: '#8A97A8' }}>COMPLIANCE OFFICER</div>
          </div>
          <button onClick={onLogout} title="Sign out" style={{ background: 'none', border: 'none', color: '#8A97A8', cursor: 'pointer', padding: 4 }} aria-label="Sign out">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
