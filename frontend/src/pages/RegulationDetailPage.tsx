import { useMemo, useState } from "react"
import { useApp } from "../App"
import { useApi } from "../hooks/useApi"
import { api, pilotApi } from "../lib/api"
import { getPoliciesForReg } from "../lib/bankDemoManifest"
import PolicyDrawer from "../components/PolicyDrawer"
import ObligationReview from "../components/ObligationReview"
import DependencyGraph from "../components/DependencyGraph"
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
    () =>
      getPoliciesForReg(
        selectedId ?? "",
        regulation?.title,
        regulation?.summary,
        regulation?.source_pdf_url,
      ),
    [
      selectedId,
      regulation?.title,
      regulation?.summary,
      regulation?.source_pdf_url,
    ],
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
      <div className="w-full py-16 flex items-center justify-center">
        <Card pad className="max-w-md w-full text-center">
          <EmptyState
            title="No regulation selected"
            hint="Return to the circulars ledger to select and inspect an RBI compliance folio."
            action={
              <button
                onClick={() => navigate("regulations")}
                className="pv-btn-primary"
              >
                ← Return to Regulations
              </button>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Breadcrumbs Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <button
          onClick={() => navigate("regulations")}
          className="pv-btn-ghost py-1 px-2.5 text-xs text-slate-600 hover:text-ink font-medium"
        >
          ← Regulations
        </button>
        <span className="text-slate-300">/</span>
        <span className="font-mono text-slate-500 font-medium">
          {selectedId.slice(0, 8)}…
        </span>
      </nav>

      {/* Error Alert */}
      {regError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl flex items-center justify-between"
          style={{
            background: "var(--critical-bg)",
            border: "1px solid var(--critical-border)",
            color: "var(--critical)",
          }}
        >
          <p className="text-xs font-medium m-0">{regError}</p>
          <button
            onClick={regRefetch}
            className="pv-btn-ghost text-xs"
            style={{ color: "var(--critical)" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Folio Hero — Unified Navy/Teal Plate */}
      <section
        className="relative overflow-hidden rounded-xl border border-[#1E3A5F] p-6 sm:p-7 text-white shadow-sm"
        style={{
          background: "linear-gradient(165deg, var(--ink) 0%, #0C1E33 60%, #071524 100%)",
        }}
      >
        {/* Subtle ambient teal glow matching app theme */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(500px 260px at 85% 0%, rgba(13, 148, 136, 0.2), transparent 70%)",
          }}
          aria-hidden="true"
        />

        {regLoading ? (
          <div className="h-28 bg-white/5 rounded-lg animate-pulse" />
        ) : (
          regulation && (
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                <span className="bg-teal-950/70 text-teal-300 border border-teal-500/40 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide font-mono">
                  {regulation.id.slice(0, 8)}…
                </span>
                <StatusChip tone={statusToneFor(regulation.status)}>
                  {regulation.status}
                </StatusChip>
              </div>

              <h1 className="text-[22px] sm:text-[25px] font-semibold text-white tracking-tight leading-snug m-0 max-w-3xl">
                {regulation.title ?? "(untitled)"}
              </h1>

              {regulation.summary && (
                <p className="text-[13.5px] text-slate-300 mt-2.5 mb-0 leading-relaxed max-w-2xl">
                  {regulation.summary}
                </p>
              )}
            </div>
          )
        )}

        <div className="relative z-10 flex items-center gap-2.5 mt-5 pt-4.5 border-t border-white/10 flex-wrap">
          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-600/60 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {ingesting ? "Ingesting…" : "Ingest PDF"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="pv-btn-primary"
            style={{ fontSize: 12.5 }}
          >
            {generating ? "Generating…" : "Generate MAPs"}
          </button>
          {linkedPolicies.length > 0 ? (
            <button
              onClick={() => setPolicyOpen(true)}
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600/60 rounded-lg text-xs font-semibold transition-colors"
            >
              Internal policy ({linkedPolicies[0].version})
            </button>
          ) : (
            <span className="text-xs text-white/50">
              No linked policy
            </span>
          )}
        </div>
      </section>

      {/* Internal Policy Drawer */}
      <PolicyDrawer
        open={policyOpen}
        policies={linkedPolicies}
        onClose={() => setPolicyOpen(false)}
      />

      {/* Obligations Review Section */}
      <Card>
        <div data-testid="obligation-section">
          <SectionHead
            eyebrow={`Obligation ledger · ${(obligations ?? []).length} candidate(s)`}
            title="Obligations"
            sub="Each obligation carries its source quote and page. Approval requires a valid citation and a reviewer different from the creator."
          />
          {(obligations ?? []).length === 0 ? (
            <EmptyState
              title="No obligation candidates yet"
              hint="Ingest the circular to extract obligations."
            />
          ) : (
            <div className="flex flex-col gap-3">
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

      {/* Segmented Navigation Tabs */}
      <div className="flex gap-1 p-1 bg-white border border-line rounded-xl my-1 self-start w-fit">
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
              <span className="pv-mono ml-1.5 text-[10px]">
                ({maps.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panel: MAPs */}
      {activeTab === "maps" && (
        <div className="flex flex-col gap-2.5">
          {mapsLoading ? (
            <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
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
                pad
                className="hover:border-slate-300 transition-colors cursor-pointer"
              >
                <div onClick={() => navigate("map-review", map.id)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="pv-mono text-[11px] font-semibold text-slate-400">
                          {map.id.slice(0, 8)}…
                        </span>
                        <StatusChip tone={statusToneFor(map.status)}>
                          {map.status}
                        </StatusChip>
                        {map.approval_state && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {map.approval_state}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-ink m-0">
                        {map.description}
                      </p>
                      <div className="flex gap-4 mt-1.5">
                        {map.deadline && (
                          <span className="pv-mono text-[11px] text-slate-500">
                            Due {map.deadline}
                          </span>
                        )}
                        {map.estimated_days != null && (
                          <span className="text-[11px] text-slate-500">
                            Est. {map.estimated_days}d
                          </span>
                        )}
                      </div>
                    </div>
                    {map.confidence != null && (
                      <span className="pv-numeral text-2xl font-semibold text-ink shrink-0">
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
            className="pv-btn-ghost justify-center border border-dashed border-line text-slate-600 hover:text-ink py-2"
          >
            View all MAP tasks
          </button>
        </div>
      )}

      {/* Tab Panel: Dependency Graph */}
      {activeTab === "graph" && (
        <Card>
          <SectionHead
            eyebrow="Dependency map"
            title="Obligation graph"
            sub="Blocking relationships between MAPs."
          />
          {graphLoading ? (
            <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
          ) : !graph || graph.nodes.length === 0 ? (
            <EmptyState
              title="No dependency graph yet"
              hint="Generate MAPs first to build the dependency lattice."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="pv-mono text-[11px] text-slate-500 m-0">
                  {graph.nodes.length} NODES · {graph.edges.length} EDGES ·{" "}
                  {graph.critical_path.length} CRITICAL
                </p>
                <button
                  onClick={() => navigate("digital-twin")}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-800 hover:underline"
                >
                  Open in Digital Twin →
                </button>
              </div>

              {/* Visual Dependency Graph Canvas */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <DependencyGraph
                  customNodes={graph.nodes}
                  customEdges={graph.edges}
                  customCriticalPath={graph.critical_path}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {graph.nodes.map((n) => (
                  <span
                    key={n.id}
                    className="bg-white border border-line text-ink rounded-lg text-[11.5px] font-semibold px-3 py-1.5"
                  >
                    {n.label || n.id.slice(0, 8)}
                    {n.department && (
                      <span className="font-normal text-slate-500">
                        {" "}
                        · {n.department}
                      </span>
                    )}
                  </span>
                ))}
              </div>

              {graph.critical_path.length > 0 && (
                <div className="mt-4.5">
                  <p className="pv-mono text-[10.5px] font-bold tracking-wider text-red-600 mb-2">
                    CRITICAL PATH
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {graph.critical_path.map((id, i) => {
                      const n = graph.nodes.find((x) => x.id === id)
                      return (
                        <span key={id} className="flex items-center gap-1.5">
                          <StatusChip tone="bad">
                            {n?.label ?? id.slice(0, 8)}
                          </StatusChip>
                          {i < graph.critical_path.length - 1 && (
                            <span className="text-red-500 text-xs">→</span>
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

      {/* Tab Panel: History Audit Trail */}
      {activeTab === "history" && (
        <Card>
          <SectionHead
            eyebrow="Audit trail"
            title="Folio history"
            sub="Immutable intake record and ledger events."
          />
          {regulation ? (
            <div className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "var(--teal)",
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
                <p className="text-[13px] text-ink m-0">
                  <strong>System</strong> — regulation uploaded
                </p>
                <p className="pv-mono text-[11px] text-slate-500 mt-1 mb-0">
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
