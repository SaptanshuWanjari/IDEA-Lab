import { useState } from 'react'
import { useApp } from '../App'

const users = [
  { id: 'U-001', name: 'Aisha Khan', email: 'aisha.khan@pvtbank.com', role: 'Compliance Officer', dept: 'Compliance', status: 'Active', lastActive: '2m ago', mapsOwned: 12, avatar: 'AK' },
  { id: 'U-002', name: 'Vikram Rao', email: 'vikram.rao@pvtbank.com', role: 'IT Risk Manager', dept: 'IT', status: 'Active', lastActive: '1h ago', mapsOwned: 8, avatar: 'VR' },
  { id: 'U-003', name: 'Priya Sharma', email: 'priya.sharma@pvtbank.com', role: 'Operations Lead', dept: 'Operations', status: 'Active', lastActive: '3h ago', mapsOwned: 5, avatar: 'PS' },
  { id: 'U-004', name: 'Rahul Nair', email: 'rahul.nair@pvtbank.com', role: 'Risk Analyst', dept: 'Risk', status: 'Active', lastActive: '5h ago', mapsOwned: 11, avatar: 'RN' },
  { id: 'U-005', name: 'Meera Iyer', email: 'meera.iyer@pvtbank.com', role: 'Legal Counsel', dept: 'Legal', status: 'Inactive', lastActive: '2d ago', mapsOwned: 3, avatar: 'MI' },
  { id: 'U-006', name: 'Kiran Bhat', email: 'kiran.bhat@pvtbank.com', role: 'Compliance Analyst', dept: 'Compliance', status: 'Active', lastActive: '30m ago', mapsOwned: 4, avatar: 'KB' },
  { id: 'U-007', name: 'Anjali Desai', email: 'anjali.desai@pvtbank.com', role: 'Auditor', dept: 'Compliance', status: 'Pending', lastActive: 'Never', mapsOwned: 0, avatar: 'AD' },
]

const roles = ['Compliance Officer', 'IT Risk Manager', 'Operations Lead', 'Risk Analyst', 'Legal Counsel', 'Compliance Analyst', 'Auditor', 'Viewer']
const avatarColors = ['#8ad8ff', '#4CAF50', '#5C5CD6', '#F9A825', '#FF6B6B', '#00BCD4', '#9C27B0']

function InviteModal({ onClose, onSent }: { onClose: () => void; onSent: (email: string) => void }) {
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#FFFFFF', borderRadius: 28, padding: 36, width: 460, boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.4px' }}>Invite Team Member</h2>
          <button onClick={onClose} style={{ background: '#F5F5F0', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#888880' }}>×</button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 64, height: 64, background: '#F0F0FF', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" fill="none" stroke="#4040C0" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>Invitation sent!</p>
            <p style={{ fontSize: 12, color: '#888880', margin: 0, marginTop: 6, fontFamily: 'Inter' }}>We've sent an invite to {email}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#444440', display: 'block', marginBottom: 6, fontFamily: 'Inter' }}>Email address</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colleague@pvtbank.com"
                style={{ width: '100%', height: 40, border: '1px solid #E8E8E3', borderRadius: 10, padding: '0 14px', fontSize: 13, fontFamily: 'Inter', outline: 'none', background: '#FAFAF8', color: '#0A0A0A', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.currentTarget.style.borderColor = '#8ad8ff'}
                onBlur={e => e.currentTarget.style.borderColor = '#E8E8E3'}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#444440', display: 'block', marginBottom: 6, fontFamily: 'Inter' }}>Role</label>
              <select style={{ width: '100%', height: 40, border: '1px solid #E8E8E3', borderRadius: 10, padding: '0 14px', fontSize: 13, fontFamily: 'Inter', outline: 'none', background: '#FAFAF8', color: '#0A0A0A', boxSizing: 'border-box' }}>
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#444440', display: 'block', marginBottom: 6, fontFamily: 'Inter' }}>Department</label>
              <select style={{ width: '100%', height: 40, border: '1px solid #E8E8E3', borderRadius: 10, padding: '0 14px', fontSize: 13, fontFamily: 'Inter', outline: 'none', background: '#FAFAF8', color: '#0A0A0A', boxSizing: 'border-box' }}>
                {['Compliance', 'IT', 'Risk', 'Operations', 'Legal', 'HR'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => { setSent(true); onSent(email); setTimeout(onClose, 2400) }}
                style={{ flex: 1, height: 42, background: '#111', color: '#8ad8ff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter' }}
              >
                Send Invitation
              </button>
              <button onClick={onClose} style={{ padding: '0 20px', height: 42, background: '#F5F5F0', border: '1px solid #E8E8E3', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter', color: '#888880' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { toast } = useApp()
  const [showInvite, setShowInvite] = useState(false)
  const [search, setSearch] = useState('')
  const [userStatuses, setUserStatuses] = useState<Record<string, string>>({})

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.dept.toLowerCase().includes(search.toLowerCase())
  )

  const statusStyle: Record<string, { bg: string; text: string }> = {
    Active:   { bg: '#F0FFF0', text: '#2D8A4E' },
    Inactive: { bg: '#F5F5F0', text: '#888880' },
    Pending:  { bg: '#FFF8E1', text: '#C17B00' },
    Suspended:{ bg: '#FFF3F0', text: '#C13B2A' },
  }

  return (
    <>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSent={email => toast('success', 'Invitation sent', `Invite sent to ${email}`)} />}

      <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Members', value: users.length, color: '#8ad8ff' },
            { label: 'Active Now', value: users.filter(u => u.status === 'Active').length, color: '#4CAF50' },
            { label: 'Pending Invite', value: users.filter(u => u.status === 'Pending').length, color: '#F9A825' },
            { label: 'Departments', value: 6, color: '#5C5CD6' },
          ].map(s => (
            <div key={s.label} className="card-hover" style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid #E8E8E3', padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0, fontFamily: 'Inter', letterSpacing: '-1px' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: '#888880', margin: 0, marginTop: 2, fontFamily: 'Inter' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 px-3" style={{ height: 38, background: '#FFFFFF', border: '1px solid #E8E8E3', borderRadius: 10 }}>
            <svg width="13" height="13" fill="none" stroke="#888880" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." style={{ border: 'none', outline: 'none', fontSize: 12, background: 'transparent', fontFamily: 'Inter', width: 180, color: '#0A0A0A' }} />
          </div>
          <button
            onClick={() => setShowInvite(true)}
            style={{ padding: '9px 18px', background: '#8ad8ff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter', color: '#111', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Invite Member
          </button>
        </div>

        {/* Table */}
        <div style={{ background: '#FFFFFF', flex: 1, borderRadius: 26, border: '1px solid #E8E8E3', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E8E3' }}>
                {['Member', 'Role', 'Department', 'Status', 'Last Active', 'MAPs Owned', 'Actions'].map(col => (
                  <th key={col} style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#888880', padding: '12px 20px', fontFamily: 'Inter' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => {
                const avatarColor = avatarColors[i % avatarColors.length]
                return (
                  <tr key={user.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F5F5F0' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 36, height: 36, background: avatarColor, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: avatarColor === '#8ad8ff' ? '#111' : '#111', flexShrink: 0, fontFamily: 'Inter' }}>
                          {user.avatar}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>{user.name}</p>
                          <p style={{ fontSize: 11, color: '#888880', margin: 0, fontFamily: 'Inter' }}>{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 12, color: '#444440', fontFamily: 'Inter' }}>{user.role}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ background: '#F5F5F0', color: '#444440', fontSize: 11, padding: '3px 9px', borderRadius: 20, fontFamily: 'Inter' }}>{user.dept}</span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {(() => { const s = userStatuses[user.id] || user.status; const sc = statusStyle[s]; return (
                        <div className="flex items-center gap-1.5">
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: s === 'Active' ? '#4CAF50' : s === 'Pending' ? '#F9A825' : s === 'Suspended' ? '#E53935' : '#AAAAAA' }} />
                          <span style={{ fontSize: 12, color: sc?.text || '#888880', fontFamily: 'Inter', fontWeight: 500 }}>{s}</span>
                        </div>
                      )})()}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 11, color: '#888880', fontFamily: 'Inter' }}>{user.lastActive}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ background: '#F5F5F0', color: '#0A0A0A', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 8, fontFamily: 'Geist Mono, monospace' }}>{user.mapsOwned}</span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); toast('info', 'Edit user', `Opening editor for ${user.name}`) }}
                          style={{ padding: '4px 10px', background: '#F5F5F0', border: '1px solid #E8E8E3', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'Inter', color: '#0A0A0A', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#8ad8ff'; e.currentTarget.style.borderColor = '#111' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#F5F5F0'; e.currentTarget.style.color = '#0A0A0A'; e.currentTarget.style.borderColor = '#E8E8E3' }}
                        >Edit</button>
                        {(userStatuses[user.id] || user.status) === 'Active' && (
                          <button
                            onClick={e => { e.stopPropagation(); setUserStatuses(p => ({...p, [user.id]: 'Suspended'})); toast('warning', 'User suspended', `${user.name} has been suspended.`) }}
                            style={{ padding: '4px 10px', background: '#FFF3F0', border: '1px solid #FFD7D7', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'Inter', color: '#C13B2A' }}
                          >Suspend</button>
                        )}
                        {(userStatuses[user.id] || user.status) === 'Suspended' && (
                          <button
                            onClick={e => { e.stopPropagation(); setUserStatuses(p => ({...p, [user.id]: 'Active'})); toast('success', 'User reinstated', `${user.name} has been reactivated.`) }}
                            style={{ padding: '4px 10px', background: '#F0FFF0', border: '1px solid #C3E6CB', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'Inter', color: '#2D8A4E' }}
                          >Reinstate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
