import { useState } from 'react'
import { useApp } from '../App'

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
    <div style={{ width: '100%' }}>
      {/* Tab nav */}
      <div className="flex items-center gap-1 mb-6 p-1" style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E8E8E3', display: 'inline-flex', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '7px 16px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'Inter',
              fontWeight: activeTab === tab ? 600 : 400,
              background: activeTab === tab ? '#111' : 'transparent',
              color: activeTab === tab ? '#3B82F6' : '#888880',
              transition: 'all 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card-hover" style={{ background: '#FFFFFF', borderRadius: 24, border: '1px solid #E8E8E3', padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', marginBottom: 24 }}>Personal Information</h3>
            <div className="flex items-center gap-4 mb-6">
              <div style={{ width: 64, height: 64, background: '#3B82F6', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#111', fontFamily: 'Inter' }}>
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>{name}</p>
                <p style={{ fontSize: 12, color: '#888880', margin: 0, fontFamily: 'Inter' }}>{user?.role ?? 'User'}</p>
                <button style={{ fontSize: 11, color: '#3B82F6', background: '#111', border: 'none', borderRadius: 6, padding: '3px 8px', marginTop: 6, cursor: 'pointer', fontFamily: 'Inter', fontWeight: 600 }}>
                  Change Avatar
                </button>
              </div>
            </div>
            {[
              { label: 'Full Name', value: name, setter: setName },
              { label: 'Email', value: email, setter: setEmail },
            ].map(field => (
              <div key={field.label} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#444440', display: 'block', marginBottom: 6, fontFamily: 'Inter' }}>{field.label}</label>
                <input
                  value={field.value}
                  onChange={e => field.setter(e.target.value)}
                  style={{ width: '100%', height: 40, border: '1px solid #E8E8E3', borderRadius: 10, padding: '0 14px', fontSize: 13, color: '#0A0A0A', fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box', background: '#FAFAF8', transition: 'border-color 0.15s' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                  onBlur={e => e.currentTarget.style.borderColor = '#E8E8E3'}
                />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#444440', display: 'block', marginBottom: 6, fontFamily: 'Inter' }}>Role</label>
              <select style={{ width: '100%', height: 40, border: '1px solid #E8E8E3', borderRadius: 10, padding: '0 14px', fontSize: 13, color: '#0A0A0A', fontFamily: 'Inter', outline: 'none', background: '#FAFAF8', boxSizing: 'border-box' }}>
                <option>Compliance Officer</option>
                <option>Risk Manager</option>
                <option>Audit Lead</option>
                <option>Viewer</option>
              </select>
            </div>
            <button onClick={() => toast('success', 'Changes saved', 'Your profile has been updated.')} style={{ padding: '10px 20px', background: '#111', color: '#3B82F6', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter', transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              Save Changes
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card-hover" style={{ background: '#FFFFFF', borderRadius: 24, border: '1px solid #E8E8E3', padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', marginBottom: 16 }}>Organization</h3>
              {[
                { label: 'Bank Name', value: 'Pravah Private Bank Ltd.' },
                { label: 'RBI License', value: 'BANK-RBI-2019-0042' },
                { label: 'Compliance Cycle', value: 'Q3 2026' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #F5F5F0' }}>
                  <span style={{ fontSize: 12, color: '#888880', fontFamily: 'Inter' }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: 'Inter' }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="card-hover" style={{ background: '#FAFAF8', borderRadius: 24, border: '1px solid #E8E8E3', padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', marginBottom: 4 }}>Danger Zone</h3>
              <p style={{ fontSize: 12, color: '#888880', margin: 0, marginBottom: 16, fontFamily: 'Inter' }}>Irreversible account actions</p>
              {showDeactivateConfirm ? (
                <div>
                  <p style={{ fontSize: 12, color: '#C13B2A', margin: 0, marginBottom: 8, fontFamily: 'Inter', fontWeight: 500 }}>Are you sure? This cannot be undone.</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { toast('warning', 'Account deactivation requested', 'Your request has been submitted for admin review.'); setShowDeactivateConfirm(false) }} style={{ padding: '7px 14px', background: '#C13B2A', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter', color: '#FFF' }}>Confirm</button>
                    <button onClick={() => setShowDeactivateConfirm(false)} style={{ padding: '7px 14px', background: '#F5F5F0', border: '1px solid #E8E8E3', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter', color: '#888880' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowDeactivateConfirm(true)} style={{ padding: '8px 16px', background: '#FFF3F0', border: '1px solid #FFD7D7', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter', color: '#C13B2A' }}>
                  Deactivate Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Notifications' && (
        <div className="card-hover" style={{ background: '#FFFFFF', borderRadius: 24, border: '1px solid #E8E8E3', padding: 28, maxWidth: 560, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', marginBottom: 24 }}>Notification Preferences</h3>
          {[
            { label: 'Email notifications', desc: 'Receive compliance alerts via email', val: notifEmail, set: setNotifEmail },
            { label: 'Slack integration', desc: 'Push MAP updates to your Slack workspace', val: notifSlack, set: setNotifSlack },
            { label: 'Overdue MAP alerts', desc: 'Alert when a MAP task passes its due date', val: notifOverdue, set: setNotifOverdue },
            { label: 'Evidence upload notifications', desc: 'Notify when new evidence is uploaded', val: notifUpload, set: setNotifUpload },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid #F5F5F0' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>{item.label}</p>
                <p style={{ fontSize: 11, color: '#888880', margin: 0, fontFamily: 'Inter' }}>{item.desc}</p>
              </div>
              <button
                onClick={() => item.set(!item.val)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  background: item.val ? '#3B82F6' : '#E8E8E3',
                  position: 'relative',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 3,
                  left: item.val ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: item.val ? '#111' : '#FFFFFF',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s, background 0.2s',
                }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {(activeTab === 'Security' || activeTab === 'Integrations' || activeTab === 'Team') && (
        <div className="card-hover" style={{ background: '#FFFFFF', borderRadius: 24, border: '1px solid #E8E8E3', padding: 48, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 48, height: 48, background: '#F5F5F0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="22" height="22" fill="none" stroke="#888880" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>{activeTab} Settings</p>
          <p style={{ fontSize: 13, color: '#888880', margin: 0, marginTop: 6, fontFamily: 'Inter' }}>Coming soon in the next release</p>
        </div>
      )}
    </div>
  )
}
