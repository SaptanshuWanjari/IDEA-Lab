import { useState } from "react"
import type { PlanDiffOut } from "../lib/types"

interface Props {
  diff: PlanDiffOut
  candidateVersion: number | null
  canApprove: boolean
  busy?: boolean
  onApprove: (rationale?: string) => void
}

/** Plan diff with explicit supersession confirmation before approval. */
export default function PlanDiff({
  diff,
  candidateVersion,
  canApprove,
  busy,
  onApprove,
}: Props) {
  const [supersede, setSupersede] = useState(false)
  const [rationale, setRationale] = useState("")

  return (
    <div
      data-testid="plan-diff"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E8E8E3",
        borderRadius: 16,
        padding: "16px 18px",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#0A0A0A",
            fontFamily: "Inter",
          }}
        >
          Plan diff{candidateVersion != null ? ` → v${candidateVersion}` : ""}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "#888880",
            fontFamily: "IBM Plex Mono, monospace",
          }}
        >
          {diff.previous_id.slice(0, 8)}… → {diff.candidate_id.slice(0, 8)}…
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginBottom: 12,
        }}
      >
        {([
          {
            label: `Added (${diff.added.length})`,
            items: diff.added,
            testId: "plan-diff-added",
            color: "#2D8A4E",
          },
          {
            label: `Removed (${diff.removed.length})`,
            items: diff.removed,
            testId: "plan-diff-removed",
            color: "#C13B2A",
          },
          {
            label: `Unchanged (${diff.unchanged.length})`,
            items: diff.unchanged,
            testId: "plan-diff-unchanged",
            color: "#888880",
          },
        ] as const).map((col) => (
          <div
            key={col.testId}
            data-testid={col.testId}
            style={{
              background: "#FAFAF8",
              border: "1px solid #F0F0EA",
              borderRadius: 10,
              padding: 10,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: col.color,
                margin: "0 0 6px",
                fontFamily: "Inter",
              }}
            >
              {col.label}
            </p>
            {col.items.length === 0 ? (
              <p
                style={{
                  fontSize: 11,
                  color: "#AAAAAA",
                  margin: 0,
                  fontFamily: "Inter",
                }}
              >
                —
              </p>
            ) : (
              col.items.slice(0, 8).map((id) => (
                <p
                  key={id}
                  style={{
                    fontSize: 11,
                    color: "#444440",
                    margin: "0 0 3px",
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                >
                  {id.slice(0, 12)}…
                </p>
              ))
            )}
          </div>
        ))}
      </div>
      {canApprove ? (
        <div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "#0A0A0A",
              fontFamily: "Inter",
              cursor: "pointer",
            }}
          >
            <input
              data-testid="supersession-confirm"
              type="checkbox"
              checked={supersede}
              onChange={(e) => setSupersede(e.target.checked)}
            />
            I confirm approving supersedes the currently active plan atomically.
          </label>
          <textarea
            data-testid="plan-rationale"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Approval rationale (optional)…"
            style={{
              width: "100%",
              height: 48,
              border: "1px solid #E8E8E3",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 12,
              fontFamily: "Inter",
              resize: "none",
              outline: "none",
              boxSizing: "border-box",
              marginTop: 8,
            }}
          />
          <button
            data-testid="approve-plan"
            onClick={() => onApprove(rationale.trim() || undefined)}
            disabled={busy || !supersede}
            style={{
              marginTop: 8,
              padding: "8px 16px",
              background: supersede ? "#0C1B2D" : "#F5F5F0",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: supersede && !busy ? "pointer" : "not-allowed",
              fontFamily: "Inter",
              color: supersede ? "#F6F1E2" : "#AAAAAA",
            }}
          >
            {busy ? "Approving…" : "Approve plan (supersede active)"}
          </button>
        </div>
      ) : (
        <p
          data-testid="plan-review-hidden"
          style={{
            fontSize: 11,
            color: "#AAAAAA",
            fontFamily: "Inter",
            margin: 0,
          }}
        >
          Plan approval is hidden — reviewer role required.
        </p>
      )}
    </div>
  )
}
