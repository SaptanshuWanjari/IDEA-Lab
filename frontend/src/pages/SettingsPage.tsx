import { useState } from 'react'
import { useApp } from '../App'
import { Card, SectionHead } from '../components/ui'

const tabs = ['Profile', 'Notifications', 'Security', 'Integrations', 'Team']

export default function SettingsPage() {
  const { toast, user } = useApp()
  const [activeTab, setActiveTab] = useState('Profile')
  const [name, setName] = useState(user?.email?.split('@')[0] ?? 'User')
  const [email, setEmail] = useState(user?.email ?? '')
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSlack, setNotifSlack] = useState(false)
  const [notifOverdue, setNotifOverdue] = useState(true)
  const [notifUpload, setNotifUpload] = useState(true)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'inline-flex', gap: 2, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: 3, marginBottom: 16, alignSelf: 'flex-start' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="pv-segtab" data-active={activeTab === tab}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card>
            <SectionHead eyebrow="§ Officer record" title="Personal information" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, background: 'var(--ink)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 800, color: 'var(--brass-bright)' }}>
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{name}</p>
                <p className="pv-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--faint)', margin: '2px 0 0' }}>{(user?.role ?? 'OFFICER').toUpperCase()}</p>
              </div>
            </div>
            {[
              { label: 'Full name', value: name, setter: setName },
              { label: 'Work email', value: email, setter: setEmail },
            ].map(field => (
              <div key={field.label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>{field.label}</label>
                <input value={field.value} onChange={e => field.setter(e.target.value)} className="pv-input" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Role</label>
              <select className="pv-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                <option>Compliance Officer</option>
                <option>Risk Manager</option>
                <option>Audit Lead</option>
                <option>Viewer</option>
              </select>
            </div>
            <button onClick={() => toast('success', 'Changes saved', 'Your profile has been updated.')} className="pv-btn-primary">
              Save changes
            </button>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <SectionHead eyebrow="§ Institution" title="Organisation" />
              {[
                { label: 'Bank', value: 'Pravah Private Bank Ltd.' },
                { label: 'RBI licence', value: 'BANK-RBI-2019-0042' },
                { label: 'Compliance cycle', value: 'Q3 2026' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <span style={{ fontSize: 12, color: 'var(--slate)' }}>{item.label}</span>
                  <span className="pv-mono" style={{ fontSize: 12, fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </Card>

            <Card>
              <SectionHead eyebrow="§ Irreversible" title="Danger zone" sub="Account actions requiring admin countersign." />
              {showDeactivateConfirm ? (
                <div>
                  <p style={{ fontSize: 12.5, color: 'var(--scarlet)', margin: '0 0 10px', fontWeight: 600 }}>Confirm deactivation — this cannot be undone.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { toast('warning', 'Deactivation requested', 'Submitted for admin review.'); setShowDeactivateConfirm(false) }}
                      className="pv-btn-ghost" style={{ color: '#fff', background: 'var(--scarlet)', borderColor: 'var(--scarlet)', fontWeight: 700 }}>Confirm</button>
                    <button onClick={() => setShowDeactivateConfirm(false)} className="pv-btn-ghost">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowDeactivateConfirm(true)} className="pv-btn-ghost" style={{ color: 'var(--scarlet)', borderColor: '#EFC4BE' }}>
                  Deactivate account
                </button>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'Notifications' && (
        <Card style={{ maxWidth: 600 }}>
          <SectionHead eyebrow="§ Alerts" title="Notification preferences" sub="Control how the desk reaches you." />
          {[
            { label: 'Email notifications', desc: 'Compliance alerts via work email', val: notifEmail, set: setNotifEmail },
            { label: 'Slack integration', desc: 'Push MAP updates to your workspace', val: notifSlack, set: setNotifSlack },
            { label: 'Overdue MAP alerts', desc: 'Escalate when a MAP passes its due date', val: notifOverdue, set: setNotifOverdue },
            { label: 'Evidence upload notifications', desc: 'Notify on new filings in your folios', val: notifUpload, set: setNotifUpload },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: 11.5, color: 'var(--slate)', margin: '2px 0 0' }}>{item.desc}</p>
              </div>
              <button onClick={() => item.set(!item.val)} role="switch" aria-checked={item.val} aria-label={item.label}
                style={{ width: 42, height: 23, borderRadius: 12, border: 'none', cursor: 'pointer', background: item.val ? 'var(--ink)' : '#D8D5CC', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: item.val ? 22 : 3, width: 17, height: 17, borderRadius: '50%', background: item.val ? 'var(--brass-bright)' : '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.2s' }} />
              </button>
            </div>
          ))}
        </Card>
      )}

      {(activeTab === 'Security' || activeTab === 'Integrations' || activeTab === 'Team') && (
        <Card style={{ padding: 48, textAlign: 'center' }}>
          <div className="pv-mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--brass)' }}>§ {activeTab.toUpperCase()}</div>
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, margin: '8px 0 4px' }}>Controlled release</p>
          <p style={{ fontSize: 13, color: 'var(--slate)', margin: 0 }}>Available after pilot sign-off — contact your administrator.</p>
        </Card>
      )}
    </div>
  )
}
