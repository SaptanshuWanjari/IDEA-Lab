import { useState } from 'react'

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
  Settings: 'Controls · Retention, calibration and policy',
  Login: 'Secure sign in',
}

function today(): string {
  try {
    return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '' }
}

export default function Header({ title, onPaletteOpen }: { title: string; onPaletteOpen?: () => void }) {
  const [notifOpen, setNotifOpen] = useState(false)
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '14px 28px', background: 'rgba(244,243,239,0.9)',
      backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      <div style={{ minWidth: 0 }}>
        <div className="pv-mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--brass)' }}>
          PRAVAHOS § {today().toUpperCase()}
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 23, fontWeight: 600, margin: '2px 0 0', letterSpacing: '-0.01em' }}>{title}</h1>
        <p style={{ fontSize: 12, color: 'var(--slate)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {SUB[title] ?? 'Bank compliance operations'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onPaletteOpen} className="pv-input" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 250, cursor: 'pointer', color: 'var(--faint)' }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <span style={{ fontSize: 12.5, flex: 1, textAlign: 'left' }}>Search circulars, MAPs…</span>
          <kbd className="pv-mono" style={{ fontSize: 10, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 5, padding: '1px 6px' }}>⌘K</kbd>
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notifications"
            className="pv-btn-ghost" style={{ padding: 8, position: 'relative' }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--brass)', border: '1.5px solid var(--paper)' }} />
          </button>
          {notifOpen && (
            <div className="pv-card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 330, padding: 16, zIndex: 100, boxShadow: 'var(--shadow-pop)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Exceptions register</span>
                <span className="pv-chip pv-chip--brass">3 open</span>
              </div>
              {[
                { t: 'RBI/2026-27/45 — owner confirmation pending', m: 'Risk · 2h ago', tone: 'var(--brass)' },
                { t: 'MAP overdue — IT Department', m: 'Escalation Level 1 · 4h ago', tone: 'var(--scarlet)' },
                { t: 'Evidence batch verified — 18 files', m: 'Vault · 6h ago', tone: 'var(--emerald)' },
              ].map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.tone, marginTop: 5, flexShrink: 0 }} />
                  <div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{n.t}</div><div style={{ fontSize: 11, color: 'var(--slate)' }}>{n.m}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="pv-btn-primary" onClick={onPaletteOpen} style={{ height: 38 }}>New action</button>
      </div>
    </header>
  )
}
