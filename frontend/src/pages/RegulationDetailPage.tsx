import { useMemo, useState } from "react"
import { useApp } from "../App"
import { useApi } from "../hooks/useApi"
import { api, pilotApi } from "../lib/api"
import { getPoliciesForReg } from "../lib/bankDemoManifest"
import PolicyDrawer from "../components/PolicyDrawer"
import ObligationReview from "../components/ObligationReview"
import type {
  RegulationOut,
  MAPOut,
  GraphResponse,
  IngestResponse,
  ObligationOut,
} from "../lib/types"
import { canReviewRole } from "../lib/types"
import {
  Card,
  SectionHead,
  StatusChip,
  statusToneFor,
  EmptyState,
} from "../components/ui"

export default function RegulationDetailPage() {
  const { navigate, toast, selectedId, user } = useApp()
  const [activeTab, setActiveTab] = useState<"maps" | "graph" | "history">(
    "maps",
  )
  const [ingesting, setIngesting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [reviewBusy, setReviewBusy] = useState<string | null>(null)
  const canReview = canReviewRole(user?.role)

  const {
    data: regulation,
    loading: regLoading,
    error: regError,
    refetch: regRefetch,
  } = useApi<RegulationOut>(() => {
    if (!selectedId) return Promise.reject(new Error("No regulation selected"))
    return api.get<RegulationOut>(`/regulations/${selectedId}`)
  }, [selectedId])

  const {
    data: maps,
    loading: mapsLoading,
    refetch: mapsRefetch,
  } = useApi<MAPOut[]>(() => {
    if (!selectedId) return Promise.resolve([])
    return api.get<MAPOut[]>(`/maps/?regulation_id=${selectedId}`)
  }, [selectedId])

  const { data: graph, loading: graphLoading } = useApi<GraphResponse>(() => {
    if (!selectedId || activeTab !== "graph")
      return Promise.resolve({
        nodes: [],
        edges: [],
        critical_path: [],
        topological_order: [],
      })
    return api.get<GraphResponse>(`/regulations/${selectedId}/graph`)
  }, [selectedId, activeTab])

  const { data: obligations, refetch: obligationsRefetch } =
    useApi<ObligationOut[]>(() => {
      if (!selectedId) return Promise.resolve([])
      return pilotApi.listObligations(selectedId)
    }, [selectedId])

  const handleObligationDecision = async (
    ob: ObligationOut,
    decision: "approve" | "reject",
    rationale?: string,
  ) => {
    if (!selectedId || !user) return
    setReviewBusy(ob.id)
    try {
      await pilotApi.reviewObligation(selectedId, ob.id, {
        decision,
        reviewer_id: user.id,
        rationale,
      })
      toast(
        "success",
        decision === "approve" ? "Obligation approved" : "Obligation rejected",
      )
      obligationsRefetch()
    } catch (err: unknown) {
      toast(
        "error",
        "Obligation review failed",
        err instanceof Error ? err.message : "Unknown error",
      )
    } finally {
      setReviewBusy(null)
    }
  }

  const linkedPolicies = useMemo(
    () => getPoliciesForReg(selectedId ?? "", regulation?.title ?? ""),
    [selectedId, regulation?.title],
  )

  const handleIngest = async () => {
    if (!selectedId) return
    setIngesting(true)
    try {
      const res = await api.post<IngestResponse>(
        `/regulations/${selectedId}/ingest`,
      )
      toast(
        "success",
        `Ingested — ${res.clause_count} clauses, ${res.document_class}`,
      )
      regRefetch()
    } catch (err: unknown) {
      toast(
        "error",
        "Ingest failed",
        err instanceof Error ? err.message : "Unknown error",
      )
    } finally {
      setIngesting(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedId) return
    setGenerating(true)
    try {
      const newMaps = await api.post<MAPOut[]>(
        `/regulations/${selectedId}/generate`,
      )
      toast("success", `Generated ${newMaps.length} MAPs`)
      mapsRefetch()
      regRefetch()
    } catch (err: unknown) {
      toast(
        "error",
        "Generate failed",
        err instanceof Error ? err.message : "Unknown error",
      )
    } finally {
      setGenerating(false)
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
            color: "var(--brass)",
          }}
        >
          § NO FOLIO SELECTED
        </div>
        <p style={{ fontSize: 14, color: "var(--slate)", margin: "8px 0 0" }}>
          Return to the circulars ledger.
        </p>
        <button
          onClick={() => navigate("regulations")}
          className="pv-btn-primary"
          style={{ marginTop: 16 }}
        >
          ← Back
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
          onClick={() => navigate("regulations")}
          className="pv-btn-ghost"
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          ← Circulars
        </button>
        <span style={{ color: "var(--line)", fontSize: 12 }}>/</span>
        <span
          className="pv-mono"
          style={{ fontSize: 12, color: "var(--slate)" }}
        >
          {selectedId.slice(0, 8)}…
        </span>
      </div>

      {regError && (
        <div
          style={{
            background: "var(--scarlet-bg)",
            border: "1px solid #EFC4BE",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p style={{ fontSize: 13, color: "var(--scarlet)", margin: 0 }}>
            {regError}
          </p>
          <button
            onClick={regRefetch}
            className="pv-btn-ghost"
            style={{ color: "var(--scarlet)", borderColor: "#EFC4BE" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Folio hero — navy ledger plate */}
      <section
        style={{
          background: "linear-gradient(160deg, #10253C 0%, #0C1B2D 65%)",
          border: "1px solid #22394F",
          borderRadius: 12,
          padding: "26px 28px",
          marginBottom: 16,
          position: "relative",
          overflow: "hidden",
          color: "#F6F1E2",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(400px 220px at 85% 0%, rgba(197,162,84,0.16), transparent 65%)",
            pointerEvents: "none",
          }}
        />
        {regLoading ? (
          <div
            style={{
              height: 120,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 8,
            }}
          />
        ) : (
          regulation && (
            <div style={{ position: "relative" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <span
                  className="pv-mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#D9BC6B",
                    border: "1px solid rgba(217,188,107,0.45)",
                    padding: "3px 10px",
                    borderRadius: 999,
                  }}
                >
                  {regulation.id.slice(0, 8)}…
                </span>
                <StatusChip tone={statusToneFor(regulation.status)}>
                  {regulation.status}
                </StatusChip>
              </div>
              <h1
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: 24,
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                  maxWidth: 720,
                }}
              >
                {regulation.title ?? "(untitled)"}
              </h1>
              {regulation.summary && (
                <p
                  style={{
                    fontSize: 13,
                    color: "#AEB9C6",
                    margin: "10px 0 0",
                    lineHeight: 1.6,
                    maxWidth: 640,
                  }}
                >
                  {regulation.summary}
                </p>
              )}
            </div>
          )
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 20,
            paddingTop: 18,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            position: "relative",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleIngest}
            disabled={ingesting}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 9,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: ingesting ? "not-allowed" : "pointer",
              color: "#F6F1E2",
              opacity: ingesting ? 0.6 : 1,
            }}
          >
            {ingesting ? "Ingesting…" : "Ingest PDF"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="pv-btn-primary pv-btn-brass"
            style={{ fontSize: 12.5, opacity: generating ? 0.7 : 1 }}
          >
            {generating ? "Generating…" : "Generate MAPs"}
          </button>
          {linkedPolicies.length > 0 ? (
            <button
              onClick={() => setPolicyOpen(true)}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 9,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                color: "#F6F1E2",
              }}
            >
              Internal policy ({linkedPolicies[0].version})
            </button>
          ) : (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
              No linked policy
            </span>
          )}
        </div>
      </section>

      <PolicyDrawer
        open={policyOpen}
        policies={linkedPolicies}
        onClose={() => setPolicyOpen(false)}
      />

      <Card>
        <div data-testid="obligation-section">
          <SectionHead
            eyebrow={`§ Obligation ledger · ${(obligations ?? []).length} candidate(s)`}
            title="Obligations"
            sub="Each obligation carries its source quote and page. Approval requires a valid citation and a reviewer different from the creator."
          />
          {(obligations ?? []).length === 0 ? (
            <EmptyState
              title="No obligation candidates yet"
              hint="Ingest the circular to extract obligations."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(obligations ?? []).map((ob) => (
                <ObligationReview
                  key={ob.id}
                  obligation={ob}
                  canReview={canReview}
                  busy={reviewBusy === ob.id}
                  onApprove={(rationale) =>
                    void handleObligationDecision(ob, "approve", rationale)
                  }
                  onReject={(rationale) =>
                    void handleObligationDecision(ob, "reject", rationale)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      <div
        style={{
          display: "flex",
          gap: 2,
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: 3,
          margin: "16px 0",
          alignSelf: "flex-start",
          width: "fit-content",
        }}
      >
        {(["maps", "graph", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="pv-segtab"
            data-active={activeTab === tab}
            style={{ textTransform: "capitalize" }}
          >
            {tab}
            {tab === "maps" && maps && (
              <span className="pv-mono" style={{ marginLeft: 6, fontSize: 10 }}>
                ({maps.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "maps" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mapsLoading ? (
            <div
              style={{ height: 160, background: "#F1EFE9", borderRadius: 12 }}
            />
          ) : (maps ?? []).length === 0 ? (
            <Card>
              <EmptyState
                title="No MAPs yet"
                hint="Ingest the PDF, then generate MAPs to populate this folio."
              />
            </Card>
          ) : (
            (maps ?? []).map((map) => (
              <Card
                key={map.id}
                style={{ padding: "16px 20px", cursor: "pointer" }}
              >
                <div onClick={() => navigate("map-review", map.id)}>
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
                          marginBottom: 6,
                        }}
                      >
                        <span
                          className="pv-mono"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--faint)",
                          }}
                        >
                          {map.id.slice(0, 8)}…
                        </span>
                        <StatusChip tone={statusToneFor(map.status)}>
                          {map.status}
                        </StatusChip>
                        {map.approval_state && (
                          <span style={{ fontSize: 11, color: "var(--slate)" }}>
                            {map.approval_state}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                        {map.description}
                      </p>
                      <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                        {map.deadline && (
                          <span
                            className="pv-mono"
                            style={{ fontSize: 11, color: "var(--slate)" }}
                          >
                            Due {map.deadline}
                          </span>
                        )}
                        {map.estimated_days != null && (
                          <span style={{ fontSize: 11, color: "var(--slate)" }}>
                            Est. {map.estimated_days}d
                          </span>
                        )}
                      </div>
                    </div>
                    {map.confidence != null && (
                      <span
                        className="pv-numeral"
                        style={{ fontSize: 24, fontWeight: 600, flexShrink: 0 }}
                      >
                        {Math.round(map.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
          <button
            onClick={() => navigate("map-tasks")}
            className="pv-btn-ghost"
            style={{ justifyContent: "center", borderStyle: "dashed" }}
          >
            View all MAP tasks
          </button>
        </div>
      )}

      {activeTab === "graph" && (
        <Card>
          <SectionHead
            eyebrow="§ Dependency map"
            title="Obligation graph"
            sub="Blocking relationships between MAPs."
          />
          {graphLoading ? (
            <div
              style={{ height: 160, background: "#F1EFE9", borderRadius: 12 }}
            />
          ) : !graph || graph.nodes.length === 0 ? (
            <EmptyState
              title="No dependency graph yet"
              hint="Generate MAPs first."
            />
          ) : (
            <div>
              <p
                className="pv-mono"
                style={{
                  fontSize: 11,
                  color: "var(--slate)",
                  margin: "0 0 14px",
                }}
              >
                {graph.nodes.length} NODES · {graph.edges.length} EDGES ·{" "}
                {graph.critical_path.length} CRITICAL
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {graph.nodes.map((n) => (
                  <span
                    key={n.id}
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                  >
                    {n.label || n.id.slice(0, 8)}
                    {n.department && (
                      <span style={{ fontWeight: 400, color: "var(--slate)" }}>
                        {" "}
                        · {n.department}
                      </span>
                    )}
                  </span>
                ))}
              </div>
              {graph.critical_path.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <p
                    className="pv-mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      color: "var(--scarlet)",
                      margin: "0 0 8px",
                    }}
                  >
                    CRITICAL PATH
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {graph.critical_path.map((id, i) => {
                      const n = graph.nodes.find((x) => x.id === id)
                      return (
                        <span
                          key={id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <StatusChip tone="bad">
                            {n?.label ?? id.slice(0, 8)}
                          </StatusChip>
                          {i < graph.critical_path.length - 1 && (
                            <span
                              style={{ color: "var(--scarlet)", fontSize: 12 }}
                            >
                              →
                            </span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {activeTab === "history" && (
        <Card>
          <SectionHead
            eyebrow="§ Audit trail"
            title="Folio history"
            sub="Immutable intake record."
          />
          {regulation ? (
            <div style={{ display: "flex", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "var(--brass)",
                    border: "2px solid var(--ink)",
                    flexShrink: 0,
                    marginTop: 3,
                  }}
                />
                <div
                  style={{
                    width: 1,
                    flex: 1,
                    background: "var(--line)",
                    marginTop: 4,
                  }}
                />
              </div>
              <div>
                <p style={{ fontSize: 13, margin: 0 }}>
                  <strong>System</strong> — regulation uploaded
                </p>
                <p
                  className="pv-mono"
                  style={{
                    fontSize: 11,
                    color: "var(--slate)",
                    margin: "4px 0 0",
                  }}
                >
                  {new Date(regulation.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ) : (
            <EmptyState title="No history available" />
          )}
        </Card>
      )}
    </div>
  )
}
