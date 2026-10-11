import { useState } from "react"
import { useApp } from "../App"
import { useApi } from "../hooks/useApi"
import { api, pilotApi } from "../lib/api"
import PlanDiff from "../components/PlanDiff"
import type { MAPOut, MAPReviewAction, PlanDiffOut } from "../lib/types"
import { canReviewRole } from "../lib/types"
import { Card, SectionHead, StatusChip, statusToneFor } from "../components/ui"

export default function MapReviewPage() {
  const { navigate, toast, selectedId, user } = useApp()
  const [comments, setComments] = useState<{
    author: string
    avatar: string
    time: string
    text: string
  }[]>([])
  const [commentText, setCommentText] = useState("")
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [candidatePlanId, setCandidatePlanId] = useState("")
  const [previousPlanId, setPreviousPlanId] = useState("")
  const [planDiff, setPlanDiff] = useState<PlanDiffOut | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planApproving, setPlanApproving] = useState(false)
  const [planError, setPlanError] = useState("")
  const canReview = canReviewRole(user?.role)

  const {
    data: mapData,
    loading,
    error,
    refetch,
  } = useApi<MAPOut>(() => {
    if (!selectedId) return Promise.reject(new Error("No MAP selected"))
    return api.get<MAPOut>(`/maps/${selectedId}`)
  }, [selectedId])

  const evidenceList: string[] = mapData?.evidence_required
    ? Array.isArray(mapData.evidence_required)
      ? mapData.evidence_required
      : typeof mapData.evidence_required === "string" &&
          mapData.evidence_required.trim()
        ? mapData.evidence_required
            .split(/\r?\n|;/)
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    : []

  const sourceClauses: string[] = mapData?.source_clauses
    ? Array.isArray(mapData.source_clauses)
      ? mapData.source_clauses
      : typeof mapData.source_clauses === "string" &&
          mapData.source_clauses.trim()
        ? [mapData.source_clauses]
        : []
    : []

  const formattedDeadline = mapData?.deadline
    ? (() => {
        const d = new Date(mapData.deadline)
        return isNaN(d.getTime())
          ? mapData.deadline
          : d.toLocaleDateString("en-IN")
      })()
    : "—"

  const formattedCreatedAt = mapData?.created_at
    ? (() => {
        const d = new Date(mapData.created_at)
        return isNaN(d.getTime())
          ? mapData.created_at
          : d.toLocaleDateString("en-IN")
      })()
    : "—"

  const handleSubmitReview = async () => {
    if (!decision || !selectedId) return
    setSubmitting(true)
    try {
      const action: MAPReviewAction = {
        action: decision,
        description: reviewNotes || undefined,
      }
      await api.post(`/maps/${selectedId}/review`, action)
      setSubmitted(true)
      toast(
        decision === "approve" ? "success" : "warning",
        decision === "approve" ? "MAP Approved" : "Revision Requested",
        decision === "approve"
          ? "MAP has been approved and closed."
          : "MAP returned to assignee for revision.",
      )
      setTimeout(() => navigate("map-tasks"), 1200)
    } catch (err: unknown) {
      toast(
        "error",
        "Review failed",
        err instanceof Error ? err.message : "Unknown error",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handlePostComment = () => {
    if (!commentText.trim()) return
    setComments((prev) => [
      { author: "You", avatar: "ME", time: "just now", text: commentText },
      ...prev,
    ])
    setCommentText("")
    toast(
      "info",
      "Comment posted",
      "Your comment has been added to the discussion.",
    )
  }

  const handleLoadDiff = async () => {
    if (!candidatePlanId.trim() || !previousPlanId.trim()) return
    setPlanLoading(true)
    setPlanError("")
    try {
      const diff = await pilotApi.diffPlans(
        candidatePlanId.trim(),
        previousPlanId.trim(),
      )
      setPlanDiff(diff)
    } catch (err: unknown) {
      setPlanError(err instanceof Error ? err.message : "Diff failed")
    } finally {
      setPlanLoading(false)
    }
  }

  const handleApprovePlan = async (rationale?: string) => {
    if (!candidatePlanId.trim()) return
    setPlanApproving(true)
    try {
      await pilotApi.approvePlan(candidatePlanId.trim(), rationale)
      toast(
        "success",
        "Plan approved",
        "Candidate plan approved; prior active plan superseded.",
      )
      setPlanDiff(null)
      setCandidatePlanId("")
    } catch (err: unknown) {
      toast(
        "error",
        "Plan approval failed",
        err instanceof Error ? err.message : "Unknown error",
      )
    } finally {
      setPlanApproving(false)
    }
  }

  if (!selectedId) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div
          className="pv-mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "var(--teal)",
          }}
        >
          § NO MAP SELECTED
        </div>
        <p style={{ fontSize: 14, color: "var(--slate)", margin: "8px 0 0" }}>
          Choose a MAP from the action register.
        </p>
        <button
          onClick={() => navigate("map-tasks")}
          className="pv-btn-primary"
          style={{ marginTop: 16 }}
        >
          ← Back to MAP tasks
        </button>
      </div>
    )
  }

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => navigate("map-tasks")}
          className="pv-btn-ghost"
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          ← MAP Tasks
        </button>
        <span style={{ color: "var(--line)", fontSize: 12 }}>/</span>
        <span
          className="pv-mono"
          style={{ fontSize: 12, color: "var(--slate)" }}
        >
          {selectedId.slice(0, 8)}…
        </span>
        <span style={{ color: "var(--line)", fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Checker review</span>
      </div>

      {error && (
        <div
          style={{
            background: "var(--critical-bg)",
            border: "1px solid var(--critical-border)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p style={{ fontSize: 13, color: "var(--critical)", margin: 0 }}>
            {error}
          </p>
          <button
            onClick={refetch}
            className="pv-btn-ghost"
            style={{
              color: "var(--critical)",
              borderColor: "var(--critical-border)",
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minWidth: 0,
          }}
        >
          <Card>
            {loading ? (
              <div
                style={{ height: 180, background: "#F1EFE9", borderRadius: 8 }}
              />
            ) : (
              mapData && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          className="pv-mono"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--slate)",
                          }}
                        >
                          {mapData.id.slice(0, 8)}…
                        </span>
                        <StatusChip tone={statusToneFor(mapData.status)}>
                          {mapData.status}
                        </StatusChip>
                        {mapData.approval_state && (
                          <StatusChip
                            tone={statusToneFor(mapData.approval_state)}
                          >
                            {mapData.approval_state}
                          </StatusChip>
                        )}
                      </div>
                      <h1
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          margin: 0,
                          lineHeight: 1.35,
                          color: "var(--ink)",
                        }}
                      >
                        {mapData.description}
                      </h1>
                      {mapData.reasoning && (
                        <p
                          style={{
                            fontSize: 13,
                            color: "var(--slate)",
                            margin: "10px 0 0",
                            lineHeight: 1.6,
                          }}
                        >
                          {mapData.reasoning}
                        </p>
                      )}
                    </div>
                    {mapData.confidence != null && (
                      <div style={{ flexShrink: 0, textAlign: "center" }}>
                        <div
                          style={{
                            position: "relative",
                            width: 76,
                            height: 76,
                          }}
                        >
                          <svg
                            width="76"
                            height="76"
                            style={{ transform: "rotate(-90deg)" }}
                          >
                            <circle
                              cx="38"
                              cy="38"
                              r="30"
                              fill="none"
                              stroke="#EFEEE8"
                              strokeWidth="7"
                            />
                            <circle
                              cx="38"
                              cy="38"
                              r="30"
                              fill="none"
                              stroke="var(--teal)"
                              strokeWidth="7"
                              strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 30}`}
                              strokeDashoffset={`${2 * Math.PI * 30 * (1 - mapData.confidence)}`}
                            />
                          </svg>
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              className="pv-numeral"
                              style={{
                                fontSize: 17,
                                fontWeight: 700,
                                color: "var(--ink)",
                              }}
                            >
                              {Math.round(mapData.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                        <p
                          className="pv-mono"
                          style={{
                            fontSize: 9,
                            letterSpacing: "0.1em",
                            color: "var(--faint)",
                            margin: "4px 0 0",
                          }}
                        >
                          CONFIDENCE
                        </p>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 28,
                      marginTop: 18,
                      paddingTop: 14,
                      borderTop: "1px solid var(--line-soft)",
                    }}
                  >
                    {[
                      { label: "Deadline", value: formattedDeadline },
                      {
                        label: "Est. Days",
                        value: mapData.estimated_days
                          ? `${mapData.estimated_days}d`
                          : "—",
                      },
                      { label: "Created", value: formattedCreatedAt },
                    ].map((item) => (
                      <div key={item.label}>
                        <p
                          className="pv-mono"
                          style={{
                            fontSize: 9.5,
                            letterSpacing: "0.1em",
                            color: "var(--faint)",
                            margin: 0,
                          }}
                        >
                          {item.label.toUpperCase()}
                        </p>
                        <p
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            margin: "2px 0 0",
                            color: "var(--ink)",
                          }}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )
            )}
          </Card>

          {evidenceList.length > 0 && (
            <Card>
              <SectionHead
                eyebrow="§ Evidence checklist"
                title="Evidence required"
                sub={`${evidenceList.length} artefact(s) needed to close this MAP.`}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {evidenceList.map((ev, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      borderRadius: 9,
                      background: "var(--paper)",
                      border: "1px solid var(--line-soft)",
                    }}
                  >
                    <span
                      className="pv-mono"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--teal)",
                        background: "var(--teal-wash)",
                        border: "1px solid var(--teal-light)",
                        borderRadius: 6,
                        padding: "3px 8px",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        margin: 0,
                        color: "var(--ink)",
                      }}
                    >
                      {ev}
                    </p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("evidence", selectedId)}
                className="pv-btn-primary"
                style={{ marginTop: 14, fontSize: 12 }}
              >
                Upload evidence
              </button>
            </Card>
          )}

          {sourceClauses.length > 0 && (
            <Card>
              <SectionHead
                eyebrow="§ Source traceability"
                title="Source clauses"
                sub="Folio citations backing this MAP."
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sourceClauses.map((c, i) => (
                  <span
                    key={i}
                    className="pv-mono"
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      borderRadius: 7,
                      padding: "5px 10px",
                      fontSize: 11,
                      color: "var(--slate)",
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <div data-testid="plan-section">
              <SectionHead
                eyebrow="§ Plan control"
                title="Plan version review"
                sub="Compare candidate against active plan, then approve with supersession."
              />
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  data-testid="plan-candidate-input"
                  value={candidatePlanId}
                  onChange={(e) => setCandidatePlanId(e.target.value)}
                  placeholder="Candidate plan ID"
                  className="pv-input pv-mono"
                  style={{ flex: 1 }}
                />
                <input
                  data-testid="plan-previous-input"
                  value={previousPlanId}
                  onChange={(e) => setPreviousPlanId(e.target.value)}
                  placeholder="Active plan ID"
                  className="pv-input pv-mono"
                  style={{ flex: 1 }}
                />
                <button
                  data-testid="load-plan-diff"
                  onClick={handleLoadDiff}
                  disabled={
                    planLoading ||
                    !candidatePlanId.trim() ||
                    !previousPlanId.trim()
                  }
                  className="pv-btn-primary"
                  style={{ opacity: planLoading ? 0.6 : 1 }}
                >
                  {planLoading ? "Loading…" : "Show diff"}
                </button>
              </div>
              {planError && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--critical)",
                    margin: "0 0 8px",
                  }}
                >
                  {planError}
                </p>
              )}
              {planDiff && (
                <PlanDiff
                  diff={planDiff}
                  candidateVersion={null}
                  canApprove={canReview}
                  busy={planApproving}
                  onApprove={(rationale) => void handleApprovePlan(rationale)}
                />
              )}
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section
            style={{
              background: "var(--ink)",
              borderRadius: 12,
              padding: 20,
              color: "#F6F1E2",
            }}
          >
            <div
              className="pv-mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                color: "var(--teal-bright)",
              }}
            >
              § CHECKER DECISION
            </div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                margin: "6px 0 4px",
                color: "#fff",
              }}
            >
              Review decision
            </h3>
            <p style={{ fontSize: 11.5, color: "#93A0B1", margin: "0 0 16px" }}>
              Recorded under your officer identity.
            </p>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background:
                      decision === "approve" ? "var(--teal-bright)" : "#C0574B",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke={decision === "approve" ? "#0C1B2D" : "#fff"}
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    {decision === "approve" ? (
                      <polyline points="20 6 9 17 4 12" />
                    ) : (
                      <>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </>
                    )}
                  </svg>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
                  {decision === "approve"
                    ? "MAP Approved"
                    : "Revision Requested"}
                </p>
                <p
                  style={{ fontSize: 11, color: "#93A0B1", margin: "4px 0 0" }}
                >
                  Redirecting…
                </p>
              </div>
            ) : canReview ? (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {(["approve", "reject"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDecision(d)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 9,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                        border: `1px solid ${
                          decision === d
                            ? "var(--teal-bright)"
                            : "rgba(255,255,255,0.16)"
                        }`,
                        background:
                          decision === d
                            ? "rgba(20, 184, 166, 0.16)"
                            : "transparent",
                        color: "#F6F1E2",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {d === "approve" ? "Approve MAP" : "Request revision"}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Review notes (optional)…"
                  style={{
                    width: "100%",
                    height: 76,
                    border: "1px solid rgba(255,255,255,0.16)",
                    borderRadius: 9,
                    padding: "10px 12px",
                    fontSize: 12,
                    background: "rgba(255,255,255,0.05)",
                    color: "#F6F1E2",
                    resize: "none",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={!decision || submitting}
                  className="pv-btn-primary"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginTop: 12,
                    opacity: decision ? 1 : 0.45,
                  }}
                >
                  {submitting ? "Submitting…" : "Submit review"}
                </button>
              </>
            ) : (
              <p
                data-testid="review-hidden"
                style={{ fontSize: 11.5, color: "#93A0B1", margin: "8px 0 0" }}
              >
                Review actions are hidden — reviewer role required.
              </p>
            )}
          </section>

          <Card>
            <SectionHead eyebrow="§ Discussion" title="Review thread" />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                marginBottom: 14,
              }}
            >
              {comments.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--faint)", margin: 0 }}>
                  No comments yet — start the checker thread.
                </p>
              ) : (
                comments.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 10 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: "var(--ink)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "var(--teal-bright)",
                        flexShrink: 0,
                      }}
                    >
                      {c.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--ink)",
                          }}
                        >
                          {c.author}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--faint)" }}>
                          {c.time}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--slate)",
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        {c.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div
              style={{
                borderTop: "1px solid var(--line-soft)",
                paddingTop: 12,
              }}
            >
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                    handlePostComment()
                }}
                className="pv-input"
                style={{
                  width: "100%",
                  height: 68,
                  padding: "10px 12px",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <span
                  className="pv-mono"
                  style={{ fontSize: 10, color: "var(--faint)" }}
                >
                  ⌘↵ TO POST
                </span>
                <button
                  onClick={handlePostComment}
                  disabled={!commentText.trim()}
                  className="pv-btn-primary"
                  style={{
                    padding: "7px 14px",
                    fontSize: 12,
                    opacity: commentText.trim() ? 1 : 0.5,
                  }}
                >
                  Post
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
