import { useState } from "react"
import {
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  HelpCircle,
  X,
  Mail,
  Lock,
} from "lucide-react"
import logo from "../logo.svg"
import loginAsset from "../login-asset.png"
import { api } from "../lib/api"
import type { UserOut } from "../lib/types"

export default function LoginPage({
  onLogin,
}: {
  onLogin: (u: UserOut) => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showHelpModal, setShowHelpModal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Enter your work email address.")
      return
    }
    if (!password) {
      setError("Enter your password.")
      return
    }
    setError("")
    setLoading(true)
    try {
      const user = await api.post<UserOut>("/auth/login", {
        email: email.trim(),
        password,
      })
      onLogin(user)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign in failed — check credentials.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="lp-outer" aria-label="PravahOS Login">
        {/* Outer background shapes */}
        <div className="lp-bg-shapes" aria-hidden="true">
          <svg
            className="lp-bg-svg"
            viewBox="0 0 1440 900"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            <polygon
              points="900,0 1440,0 1440,520 1100,380"
              fill="rgba(13,148,136,0.06)"
            />
            <polygon
              points="0,600 320,900 0,900"
              fill="rgba(13,148,136,0.05)"
            />
            <line
              x1="60"
              y1="0"
              x2="60"
              y2="900"
              stroke="#C9A45F"
              strokeWidth="0.6"
              strokeOpacity="0.25"
            />
          </svg>
        </div>

        {/* Main panel */}
        <main className="lp-panel" role="main">
          {/* LEFT: BRANDING */}
          <section className="lp-brand" aria-label="PravahOS Brand">
            <div className="lp-brand-grad" aria-hidden="true" />
            <div className="lp-brand-inner">
              <header className="lp-brand-header">
                <img src={logo} alt="PravahOS Logo" className="lp-brand-logo" />
                <div>
                  <div className="lp-brand-name">PravahOS</div>
                  <div className="lp-brand-tagline">BANKING COMPLIANCE INTELLIGENCE</div>
                </div>
              </header>

              <h1 className="lp-headline">
                Every circular,
                <br />
                accounted for
                <br />
                <em className="lp-headline-gold">to the last proof.</em>
              </h1>

              <p className="lp-description">
                Intake RBI circulars, track remediation actions, and compile
                inspection-ready evidence — in one controlled workspace.
              </p>

              <div className="lp-illustration-wrap" aria-hidden="true">
                <img
                  src={loginAsset}
                  alt="Banking compliance workflow — bank building, RBI circular document, compliance shield"
                  className="lp-illustration"
                />
              </div>
            </div>
          </section>

          {/* RIGHT: AUTH */}
          <section className="lp-auth" aria-label="Officer Sign In">
            <div className="lp-auth-topbar">
              <span className="lp-topbar-label">Officer access</span>
              <span className="lp-topbar-sep" aria-hidden="true" />
              <button
                type="button"
                className="lp-topbar-help"
                onClick={() => setShowHelpModal(true)}
                aria-label="Get help with signing in"
              >
                Help
              </button>
            </div>

            <div className="lp-auth-center">
              <div className="lp-form-heading">
                <div className="lp-form-eyebrow">OFFICER SIGN IN</div>
                <h2 className="lp-form-title">Welcome back</h2>
                <p className="lp-form-desc">Use your bank-issued credentials to continue.</p>
              </div>

              <form onSubmit={handleSubmit} className="lp-form" noValidate aria-label="Sign in form">
                {/* Email */}
                <div className="lp-field">
                  <label htmlFor="login-email" className="lp-label">Work email</label>
                  <div className="lp-input-wrap">
                    <Mail className="lp-input-icon" size={17} aria-hidden="true" />
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      placeholder="name@bankname.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (error) setError("") }}
                      className="lp-input lp-input--icon-left"
                      disabled={loading}
                      aria-describedby={error ? "login-error" : undefined}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="lp-field">
                  <label htmlFor="login-password" className="lp-label">Password</label>
                  <div className="lp-input-wrap">
                    <Lock className="lp-input-icon" size={17} aria-hidden="true" />
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError("") }}
                      className="lp-input lp-input--icon-left lp-input--icon-right"
                      disabled={loading}
                      aria-describedby={error ? "login-error" : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="lp-pwd-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={0}
                    >
                      {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
                  </div>
                  <div className="lp-reset-row">
                    <button type="button" onClick={() => setShowHelpModal(true)} className="lp-reset-link">
                      Contact IT for password reset
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div id="login-error" role="alert" className="lp-error" aria-live="assertive">
                    <AlertCircle size={15} aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading} className="lp-submit" aria-busy={loading}>
                  {loading ? (
                    <><span className="lp-spinner" aria-hidden="true" /><span>Signing in…</span></>
                  ) : (
                    <><span>Sign in to PravahOS</span><ArrowRight size={16} aria-hidden="true" /></>
                  )}
                </button>

                {/* Remember device */}
                <label className="lp-remember" htmlFor="login-remember">
                  <input
                    id="login-remember"
                    type="checkbox"
                    className="lp-checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Remember this workstation for 30 days</span>
                </label>
              </form>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="lp-footer" aria-label="Security notice">
          SECURE ACCESS · REGULATORY WORKSPACE · CONFIDENTIAL
        </footer>

        {/* IT Help Modal */}
        {showHelpModal && (
          <div
            className="lp-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-modal-title"
            onClick={() => setShowHelpModal(false)}
          >
            <div className="lp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="lp-modal-header">
                <div className="lp-modal-icon">
                  <HelpCircle size={18} />
                </div>
                <div className="lp-modal-header-text">
                  <h3 id="help-modal-title" className="lp-modal-title">Credential Assistance</h3>
                  <p className="lp-modal-sub">Bank security policy &amp; account recovery</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="lp-modal-close"
                  aria-label="Close dialog"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="lp-modal-body">
                <p>
                  In accordance with institutional security guidelines, password resets and account
                  provisions are centrally managed by your bank's internal IT Administration.
                </p>
                <div className="lp-modal-contact">
                  <div className="lp-modal-contact-label">Support procedure:</div>
                  <ul className="lp-modal-steps">
                    <li>Raise a service ticket via your internal bank IT Service Desk.</li>
                    <li>Reference application: <strong>PravahOS Compliance Portal</strong>.</li>
                    <li>Provide your authorized corporate email address.</li>
                  </ul>
                </div>
              </div>
              <div className="lp-modal-footer">
                <button type="button" onClick={() => setShowHelpModal(false)} className="lp-modal-btn">
                  Understood
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&display=swap');

        .lp-outer {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #DCEFED 0%, #D0EAE8 50%, #C8E5E2 100%);
          padding: 32px 20px 24px;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .lp-bg-shapes {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        .lp-bg-svg {
          width: 100%;
          height: 100%;
          position: absolute;
          inset: 0;
        }
        .lp-panel {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1340px;
          min-height: clamp(560px, 82vh, 840px);
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 24px 80px -12px rgba(16,42,67,0.14), 0 8px 24px -4px rgba(16,42,67,0.07);
          display: grid;
          grid-template-columns: 52% 48%;
          overflow: hidden;
        }
        .lp-brand {
          background: linear-gradient(160deg, #EAF5F4 0%, #E0F0EE 55%, #D8ECEB 100%);
          padding: 52px 60px 48px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .lp-brand-grad {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 600px 400px at 110% -10%, rgba(13,148,136,0.12), transparent 65%),
            radial-gradient(ellipse 400px 300px at -20% 110%, rgba(13,148,136,0.08), transparent 60%);
          pointer-events: none;
        }
        .lp-brand-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .lp-brand-header {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .lp-brand-logo {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 10px;
          flex-shrink: 0;
        }
        .lp-brand-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 20px;
          font-weight: 700;
          color: #102A43;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        .lp-brand-tagline {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: #7185A3;
          margin-top: 3px;
          text-transform: uppercase;
        }
        .lp-headline {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(36px, 3.6vw, 56px);
          line-height: 1.03;
          font-weight: 700;
          color: #102A43;
          margin: 44px 0 0;
          letter-spacing: -0.02em;
        }
        .lp-headline-gold {
          color: #C9A45F;
          font-style: italic;
          font-weight: 600;
        }
        .lp-description {
          font-size: 16px;
          line-height: 1.6;
          color: #7185A3;
          margin: 20px 0 0;
          max-width: 400px;
          font-weight: 400;
        }
        .lp-illustration-wrap {
          margin-top: 16px;
          flex: 1;
          display: flex;
          align-items: flex-end;
        }
        .lp-illustration {
          width: 100%;
          max-width: 720px;
          height: auto;
          max-height: 720px;
          object-fit: contain;
          display: block;
        }
        .lp-auth {
          background: #FFFFFF;
          padding: 36px 52px 48px;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .lp-auth-topbar {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: flex-end;
        }
        .lp-topbar-label {
          font-size: 12.5px;
          color: #7185A3;
          font-weight: 500;
        }
        .lp-topbar-sep {
          display: inline-block;
          width: 1px;
          height: 14px;
          background: #DCE5ED;
        }
        .lp-topbar-help {
          font-size: 12.5px;
          color: #7185A3;
          font-weight: 500;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .lp-topbar-help:hover { color: #0D9488; }
        .lp-topbar-help:focus-visible { outline: 2px solid #0D9488; outline-offset: 3px; border-radius: 3px; }
        .lp-auth-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 440px;
          width: 100%;
          margin: 0 auto;
          padding: 32px 0 0;
        }
        .lp-form-heading { margin-bottom: 36px; }
        .lp-form-eyebrow {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.14em;
          color: #7185A3;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .lp-form-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(32px, 2.6vw, 40px);
          font-weight: 700;
          color: #102A43;
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin: 0 0 10px;
        }
        .lp-form-desc {
          font-size: 15.5px;
          color: #7185A3;
          margin: 0;
          line-height: 1.55;
        }
        .lp-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .lp-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .lp-label {
          font-size: 13px;
          font-weight: 600;
          color: #102A43;
          user-select: none;
        }
        .lp-input-wrap {
          position: relative;
          width: 100%;
        }
        .lp-input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #7185A3;
          pointer-events: none;
          flex-shrink: 0;
        }
        .lp-input {
          width: 100%;
          height: 56px;
          background: #F3F6FA;
          border: 1.5px solid #DCE5ED;
          border-radius: 10px;
          font-size: 14.5px;
          color: #102A43;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .lp-input::placeholder { color: #B0BDD0; }
        .lp-input--icon-left { padding-left: 46px; }
        .lp-input--icon-right { padding-right: 46px; }
        .lp-input:hover:not(:disabled) { border-color: #B0BDD0; }
        .lp-input:focus {
          border-color: #0D9488;
          box-shadow: 0 0 0 3px rgba(13,148,136,0.14);
          background: #FFFFFF;
        }
        .lp-input:disabled { opacity: 0.7; cursor: not-allowed; background: #F8FAFB; }
        .lp-pwd-toggle {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          border-radius: 7px;
          color: #7185A3;
          cursor: pointer;
          transition: color 0.14s, background-color 0.14s;
        }
        .lp-pwd-toggle:hover { color: #102A43; background: rgba(16,42,67,0.06); }
        .lp-pwd-toggle:focus-visible { outline: 2px solid #0D9488; outline-offset: 1px; }
        .lp-reset-row { display: flex; justify-content: flex-end; margin-top: 4px; }
        .lp-reset-link {
          font-size: 12.5px;
          font-weight: 500;
          color: #0D9488;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: color 0.14s;
          font-family: 'Inter', sans-serif;
        }
        .lp-reset-link:hover { color: #087F80; text-decoration: underline; }
        .lp-reset-link:focus-visible { outline: 2px solid #0D9488; outline-offset: 2px; border-radius: 2px; }
        .lp-error {
          display: flex;
          align-items: center;
          gap: 9px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #DC2626;
          font-size: 13px;
          line-height: 1.45;
          padding: 11px 13px;
          border-radius: 9px;
        }
        .lp-submit {
          height: 58px;
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          background: #0D9488;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: background-color 0.15s, transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 2px 8px rgba(13,148,136,0.28);
          letter-spacing: 0.01em;
        }
        .lp-submit:hover:not(:disabled) { background: #087F80; box-shadow: 0 4px 16px rgba(13,148,136,0.34); }
        .lp-submit:active:not(:disabled) { transform: translateY(1px); box-shadow: 0 1px 4px rgba(13,148,136,0.2); }
        .lp-submit:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(13,148,136,0.38); }
        .lp-submit:disabled { opacity: 0.72; cursor: not-allowed; }
        .lp-spinner {
          width: 17px;
          height: 17px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: lp-spin 0.75s linear infinite;
        }
        @keyframes lp-spin { to { transform: rotate(360deg); } }
        .lp-remember {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #7185A3;
          cursor: pointer;
          user-select: none;
        }
        .lp-checkbox {
          width: 17px;
          height: 17px;
          border: 2px solid #DCE5ED;
          border-radius: 5px;
          appearance: none;
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.14s, background-color 0.14s;
        }
        .lp-checkbox:checked {
          background: #0D9488;
          border-color: #0D9488;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 4L5.5 9.5L3 7' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-size: 11px;
          background-position: center;
          background-repeat: no-repeat;
        }
        .lp-checkbox:hover { border-color: #0D9488; }
        .lp-checkbox:focus-visible { outline: 2px solid #0D9488; outline-offset: 2px; }
        .lp-checkbox:disabled { opacity: 0.6; cursor: not-allowed; }
        .lp-footer {
          position: relative;
          z-index: 1;
          margin-top: 20px;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.15em;
          color: #7A9BAF;
          text-align: center;
          text-transform: uppercase;
          user-select: none;
        }
        .lp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(16,42,67,0.52);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }
        .lp-modal {
          width: 100%;
          max-width: 440px;
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 20px 60px -8px rgba(16,42,67,0.22);
          border: 1px solid #E8EEF4;
          overflow: hidden;
        }
        .lp-modal-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 20px 20px 16px;
          border-bottom: 1px solid #EEF2F7;
          position: relative;
        }
        .lp-modal-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #F0FDFA;
          border: 1px solid #CCFBF1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0D9488;
          flex-shrink: 0;
        }
        .lp-modal-header-text { flex: 1; }
        .lp-modal-title { font-size: 15.5px; font-weight: 600; color: #102A43; margin: 0 28px 0 0; }
        .lp-modal-sub { font-size: 12px; color: #7185A3; margin: 3px 0 0; }
        .lp-modal-close {
          position: absolute;
          right: 14px;
          top: 14px;
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 5px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.12s, background-color 0.12s;
        }
        .lp-modal-close:hover { color: #102A43; background: #F1F5F9; }
        .lp-modal-close:focus-visible { outline: 2px solid #0D9488; outline-offset: 1px; }
        .lp-modal-body { padding: 18px 20px; font-size: 13.5px; line-height: 1.6; color: #3D5168; }
        .lp-modal-body p { margin: 0 0 14px; }
        .lp-modal-contact {
          background: #F8FAFB;
          border: 1px solid #E8EEF4;
          border-radius: 9px;
          padding: 13px 15px;
          font-size: 12.5px;
        }
        .lp-modal-contact-label { font-weight: 600; color: #102A43; margin-bottom: 8px; }
        .lp-modal-steps { margin: 0; padding-left: 18px; color: #64748B; display: flex; flex-direction: column; gap: 5px; }
        .lp-modal-footer {
          padding: 12px 20px 18px;
          display: flex;
          justify-content: flex-end;
          background: #F8FAFB;
          border-top: 1px solid #EEF2F7;
        }
        .lp-modal-btn {
          height: 36px;
          padding: 0 18px;
          background: #0D9488;
          color: #FFFFFF;
          border: none;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: background-color 0.15s;
        }
        .lp-modal-btn:hover { background: #087F80; }
        .lp-modal-btn:focus-visible { outline: 2px solid #0D9488; outline-offset: 3px; }

        /* RESPONSIVE */
        @media (max-width: 1200px) {
          .lp-brand { padding: 44px 44px 40px; }
          .lp-auth { padding: 32px 40px 44px; }
          .lp-headline { font-size: clamp(32px, 3vw, 46px); }
        }
        @media (max-width: 1024px) {
          .lp-panel { grid-template-columns: 50% 50%; }
          .lp-brand { padding: 36px 36px 32px; }
          .lp-auth { padding: 28px 32px 36px; }
          .lp-headline { margin-top: 32px; font-size: clamp(28px, 2.8vw, 40px); }
          .lp-description { font-size: 14.5px; }
          .lp-illustration { max-height: 620px; }
        }
        @media (max-width: 860px) {
          .lp-outer { padding: 20px 16px 20px; }
          .lp-panel {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
            min-height: unset;
          }
          .lp-brand { padding: 32px 28px 28px; border-bottom: 1px solid rgba(13,148,136,0.12); }
          .lp-headline { font-size: 30px; margin-top: 28px; }
          .lp-description { font-size: 14px; margin-top: 14px; }
          .lp-illustration-wrap { display: none; }
          .lp-auth { padding: 28px 28px 36px; }
          .lp-auth-topbar { margin-bottom: 24px; }
          .lp-auth-center { padding: 0; max-width: 100%; }
          .lp-form-title { font-size: 30px; }
        }
        @media (max-width: 540px) {
          .lp-outer { padding: 16px 12px 16px; justify-content: flex-start; }
          .lp-brand { padding: 24px 20px 20px; }
          .lp-headline { font-size: 26px; margin-top: 22px; }
          .lp-description { display: none; }
          .lp-auth { padding: 24px 20px 32px; }
          .lp-form-title { font-size: 26px; }
          .lp-form-desc { font-size: 14px; }
          .lp-submit { height: 52px; font-size: 14px; }
          .lp-input { height: 50px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-spinner { animation: none; }
          .lp-input, .lp-submit, .lp-reset-link, .lp-pwd-toggle { transition: none !important; }
        }
      `}</style>
    </>
  )
}
