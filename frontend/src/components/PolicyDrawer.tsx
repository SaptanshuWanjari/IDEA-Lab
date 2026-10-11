import type { BankDemoPolicy } from "../lib/bankDemoManifest"
import { X } from "lucide-react"

interface PolicyDrawerProps {
  open: boolean
  policies: BankDemoPolicy[]
  onClose: () => void
}

export default function PolicyDrawer({
  open,
  policies,
  onClose,
}: PolicyDrawerProps) {
  if (!open) return null
  const [active, ...rest] = policies

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100 }}
      role="dialog"
      aria-modal="true"
      aria-label="Internal policy"
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(16, 42, 67, 0.45)",
          backdropFilter: "blur(2px)",
        }}
      />
      <aside
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(440px, 92vw)",
          background: "var(--card)",
          boxShadow: "var(--shadow-pop)",
          borderLeft: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "20px 22px 16px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--teal)",
                margin: 0,
                fontFamily: "Inter, sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Internal Policy
              {rest.length > 0 ? ` (1 of ${policies.length})` : ""}
            </p>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "var(--ink)",
                margin: "4px 0 0",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {active?.title ?? "No linked policy"}
            </h2>
            {active && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--teal)",
                    background: "var(--teal-wash)",
                    border: "1px solid var(--teal-light)",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontFamily: "Inter, monospace",
                  }}
                >
                  {active.version}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--slate)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {active.owner_dept}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close policy drawer"
            style={{
              background: "var(--line-soft)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--slate)",
              flexShrink: 0,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div style={{ padding: "18px 22px 24px", overflowY: "auto", flex: 1 }}>
          {!active ? (
            <p
              style={{
                fontSize: 14,
                color: "var(--slate)",
                fontFamily: "Inter, sans-serif",
                textAlign: "center",
                margin: "40px 0",
              }}
            >
              No linked policy
            </p>
          ) : (
            <>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink)",
                  margin: "0 0 8px",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Procedure preview
              </p>
              <pre
                style={{
                  fontSize: 12,
                  color: "var(--ink-2)",
                  background: "var(--line-soft)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "Inter, monospace",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {active.excerpt}
              </pre>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--slate)",
                  margin: "12px 0 0",
                  fontFamily: "Inter, monospace",
                }}
              >
                {active.file} · {active.id}
              </p>
              {rest.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--ink)",
                      margin: "0 0 8px",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Also linked
                  </p>
                  {rest.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        border: "1px solid var(--line)",
                        background: "var(--card)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--ink)",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        {p.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--slate)",
                          marginLeft: 8,
                          fontFamily: "Inter, monospace",
                        }}
                      >
                        {p.version} · {p.owner_dept}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
