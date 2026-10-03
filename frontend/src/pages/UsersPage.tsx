import { useState } from 'react'
import { useApp } from '../App'
import { Card, SectionHead, StatusChip, StatCard, EmptyState } from '../components/ui'

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

const statusTone = (s: string): 'ok' | 'neutral' | 'warn' | 'bad' =>
  s === 'Active' ? 'ok' : s === 'Pending' ? 'warn' : s === 'Suspended' ? 'bad' : 'neutral'

function InviteModal({ onClose, onSent }: { onClose: () => void; onSent: (email: string) => void }) {
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,27,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pv-card" style={{ padding: 32, width: 460, maxWidth: '92vw', boxShadow: 'var(--shadow-pop)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="pv-mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--brass)' }}>§ NEW OFFICER</div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 15, color: 'var(--slate)' }}>×</button>
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, margin: '0 0 18px' }}>Invite officer</h2>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Invitation sent</p>
            <p style={{ fontSize: 12.5, color: 'var(--slate)', margin: '6px 0 0' }}>Invite issued to {email} — pending acceptance.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Work email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@pvtbank.com" className="pv-input" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Role</label>
              <select className="pv-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Department</label>
              <select className="pv-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                {['Compliance', 'IT', 'Risk', 'Operations', 'Legal', 'HR'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => { setSent(true); onSent(email); setTimeout(onClose, 2400) }} className="pv-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                Send invitation
              </button>
              <button onClick={onClose} className="pv-btn-ghost">Cancel</button>
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

  return (
    <>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSent={email => toast('success', 'Invitation sent', `Invite sent to ${email}`)} />}

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="pv-grid12" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16, marginBottom: 16 }}>
          <div className="pv-span3" style={{ gridColumn: 'span 3' }}><StatCard eyebrow="Officers" value={String(users.length)} caption="Registered members" /></div>
          <div className="pv-span3" style={{ gridColumn: 'span 3' }}><StatCard eyebrow="Active" value={String(users.filter(u => u.status === 'Active').length)} caption="Currently enabled" /></div>
          <div className="pv-span3" style={{ gridColumn: 'span 3' }}><StatCard eyebrow="Pending invites" value={String(users.filter(u => u.status === 'Pending').length)} caption="Awaiting acceptance" /></div>
          <div className="pv-span3" style={{ gridColumn: 'span 3' }}><StatCard eyebrow="Departments" value="6" caption="Covered functions" /></div>
        </div>

        <Card>
          <SectionHead
            eyebrow="§ Access control"
            title="Officers"
            sub="Maker–checker roles — reviewers cannot approve their own filings."
            right={
              <span style={{ display: 'flex', gap: 10 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search officers…" className="pv-input" style={{ width: 200 }} aria-label="Search users" />
                <button onClick={() => setShowInvite(true)} className="pv-btn-primary pv-btn-brass">+ Invite officer</button>
              </span>
            }
          />
          <table className="pv-table">
            <thead><tr>{['Officer', 'Role', 'Department', 'Status', 'Last Active', 'MAPs', ''].map(col => <th key={col}>{col}</th>)}</tr></thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, background: 'var(--ink)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--brass-bright)', flexShrink: 0 }}>
                        {user.avatar}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{user.name}</p>
                        <p className="pv-mono" style={{ fontSize: 10.5, color: 'var(--faint)', margin: 0 }}>{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--slate)' }}>{user.role}</td>
                  <td><span className="pv-chip">{user.dept}</span></td>
                  <td>{(() => { const s = userStatuses[user.id] || user.status; return <StatusChip tone={statusTone(s)}>{s}</StatusChip> })()}</td>
                  <td className="pv-mono" style={{ fontSize: 11.5, color: 'var(--slate)' }}>{user.lastActive}</td>
                  <td className="pv-mono" style={{ fontWeight: 600 }}>{user.mapsOwned}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => toast('info', 'Edit officer', `Opening editor for ${user.name}`)} className="pv-btn-ghost" style={{ padding: '4px 10px', fontSize: 11.5 }}>Edit</button>{' '}
                    {(userStatuses[user.id] || user.status) === 'Active' && (
                      <button onClick={() => { setUserStatuses(p => ({ ...p, [user.id]: 'Suspended' })); toast('warning', 'Officer suspended', `${user.name} has been suspended.`) }}
                        className="pv-btn-ghost" style={{ padding: '4px 10px', fontSize: 11.5, color: 'var(--scarlet)', borderColor: '#EFC4BE' }}>Suspend</button>
                    )}
                    {(userStatuses[user.id] || user.status) === 'Suspended' && (
                      <button onClick={() => { setUserStatuses(p => ({ ...p, [user.id]: 'Active' })); toast('success', 'Officer reinstated', `${user.name} has been reactivated.`) }}
                        className="pv-btn-ghost" style={{ padding: '4px 10px', fontSize: 11.5, color: 'var(--emerald)', borderColor: '#C4DFCF' }}>Reinstate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState title="No officers match" hint="Clear the search to list all members." />}
        </Card>
      </div>
    </>
  )
}
