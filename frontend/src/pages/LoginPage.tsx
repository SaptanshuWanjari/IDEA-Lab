import { useState } from 'react'
import { api } from '../lib/api'
import type { UserOut } from '../lib/types'

interface LoginPageProps {
  onLogin: (user: UserOut) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
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
    <>
      <style>{`
        * { box-sizing: border-box; }
        .login-body { margin: 0; background: #fafbf9; color: #101410; font-family: Inter, system-ui, sans-serif; }
        .page { min-height: 100vh; display: grid; grid-template-columns: 1.05fr .95fr; }
        .hero { padding: 64px 8%; position: relative; overflow: hidden; background: linear-gradient(145deg, #fff, #f0f8ff); }
        .brand { display: flex; gap: 14px; align-items: center; font-size: 25px; font-weight: 800; }
        .mark { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; background: #8ad8ff; color: #101410; }
        .subbrand { font-size: 10px; letter-spacing: .28em; color: #7d867f; }
        .kicker { margin-top: 90px; letter-spacing: .25em; color: #6d786f; }
        .hero h1 { font-size: 64px; line-height: .98; letter-spacing: -.05em; margin: 24px 0; }
        .hero h1 span { color: #8ad8ff; }
        .hero p { max-width: 560px; color: #667168; font-size: 18px; line-height: 1.55; }
        .features { margin-top: 48px; display: grid; gap: 20px; }
        .feature { display: flex; gap: 15px; align-items: center; }
        .icon { width: 44px; height: 44px; border: 1px solid #dce8f2; border-radius: 13px; display: grid; place-items: center; background: #f4f9fd; }
        .feature b, .feature small { display: block; }
        .feature small { color: #737d76; }
        .auth { display: grid; place-items: center; padding: 42px; background: #fff; }
        .auth-inner { width: 100%; max-width: 520px; }
        .card { width: 100%; padding: 46px 50px; border: 1px solid #e8ebe7; border-radius: 26px; box-shadow: 0 24px 70px #15201512; }
        .card h2 { font-size: 34px; margin: 0 0 8px; }
        .muted { color: #8a928c; }
        .field { margin: 22px 0; }
        .label { display: flex; justify-content: space-between; margin-bottom: 9px; font-size: 14px; font-weight: 650; }
        .label a, .footer a { color: #0284c7; text-decoration: none; }
        .label a:hover, .footer a:hover { text-decoration: underline; }
        .input { width: 100%; height: 56px; border: 1px solid #dce1dc; border-radius: 12px; padding: 0 16px; font-size: 15px; outline: none; }
        .input:focus { border-color: #8ad8ff; box-shadow: 0 0 0 3px rgba(138, 216, 255, 0.35); }
        .remember { display: flex; gap: 9px; margin: 25px 0; color: #606a63; font-size: 14px; }
        .remember input { accent-color: #8ad8ff; cursor: pointer; }
        .submit { width: 100%; height: 58px; border: 0; border-radius: 12px; background: #111; color: #8ad8ff; font-weight: 800; font-size: 15px; cursor: pointer; transition: opacity 0.15s; }
        .submit:hover { opacity: 0.9; }
        .submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .footer { text-align: center; color: #8d958f; margin-top: 26px; font-size: 14px; }
        .secure { text-align: center; color: #8b948d; font-size: 13px; margin-top: 28px; }
        @media(max-width: 900px) {
          .page { grid-template-columns: 1fr; }
          .hero { padding: 40px; }
          .hero h1 { font-size: 48px; }
          .kicker { margin-top: 55px; }
          .auth { padding: 35px 20px; }
        }
      `}</style>
      <main className="page login-body">
        <section className="hero">
          <div className="brand">
            <div className="mark">P</div>
            <div>PravahOS<div className="subbrand">BANKING COMPLIANCE INTELLIGENCE</div></div>
          </div>
          <div className="kicker">COMPLIANT TODAY. STRONGER TOMORROW.</div>
          <h1>AI-Powered<br /><span>Banking</span><br />Compliance</h1>
          <p>Streamline RBI regulation management, MAP tracking, and audit preparation, all in one intelligent platform.</p>
          <div className="features">
            <div className="feature">
              <div className="icon">▤</div>
              <div><b>From Circulars to Action</b><small>Extract, interpret and assign MAPs</small></div>
            </div>
            <div className="feature">
              <div className="icon">⌁</div>
              <div><b>Predict &amp; Plan</b><small>Simulate timelines and identify risks early</small></div>
            </div>
            <div className="feature">
              <div className="icon">◇</div>
              <div><b>Audit Ready</b><small>Complete traceability and evidence logs</small></div>
            </div>
          </div>
        </section>
        <section className="auth">
          <div className="auth-inner">
            <div className="card">
              <h2>Welcome back</h2>
              <p className="muted">Sign in to your PravahOS account</p>
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <div className="label"><label>Email address</label></div>
                  <input
                    className="input"
                    type="email"
                    placeholder="name@bankname.com"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  />
                </div>
                <div className="field">
                  <div className="label"><label>Password</label><a href="#">Forgot password?</a></div>
                  <input
                    className="input"
                    type="password"
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  />
                </div>
                {error && (
                  <div style={{ color: '#C13B2A', fontSize: 13, marginBottom: 15 }}>
                    {error}
                  </div>
                )}
                <label className="remember">
                  <input type="checkbox" /> Remember me for 30 days
                </label>
                <button className="submit" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In to PravahOS →'}
                </button>
              </form>
              <div className="footer">New to PravahOS? <a href="#">Request access</a></div>
            </div>
            <div className="secure">◈ Secure &nbsp;|&nbsp; Compliant &nbsp;|&nbsp; Confidential</div>
          </div>
        </section>
      </main>
    </>
  )
}
