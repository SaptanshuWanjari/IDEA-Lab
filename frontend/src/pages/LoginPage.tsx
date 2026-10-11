import { useState } from "react"
import { api } from "../lib/api"
import type { UserOut } from "../lib/types"

export default function LoginPage({
  onLogin,
}: {
  onLogin: (u: UserOut) => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
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
      const user = await api.post<UserOut>("/auth/login", { email, password })
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
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.05fr 0.95fr",
        background: "var(--paper)",
      }}
    >
      {/* left — navy ledger */}
      <section
        style={{
          background:
            "linear-gradient(170deg, #0E2136 0%, #0A1626 55%, #0C1B2D 100%)",
          color: "#EDEBE2",
          padding: "56px 7%",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(600px 400px at 75% 15%, rgba(197,162,84,0.16), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: "linear-gradient(160deg,#D9BC6B,#9A7B2E)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Fraunces, serif",
              fontWeight: 700,
              fontSize: 21,
              color: "#0C1B2D",
            }}
          >
            P
          </div>
          <div>
            <div
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              PravahOS
            </div>
            <div
              className="pv-mono"
              style={{
                fontSize: 9.5,
                letterSpacing: "0.22em",
                color: "#93A0B1",
              }}
            >
              BANKING COMPLIANCE INTELLIGENCE
            </div>
          </div>
        </div>

        <div
          className="pv-mono"
          style={{
            marginTop: 72,
            fontSize: 10.5,
            letterSpacing: "0.24em",
            color: "#D9BC6B",
            position: "relative",
          }}
        >
          RBI COMPLIANCE · MAKER–CHECKER · AUDIT TRAIL
        </div>
        <h1
          style={{
            fontFamily: "Fraunces, serif",
            fontSize: 58,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            margin: "18px 0",
            position: "relative",
            fontWeight: 600,
          }}
        >
          Every circular,
          <br />
          accounted for
          <br />
          <em style={{ color: "#D9BC6B", fontStyle: "italic" }}>
            to the last proof.
          </em>
        </h1>
        <p
          style={{
            maxWidth: 480,
            color: "#AEB9C6",
            fontSize: 15.5,
            lineHeight: 1.6,
            position: "relative",
          }}
        >
          Intake RBI circulars, extract measurable actions, assign owners, and
          compile inspection-ready evidence — in one controlled desk.
        </p>

        <div
          style={{
            marginTop: 40,
            display: "grid",
            gap: 0,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            position: "relative",
          }}
        >
          {[
            [
              "01",
              "Circular to MAP",
              "Clause-level extraction with folio citations",
            ],
            [
              "02",
              "Estimate exposure",
              "Workload and timeline scenarios before commitment",
            ],
            [
              "03",
              "Prove compliance",
              "Verified evidence vault with full lineage",
            ],
          ].map(([n, t, d]) => (
            <div
              key={n}
              style={{
                display: "flex",
                gap: 16,
                padding: "16px 0",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span
                className="pv-mono"
                style={{ fontSize: 11, color: "#D9BC6B" }}
              >
                {n}
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t}</div>
                <div style={{ fontSize: 12.5, color: "#8A97A8" }}>{d}</div>
              </div>
            </div>
          ))}
        </div>

        <div
          className="pv-mono"
          style={{
            marginTop: "auto",
            paddingTop: 40,
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "#67758A",
            position: "relative",
          }}
        >
          SESSION SECURED · SSO + MFA ENFORCED · DATA RESIDENCY IN
        </div>
      </section>

      {/* right — sign in */}
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          background: "var(--paper)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div className="pv-card" style={{ padding: "36px 36px 30px" }}>
            <div
              className="pv-mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                color: "var(--brass)",
              }}
            >
              § OFFICER SIGN IN
            </div>
            <h2
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: 30,
                fontWeight: 600,
                margin: "8px 0 4px",
              }}
            >
              Welcome back
            </h2>
            <p style={{ fontSize: 13, color: "var(--slate)", margin: 0 }}>
              Use your bank-issued credentials. All sign-ins are logged.
            </p>
            <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  marginBottom: 7,
                }}
              >
                Work email
              </label>
              <input
                className="pv-input"
                style={{ width: "100%", height: 46 }}
                type="email"
                placeholder="name@bankname.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError("")
                }}
                autoComplete="username"
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  margin: "18px 0 7px",
                }}
              >
                <label style={{ fontSize: 12.5, fontWeight: 600 }}>
                  Password
                </label>
                <a
                  href="#"
                  style={{
                    fontSize: 12,
                    color: "var(--brass)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Reset via IT desk
                </a>
              </div>
              <input
                className="pv-input"
                style={{ width: "100%", height: 46 }}
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                autoComplete="current-password"
              />
              {error && (
                <div
                  role="alert"
                  style={{
                    marginTop: 14,
                    background: "var(--scarlet-bg)",
                    border: "1px solid #EFC4BE",
                    color: "var(--scarlet)",
                    fontSize: 12.5,
                    borderRadius: 9,
                    padding: "10px 12px",
                  }}
                >
                  {error}
                </div>
              )}
              <button
                className="pv-btn-primary"
                style={{
                  width: "100%",
                  height: 48,
                  justifyContent: "center",
                  marginTop: 20,
                  fontSize: 14,
                }}
                disabled={loading}
              >
                {loading ? "Verifying…" : "Sign in to PravahOS →"}
              </button>
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 16,
                  fontSize: 12.5,
                  color: "var(--slate)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  style={{ accentColor: "var(--brass)" }}
                />{" "}
                Remember this workstation for 30 days
              </label>
            </form>
          </div>
          <p
            className="pv-mono"
            style={{
              textAlign: "center",
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "var(--faint)",
              marginTop: 20,
            }}
          >
            SECURE · COMPLIANT · CONFIDENTIAL
          </p>
        </div>
      </section>
      <style>{`@media(max-width: 900px){ main{ grid-template-columns: 1fr !important; } section:first-child{ padding: 36px 24px !important; } h1{ font-size: 40px !important; } }`}</style>
    </main>
  )
}
