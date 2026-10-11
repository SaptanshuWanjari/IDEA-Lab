import { useState } from "react"
import { Eye, EyeOff, AlertCircle, ArrowRight, Shield, HelpCircle, X } from "lucide-react"
import logo from "../logo.svg"
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
      const user = await api.post<UserOut>("/auth/login", { email: email.trim(), password })
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
    <main className="pv-login-root">
      {/* ========================================================
          LEFT: BRANDING & REGULATORY LEDGER PANEL (Unified Navy/Teal)
          ======================================================== */}
      <section className="pv-login-brand" aria-label="PravahOS Brand Overview">
        {/* Subtle radial ambient teal glow matching app brand */}
        <div className="pv-brand-glow" aria-hidden="true" />

        <div className="pv-brand-content">
          {/* Brand header */}
          <header className="pv-brand-header">
            <img
              src={logo}
              alt="PravahOS Logo"
              className="pv-brand-logo"
            />
            <div>
              <div className="pv-brand-title">PravahOS</div>
              <div className="pv-brand-subtitle">
                BANKING COMPLIANCE INTELLIGENCE
              </div>
            </div>
          </header>

          {/* Eyebrow - Teal accent unified with app */}
          <div className="pv-brand-eyebrow">
            BANKING COMPLIANCE · MAKER-CHECKER · AUDIT TRAIL
          </div>

          {/* Main Headline */}
          <h1 className="pv-brand-headline">
            Every circular,
            <br />
            accounted for
            <br />
            <em className="pv-brand-headline-accent">to the last proof.</em>
          </h1>

          {/* Supporting Description */}
          <p className="pv-brand-description">
            Bring regulatory obligations, accountable owners, and verified
            evidence together in one controlled workspace.
          </p>

          {/* Feature List (Editorial) */}
          <div className="pv-feature-list" role="list">
            <div className="pv-feature-row" role="listitem">
              <span className="pv-feature-num">01</span>
              <div className="pv-feature-text">
                <div className="pv-feature-title">From circular to action</div>
                <div className="pv-feature-desc">
                  Extract measurable obligations with traceable folio references.
                </div>
              </div>
            </div>

            <div className="pv-feature-row" role="listitem">
              <span className="pv-feature-num">02</span>
              <div className="pv-feature-text">
                <div className="pv-feature-title">From action to outcome</div>
                <div className="pv-feature-desc">
                  Track owners, deadlines, and remediation progress.
                </div>
              </div>
            </div>

            <div className="pv-feature-row" role="listitem">
              <span className="pv-feature-num">03</span>
              <div className="pv-feature-text">
                <div className="pv-feature-title">From evidence to proof</div>
                <div className="pv-feature-desc">
                  Maintain verified records with a complete audit trail.
                </div>
              </div>
            </div>
          </div>

          {/* Regulatory Compliance & Audit Trail Visual (Unified Theme) */}
          <div className="pv-audit-visual" aria-hidden="true">
            <svg
              className="pv-audit-svg"
              viewBox="0 0 520 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Fine ledger grid lines */}
              <line x1="20" y1="30" x2="500" y2="30" stroke="rgba(226,234,242,0.08)" strokeDasharray="3 3" />
              <line x1="20" y1="90" x2="500" y2="90" stroke="rgba(226,234,242,0.08)" />
              <line x1="20" y1="150" x2="500" y2="150" stroke="rgba(226,234,242,0.08)" strokeDasharray="3 3" />

              {/* Vertical ledger tick guides */}
              <line x1="70" y1="18" x2="70" y2="162" stroke="rgba(226,234,242,0.05)" />
              <line x1="260" y1="18" x2="260" y2="162" stroke="rgba(226,234,242,0.05)" />
              <line x1="450" y1="18" x2="450" y2="162" stroke="rgba(226,234,242,0.05)" />

              {/* Connecting lineage path */}
              <path
                d="M 70 90 L 260 90 L 450 90"
                stroke="#0D9488"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeOpacity="0.4"
              />

              {/* Node 1: Circular Folio */}
              <circle cx="70" cy="90" r="16" fill="#0C1E33" stroke="#0D9488" strokeWidth="1.2" strokeOpacity="0.8" />
              <circle cx="70" cy="90" r="24" stroke="rgba(20,184,166,0.18)" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="70" cy="90" r="4" fill="#14B8A6" />
              <text x="70" y="60" textAnchor="middle" fill="#94A3B8" fontSize="8.5" letterSpacing="0.12em" fontFamily="Inter, sans-serif" fontWeight="600">
                CIRCULAR FOLIO
              </text>
              <text x="70" y="125" textAnchor="middle" fill="#14B8A6" fontSize="9" letterSpacing="0.08em" fontFamily="Inter, sans-serif">
                § SEC 35A · REF 04
              </text>

              {/* Arrow connector 1 -> 2 */}
              <polygon points="172,86 178,90 172,94" fill="#0D9488" fillOpacity="0.6" />

              {/* Node 2: Maker-Checker Control */}
              <circle cx="260" cy="90" r="18" fill="#0C1E33" stroke="#14B8A6" strokeWidth="1.4" strokeOpacity="0.9" />
              <circle cx="260" cy="90" r="28" stroke="rgba(20,184,166,0.25)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="260" cy="90" r="5" fill="#14B8A6" />
              <text x="260" y="58" textAnchor="middle" fill="#94A3B8" fontSize="8.5" letterSpacing="0.12em" fontFamily="Inter, sans-serif" fontWeight="600">
                MAKER-CHECKER CONTROL
              </text>
              <text x="260" y="125" textAnchor="middle" fill="#14B8A6" fontSize="9" letterSpacing="0.08em" fontFamily="Inter, sans-serif">
                DUAL SIGN-OFF
              </text>

              {/* Arrow connector 2 -> 3 */}
              <polygon points="362,86 368,90 362,94" fill="#0D9488" fillOpacity="0.6" />

              {/* Node 3: Tamper-Evident Evidence Vault */}
              <circle cx="450" cy="90" r="16" fill="#0C1E33" stroke="#0D9488" strokeWidth="1.2" strokeOpacity="0.8" />
              <circle cx="450" cy="90" r="24" stroke="rgba(20,184,166,0.18)" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="450" cy="90" r="4" fill="#14B8A6" />
              <text x="450" y="60" textAnchor="middle" fill="#94A3B8" fontSize="8.5" letterSpacing="0.12em" fontFamily="Inter, sans-serif" fontWeight="600">
                EVIDENCE VAULT
              </text>
              <text x="450" y="125" textAnchor="middle" fill="#14B8A6" fontSize="9" letterSpacing="0.08em" fontFamily="Inter, sans-serif">
                AUDIT LINEAGE VERIFIED
              </text>
            </svg>
          </div>

          {/* Institutional note footer */}
          <footer className="pv-brand-footer">
            PRAVAH COMPLIANCE ENGINE · AUTHORIZED INSTITUTIONAL ACCESS ONLY
          </footer>
        </div>
      </section>

      {/* ========================================================
          RIGHT: AUTHENTICATION PANEL (Unified Paper & White Card)
          ======================================================== */}
      <section className="pv-login-auth" aria-label="Sign In">
        <div className="pv-auth-wrap">
          {/* Login Card */}
          <div className="pv-auth-card">
            {/* Header */}
            <div className="pv-card-header">
              <div className="pv-card-eyebrow">
                <span className="pv-card-eyebrow-badge">
                  <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>OFFICER ACCESS</span>
                </span>
              </div>
              <h2 className="pv-card-headline">Welcome back</h2>
              <p className="pv-card-desc">
                Sign in with your bank-issued credentials to access your compliance workspace.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="pv-auth-form" noValidate>
              {/* Email Field */}
              <div className="pv-field-group">
                <label htmlFor="login-email" className="pv-field-label">
                  Work email
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="name@bankname.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError("")
                  }}
                  className="pv-auth-input"
                  disabled={loading}
                />
              </div>

              {/* Password Field */}
              <div className="pv-field-group">
                <div className="pv-label-row">
                  <label htmlFor="login-password" className="pv-field-label">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="pv-help-trigger"
                    aria-label="Need sign-in assistance or password help?"
                  >
                    Need assistance?
                  </button>
                </div>
                <div className="pv-password-wrapper">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError("")
                    }}
                    className="pv-auth-input pv-password-input"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="pv-password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                    tabIndex={0}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div role="alert" className="pv-auth-alert">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="pv-submit-btn"
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <span className="pv-btn-spinner" aria-hidden="true" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to PravahOS</span>
                    <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Clean Security Note beneath Card */}
          <div className="pv-auth-footer-note">
            SECURE ACCESS · REGULATORY WORKSPACE
          </div>
        </div>
      </section>

      {/* IT Helpdesk Information Dialog */}
      {showHelpModal && (
        <div
          className="pv-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="pv-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pv-modal-header">
              <div className="pv-modal-icon-wrap">
                <HelpCircle className="w-5 h-5 text-[#0D9488]" />
              </div>
              <div>
                <h3 id="help-modal-title" className="pv-modal-title">
                  Credential Assistance
                </h3>
                <p className="pv-modal-sub">
                  Bank security policy &amp; account recovery
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="pv-modal-close"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="pv-modal-body">
              <p>
                In accordance with institutional security guidelines, password resets
                and account provisions are centrally managed by your bank’s internal
                IT Administration.
              </p>
              <div className="pv-modal-contact">
                <div className="font-semibold text-[#102A43]">Support procedure:</div>
                <ul className="pv-modal-steps">
                  <li>Raise a service ticket via your internal bank IT Service Desk.</li>
                  <li>Reference application: <strong>PravahOS Compliance Portal</strong>.</li>
                  <li>Provide your authorized corporate email address.</li>
                </ul>
              </div>
            </div>
            <div className="pv-modal-footer">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="pv-modal-action-btn"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Color Theme CSS (Aligned with App Design Tokens) */}
      <style>{`
        /* Root container using var(--paper) and var(--ink) */
        .pv-login-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 54% 46%;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--font-body);
        }

        /* ----------------------------------------------------
           Left Branding Panel - App Navy & Brand Teal Palette
           ---------------------------------------------------- */
        .pv-login-brand {
          background: linear-gradient(165deg, var(--ink) 0%, #0C1E33 55%, #071524 100%);
          color: #FFFFFF;
          padding: 48px 64px 40px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--line);
        }

        .pv-brand-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 700px 480px at 78% 14%, rgba(13, 148, 136, 0.16), transparent 70%);
          pointer-events: none;
        }

        .pv-brand-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          max-width: 540px;
        }

        .pv-brand-header {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .pv-brand-logo {
          width: 38px;
          height: 38px;
          border-radius: var(--radius);
          object-fit: contain;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }

        .pv-brand-title {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 21px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: #FFFFFF;
          line-height: 1.2;
        }

        .pv-brand-subtitle {
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: var(--faint);
          margin-top: 2px;
        }

        .pv-brand-eyebrow {
          margin-top: 52px;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: var(--teal-bright);
          text-transform: uppercase;
        }

        .pv-brand-headline {
          font-family: 'Fraunces', Georgia, serif;
          font-size: clamp(34px, 3.4vw, 48px);
          line-height: 1.08;
          letter-spacing: -0.025em;
          margin: 16px 0 18px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .pv-brand-headline-accent {
          color: var(--teal-bright);
          font-style: italic;
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 500;
        }

        .pv-brand-description {
          font-size: 14.5px;
          line-height: 1.58;
          color: var(--faint);
          margin: 0 0 32px 0;
          font-weight: 400;
        }

        /* Feature rows */
        .pv-feature-list {
          display: flex;
          flex-direction: column;
          border-top: 1px solid rgba(226, 234, 242, 0.08);
          margin-bottom: 24px;
        }

        .pv-feature-row {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 13px 0;
          border-bottom: 1px solid rgba(226, 234, 242, 0.08);
        }

        .pv-feature-num {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--teal-bright);
          letter-spacing: 0.06em;
          padding-top: 2px;
          font-variant-numeric: tabular-nums;
        }

        .pv-feature-text {
          flex: 1;
        }

        .pv-feature-title {
          font-size: 14px;
          font-weight: 600;
          color: #FFFFFF;
          letter-spacing: -0.01em;
          line-height: 1.35;
        }

        .pv-feature-desc {
          font-size: 12.5px;
          line-height: 1.45;
          color: var(--faint);
          margin-top: 2px;
        }

        /* Custom regulatory audit visual */
        .pv-audit-visual {
          margin: 10px 0 auto;
          padding: 8px 0;
          opacity: 0.95;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pv-audit-svg {
          width: 100%;
          max-width: 480px;
          height: auto;
          display: block;
        }

        .pv-brand-footer {
          margin-top: auto;
          padding-top: 24px;
          font-size: 10px;
          letter-spacing: 0.14em;
          color: var(--slate);
          font-weight: 500;
        }

        /* ----------------------------------------------------
           Right Authentication Panel - Unified Paper & Card
           ---------------------------------------------------- */
        .pv-login-auth {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 32px;
          background: var(--paper);
          position: relative;
        }

        .pv-auth-wrap {
          width: 100%;
          max-width: 410px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pv-auth-card {
          width: 100%;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 20px -2px rgba(16, 42, 67, 0.05), 0 2px 6px -1px rgba(16, 42, 67, 0.03);
          padding: 32px 32px 28px;
        }

        .pv-card-header {
          margin-bottom: 24px;
        }

        .pv-card-eyebrow {
          margin-bottom: 8px;
        }

        .pv-card-eyebrow-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          border-radius: 6px;
          background: var(--teal-wash);
          border: 1px solid var(--teal-light);
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--teal);
          text-transform: uppercase;
        }

        .pv-card-headline {
          font-size: 26px;
          font-weight: 600;
          color: var(--ink);
          margin: 6px 0 6px;
          letter-spacing: -0.02em;
          line-height: 1.25;
        }

        .pv-card-desc {
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--slate);
          margin: 0;
        }

        .pv-auth-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .pv-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pv-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pv-field-label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink);
          user-select: none;
        }

        .pv-help-trigger {
          background: none;
          border: none;
          padding: 0;
          font-size: 12px;
          font-weight: 500;
          color: var(--teal);
          cursor: pointer;
          transition: color 0.15s, text-decoration 0.15s;
          text-decoration: none;
        }

        .pv-help-trigger:hover {
          color: #0B7E73;
          text-decoration: underline;
        }

        .pv-auth-input {
          height: 46px;
          width: 100%;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 0 14px;
          font-size: 14px;
          color: var(--ink);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
          font-family: inherit;
        }

        .pv-auth-input::placeholder {
          color: var(--faint);
        }

        .pv-auth-input:hover:not(:disabled) {
          border-color: var(--slate);
        }

        .pv-auth-input:focus {
          border-color: var(--teal);
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.14);
        }

        .pv-auth-input:disabled {
          background: var(--muted);
          cursor: not-allowed;
          opacity: 0.8;
        }

        .pv-password-wrapper {
          position: relative;
          width: 100%;
        }

        .pv-password-input {
          padding-right: 44px;
        }

        .pv-password-toggle {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--slate);
          cursor: pointer;
          transition: color 0.14s, background-color 0.14s;
        }

        .pv-password-toggle:hover {
          color: var(--ink);
          background: var(--muted);
        }

        .pv-password-toggle:focus-visible {
          outline: 2px solid var(--teal);
          outline-offset: 1px;
        }

        /* Alert matching var(--critical) tokens */
        .pv-auth-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--critical-bg);
          border: 1px solid var(--critical-border);
          color: var(--critical);
          font-size: 12.5px;
          line-height: 1.45;
          padding: 10px 12px;
          border-radius: 8px;
        }

        /* Primary action button matching var(--teal) */
        .pv-submit-btn {
          height: 46px;
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--teal);
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 6px;
          transition: background-color 0.15s, transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 1px 3px rgba(13, 148, 136, 0.2);
        }

        .pv-submit-btn:hover:not(:disabled) {
          background: #0B7E73;
        }

        .pv-submit-btn:active:not(:disabled) {
          transform: translateY(1px);
        }

        .pv-submit-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.35);
        }

        .pv-submit-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .pv-btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: pv-spin 0.8s linear infinite;
        }

        @keyframes pv-spin {
          to { transform: rotate(360deg); }
        }

        .pv-auth-footer-note {
          margin-top: 22px;
          font-size: 11px;
          letter-spacing: 0.12em;
          color: var(--slate);
          font-weight: 500;
          text-align: center;
          user-select: none;
        }

        /* ----------------------------------------------------
           IT Assistance Modal
           ---------------------------------------------------- */
        .pv-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(16, 42, 67, 0.55);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }

        .pv-modal-card {
          width: 100%;
          max-width: 440px;
          background: var(--card);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-pop);
          border: 1px solid var(--line);
          overflow: hidden;
        }

        .pv-modal-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--line);
          position: relative;
        }

        .pv-modal-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--teal-wash);
          border: 1px solid var(--teal-light);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .pv-modal-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--ink);
          margin: 0;
        }

        .pv-modal-sub {
          font-size: 12px;
          color: var(--slate);
          margin: 2px 0 0;
        }

        .pv-modal-close {
          position: absolute;
          right: 16px;
          top: 16px;
          background: none;
          border: none;
          color: var(--faint);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pv-modal-close:hover {
          color: var(--ink);
          background: var(--muted);
        }

        .pv-modal-body {
          padding: 16px 20px;
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--ink-2);
        }

        .pv-modal-body p {
          margin: 0 0 14px;
        }

        .pv-modal-contact {
          background: var(--line-soft);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 12.5px;
        }

        .pv-modal-steps {
          margin: 8px 0 0;
          padding-left: 18px;
          color: var(--slate);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pv-modal-footer {
          padding: 12px 20px 18px;
          display: flex;
          justify-content: flex-end;
          background: var(--line-soft);
          border-top: 1px solid var(--line);
        }

        .pv-modal-action-btn {
          height: 36px;
          padding: 0 16px;
          background: var(--teal);
          color: #FFFFFF;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .pv-modal-action-btn:hover {
          background: #0B7E73;
        }

        /* ----------------------------------------------------
           Responsive Breakpoints
           ---------------------------------------------------- */
        @media (max-width: 1080px) {
          .pv-login-brand {
            padding: 40px 40px 32px;
          }
          .pv-brand-eyebrow {
            margin-top: 40px;
          }
          .pv-login-auth {
            padding: 40px 24px;
          }
        }

        @media (max-width: 880px) {
          .pv-login-root {
            grid-template-columns: 1fr;
          }
          .pv-login-brand {
            padding: 36px 24px 32px;
            border-right: none;
            border-bottom: 1px solid var(--line);
          }
          .pv-brand-content {
            max-width: 100%;
          }
          .pv-brand-eyebrow {
            margin-top: 32px;
          }
          .pv-brand-headline {
            font-size: 32px;
            margin: 12px 0 14px;
          }
          .pv-brand-description {
            margin-bottom: 24px;
          }
          .pv-audit-visual {
            display: none;
          }
          .pv-brand-footer {
            display: none;
          }
          .pv-login-auth {
            padding: 36px 20px 48px;
          }
          .pv-auth-wrap {
            max-width: 420px;
          }
          .pv-auth-card {
            padding: 28px 24px 24px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pv-btn-spinner {
            animation: none;
          }
          .pv-auth-input,
          .pv-submit-btn,
          .pv-help-trigger {
            transition: none !important;
          }
        }
      `}</style>
    </main>
  )
}
