import { useState } from 'react'
import { api } from '../lib/api'
import type { UserOut } from '../lib/types'

interface LoginPageProps {
  onLogin: (user: UserOut) => void
}

function FeatureIcon({ path }: { path: string }) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d={path} />
    </svg>
  )
}

const features = [
  {
    path: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    text: 'Real-time RBI circular tracking',
  },
  {
    path: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    text: 'AI-driven compliance prediction',
  },
  {
    path: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    text: 'One-click RBI audit package generation',
  },
]

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Please enter your email address.'); return }
    if (!password) { setError('Please enter your password.'); return }
    setError('')
    setLoading(true)
    try {
      const user = await api.post<UserOut>('/auth/login', { email, password })
      onLogin(user)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="grid-bg"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      <div style={{ position: 'absolute', top: '10%', left: '18%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '12%', right: '14%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', gap: 72, alignItems: 'center', maxWidth: 980, width: '100%', padding: '0 40px' }}>

        {/* Brand panel */}
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-3 mb-10">
            <div style={{ width: 44, height: 44, background: '#3B82F6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#111', fontFamily: 'Inter' }}>P</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', fontFamily: 'Inter', letterSpacing: '-0.5px' }}>PravahOS</span>
          </div>

          <h1 style={{ fontSize: 44, fontWeight: 800, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-2px', lineHeight: 1.08 }}>
            AI-Powered<br />
            <span style={{ color: '#BBBBBB' }}>Banking</span><br />
            Compliance
          </h1>
          <p style={{ fontSize: 15, color: '#888880', marginTop: 18, fontFamily: 'Inter', lineHeight: 1.65, maxWidth: 340 }}>
            Streamline RBI regulation management, MAP tracking, and audit preparation — all in one intelligent platform.
          </p>

          <div className="flex flex-col gap-3 mt-8">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div style={{ width: 32, height: 32, background: '#FFFFFF', border: '1px solid #E8E8E3', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444440', flexShrink: 0 }}>
                  <FeatureIcon path={f.path} />
                </div>
                <span style={{ fontSize: 13, color: '#444440', fontFamily: 'Inter' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E3', borderRadius: 28, padding: 36, width: 400, flexShrink: 0, boxShadow: '0 8px 48px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.4px' }}>Welcome back</h2>
          <p style={{ fontSize: 13, color: '#888880', margin: '4px 0 28px', fontFamily: 'Inter' }}>Sign in to your PravahOS account</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#444440', display: 'block', marginBottom: 6, fontFamily: 'Inter' }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="aisha.khan@bankname.com"
                style={{ width: '100%', height: 42, border: `1px solid ${error && !email ? '#E53935' : '#E8E8E3'}`, borderRadius: 10, padding: '0 14px', fontSize: 13, color: '#0A0A0A', fontFamily: 'Inter', outline: 'none', background: '#FAFAF8', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                onBlur={e => e.currentTarget.style.borderColor = error && !email ? '#E53935' : '#E8E8E3'}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label style={{ fontSize: 12, fontWeight: 500, color: '#444440', fontFamily: 'Inter' }}>Password</label>
                <button type="button" style={{ fontSize: 11, color: '#888880', fontFamily: 'Inter', background: 'none', border: 'none', cursor: 'pointer' }}>Forgot password?</button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••••"
                  style={{ width: '100%', height: 42, border: `1px solid ${error && !password ? '#E53935' : '#E8E8E3'}`, borderRadius: 10, padding: '0 42px 0 14px', fontSize: 13, color: '#0A0A0A', fontFamily: 'Inter', outline: 'none', background: '#FAFAF8', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                  onBlur={e => e.currentTarget.style.borderColor = error && !password ? '#E53935' : '#E8E8E3'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888880', padding: 0 }}>
                  {showPass
                    ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FFF3F0', border: '1px solid #FFD7D7', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ fontSize: 12, color: '#C13B2A', margin: 0, fontFamily: 'Inter' }}>{error}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" style={{ accentColor: '#3B82F6', width: 14, height: 14, cursor: 'pointer' }} />
              <label htmlFor="remember" style={{ fontSize: 12, color: '#444440', fontFamily: 'Inter', cursor: 'pointer' }}>Remember me for 30 days</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ height: 44, background: '#111111', color: '#3B82F6', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter', transition: 'opacity 0.15s', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading
                ? <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(59,130,246,0.3)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                      </path>
                    </svg>
                    Signing in...
                  </>
                : 'Sign In to PravahOS'
              }
            </button>
          </form>



        </div>
      </div>
    </div>
  )
}
