import { useState } from 'react'

interface HeaderProps {
  title: string
  onPaletteOpen?: () => void
}

export default function Header({ title, onPaletteOpen }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <header
      className="flex items-center justify-between px-7 py-4 flex-shrink-0"
      style={{
        borderBottom: '1px solid #E8E8E3',
        background: 'rgba(248,247,242,0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.6px', margin: 0, fontFamily: 'Inter' }}>
          {title}
        </h1>
        <p style={{ fontSize: 11, color: '#AAAAAA', margin: 0, fontFamily: 'Inter', marginTop: 1 }}>
          Monday, 04 August 2026 · Q3 Compliance Cycle
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Search / command */}
        <button
          onClick={onPaletteOpen}
          className="flex items-center gap-2 px-3"
          style={{
            height: 36,
            background: '#FFFFFF',
            border: '1px solid #E8E8E3',
            borderRadius: 10,
            width: 230,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#3B82F6'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#E8E8E3'}
        >
          <svg width="13" height="13" fill="none" stroke="#888880" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span style={{ fontSize: 12, color: '#AAAAAA', fontFamily: 'Inter', flex: 1, textAlign: 'left' }}>Search everything...</span>
          <span style={{ fontSize: 10, color: '#CCCCCC', fontFamily: 'Geist Mono, monospace', background: '#F5F5F0', padding: '1px 5px', borderRadius: 4, border: '1px solid #E8E8E3' }}>⌘K</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
            className="flex items-center justify-center relative"
            style={{ width: 36, height: 36, background: '#FFFFFF', border: '1px solid #E8E8E3', borderRadius: 10, cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#3B82F6'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#E8E8E3'}
          >
            <svg width="15" height="15" fill="none" stroke="#0A0A0A" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, background: '#3B82F6', borderRadius: '50%', border: '1.5px solid #F8F7F2' }} />
          </button>

          {notifOpen && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 320, background: '#FFFFFF', border: '1px solid #E8E8E3', borderRadius: 18, boxShadow: '0 12px 40px rgba(0,0,0,0.14)', padding: 16, zIndex: 100 }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: 'Inter' }}>Notifications</span>
                <span style={{ fontSize: 10, color: '#888880', background: '#F0F0EA', padding: '2px 7px', borderRadius: 10, fontFamily: 'Inter' }}>3 new</span>
              </div>
              {[
                { title: 'RBI/2026-27/45 requires immediate action', time: '2h ago', dot: '#3B82F6' },
                { title: 'MAP #1234 overdue — IT Department', time: '4h ago', dot: '#FF6B6B' },
                { title: 'Evidence batch upload completed (18 files)', time: '6h ago', dot: '#4CAF50' },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5" style={{ borderTop: i > 0 ? '1px solid #F5F5F0' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.dot, flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <p style={{ fontSize: 12, color: '#0A0A0A', margin: 0, lineHeight: 1.4, fontFamily: 'Inter' }}>{n.title}</p>
                    <p style={{ fontSize: 10, color: '#AAAAAA', margin: 0, marginTop: 2, fontFamily: 'Inter' }}>{n.time}</p>
                  </div>
                </div>
              ))}
              <button style={{ width: '100%', marginTop: 8, padding: '8px', background: '#F5F5F0', border: 'none', borderRadius: 10, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter', color: '#888880' }}>
                View all notifications
              </button>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
            className="flex items-center gap-2.5"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{ width: 34, height: 34, background: '#3B82F6', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#111', fontFamily: 'Inter' }}>
              AK
            </div>
            <div className="text-left">
              <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>Aisha Khan</p>
              <span style={{ fontSize: 9, color: '#888880', fontFamily: 'Inter', background: '#F0F0EA', padding: '1px 5px', borderRadius: 4, display: 'inline-block', marginTop: 1 }}>
                Compliance Officer
              </span>
            </div>
            <svg width="11" height="11" fill="none" stroke="#AAAAAA" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {profileOpen && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 200, background: '#FFFFFF', border: '1px solid #E8E8E3', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.14)', padding: 6, zIndex: 100 }}>
              {['Profile Settings', 'Team Management', 'Audit Log'].map(item => (
                <button
                  key={item}
                  style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#0A0A0A', textAlign: 'left', fontFamily: 'Inter', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8F7F2'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {item}
                </button>
              ))}
              <div style={{ borderTop: '1px solid #F0F0EA', marginTop: 4, paddingTop: 4 }}>
                <button
                  style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#FF6B6B', textAlign: 'left', fontFamily: 'Inter', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FFF3F0'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
