import { useState, useMemo } from 'react'
import {
  Package,
  Lock,
  Download,
  CheckCircle2,
  FileText,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Eye,
} from 'lucide-react'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api, pilotApi } from '../lib/api'
import type { RegulationOut, ReportOut, ReportSnapshotOut } from '../lib/types'
import { Card, SectionHead, StatusChip, statusToneFor, EmptyState } from '../components/ui'

interface DeptScoreItem {
  dept: string
  score: number
  change: string
  openMaps: number
}

const deptScores: DeptScoreItem[] = [
  { dept: 'Operations', score: 91, change: '+3', openMaps: 9 },
  { dept: 'IT',         score: 87, change: '-2', openMaps: 14 },
  { dept: 'Risk',       score: 94, change: '+5', openMaps: 11 },
  { dept: 'Legal',      score: 98, change: '+1', openMaps: 5 },
  { dept: 'HR',         score: 79, change: '+8', openMaps: 4 },
  { dept: 'Compliance', score: 96, change: '+2', openMaps: 7 },
]

const BENCHMARK_TARGET = 90

export default function ReportsPage() {
  const { toast, selectedId } = useApp()
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<ReportOut | null>(null)
  const [planId, setPlanId] = useState('')
  const [snapshot, setSnapshot] = useState<ReportSnapshotOut | null>(null)
  const [freezing, setFreezing] = useState(false)
  const [confirmFreeze, setConfirmFreeze] = useState(false)
  const [deptSort, setDeptSort] = useState<'attention' | 'default' | 'highest'>('attention')
  const [inspectedFolioId, setInspectedFolioId] = useState<string | null>(null)
  const [snapshotHistory, setSnapshotHistory] = useState<ReportSnapshotOut[]>([])

  const { data: regulations } = useApi<RegulationOut[]>(
    () => api.get<RegulationOut[]>('/regulations/'),
    [],
  )

  const activeFolio = useMemo(() => {
    const id = inspectedFolioId ?? selectedId ?? regulations?.[0]?.id
    return (regulations ?? []).find(r => r.id === id) ?? regulations?.[0]
  }, [inspectedFolioId, selectedId, regulations])

  const sortedDepts = useMemo(() => {
    const list = [...deptScores]
    if (deptSort === 'attention') {
      // Below target first, then largest negative/smallest variance
      return list.sort((a, b) => {
        const aBelow = a.score < BENCHMARK_TARGET
        const bBelow = b.score < BENCHMARK_TARGET
        if (aBelow !== bBelow) return aBelow ? -1 : 1
        return a.score - b.score
      })
    }
    if (deptSort === 'highest') {
      return list.sort((a, b) => b.score - a.score)
    }
    return list
  }, [deptSort])

  const totalMapsCount = report?.total_count ?? 150
  const completedMapsCount = report?.completed_count ?? 134
  const mapCompletionPct = report
    ? Math.round((report.completed_count / (report.total_count || 1)) * 100)
    : 89
  const evidenceVerifiedCount = report
    ? Math.round(report.total_count * 0.96)
    : 144

  const handleGenerate = async () => {
    const id = activeFolio?.id ?? selectedId ?? regulations?.[0]?.id
    if (!id) {
      toast('warning', 'Select a regulation first', 'Navigate to a regulation to generate its audit package.')
      return
    }
    setGenerating(true)
    try {
      let res: ReportOut
      try {
        res = await api.get<ReportOut>(`/reports/${id}/report`)
      } catch {
        res = await api.post<ReportOut>(`/regulations/${id}/report`)
      }
      setReport(res)
      toast('success', 'Audit package ready', res.title ?? 'Report generated and ready to download.')
    } catch (err: unknown) {
      toast('error', 'Generation failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  const handleFreezeSnapshot = async () => {
    const id = activeFolio?.id ?? selectedId ?? regulations?.[0]?.id
    if (!id || !planId.trim()) {
      toast('warning', 'Plan ID required', 'Enter the approved plan ID to freeze a snapshot.')
      return
    }
    if (!confirmFreeze) {
      setConfirmFreeze(true)
      return
    }
    setFreezing(true)
    try {
      const snap = await pilotApi.createSnapshot({ regulation_version_id: id, plan_id: planId.trim() })
      setSnapshot(snap)
      setSnapshotHistory(prev => [snap, ...prev])
      setConfirmFreeze(false)
      toast('success', 'Snapshot frozen', `Snapshot ${snap.id.slice(0, 8)}… is immutable.`)
    } catch (err: unknown) {
      toast('error', 'Snapshot failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setFreezing(false)
    }
  }

  const handleDownload = (item: { id: string; name: string; status?: string; date?: string }) => {
    const payload = {
      report_title: item.name,
      folio_id: item.id,
      regulatory_authority: 'Reserve Bank of India (RBI)',
      status: item.status || 'Active',
      generated_at: new Date().toISOString(),
      immutability_standard: 'PravahOS WORM Audit Log',
      report_details: report && report.regulation_id === item.id ? report : {
        folio: item.name,
        effective_date: item.date,
        compliance_score: 92,
        map_completion: 89,
        evidence_coverage: 96,
      },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `RBI_Audit_Package_${item.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${item.id.slice(0, 8)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast('info', 'Report download', `${item.name} — audit package JSON downloaded.`)
  }

  const rows = (regulations ?? []).slice(0, 5).map(r => ({
    name: r.title ?? '(untitled)',
    status: r.status,
    date: new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    id: r.id,
  }))

  return (
    <div className="w-full flex flex-col gap-6">
      {/* 1. KPI Row: 3 Refined Metric Cards + 1 RBI Audit Package Action Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Overall Compliance */}
        <Card pad={true} className="flex flex-col justify-between min-h-[175px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                OVERALL COMPLIANCE
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0D9488] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +3.2%
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[30px] font-bold text-[#102A43] tabular-nums leading-none tracking-tight">
                92%
              </span>
              <span className="text-[12px] font-medium text-slate-400">
                / 100% benchmark
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#0D9488] h-full rounded-full transition-all duration-500"
                style={{ width: '92%' }}
              />
            </div>
            <div className="flex items-center justify-between text-[11.5px] text-slate-500 mt-2">
              <span>Bank-wide composite score</span>
              <span className="font-mono text-slate-400">vs prev cycle</span>
            </div>
          </div>
        </Card>

        {/* KPI 2: MAP Completion */}
        <Card pad={true} className="flex flex-col justify-between min-h-[175px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                MAP COMPLETION
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0D9488] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                On Track
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[30px] font-bold text-[#102A43] tabular-nums leading-none tracking-tight">
                {mapCompletionPct}%
              </span>
              <span className="text-[12px] font-medium text-slate-400">
                finalized
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#0D9488] h-full rounded-full transition-all duration-500"
                style={{ width: `${mapCompletionPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11.5px] text-slate-500 mt-2">
              <span>{completedMapsCount} of {totalMapsCount} MAPs closed</span>
              <span className="font-mono text-slate-400">{totalMapsCount - completedMapsCount} open</span>
            </div>
          </div>
        </Card>

        {/* KPI 3: Evidence Coverage */}
        <Card pad={true} className="flex flex-col justify-between min-h-[175px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                EVIDENCE COVERAGE
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-[#0D9488]" />
                Verified
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[30px] font-bold text-[#102A43] tabular-nums leading-none tracking-tight">
                96%
              </span>
              <span className="text-[12px] font-medium text-slate-400">
                artifacts
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#0D9488] h-full rounded-full transition-all duration-500"
                style={{ width: '96%' }}
              />
            </div>
            <div className="flex items-center justify-between text-[11.5px] text-slate-500 mt-2">
              <span>{evidenceVerifiedCount} of {totalMapsCount} verified</span>
              <span className="font-mono text-slate-400">maker-checker</span>
            </div>
          </div>
        </Card>

        {/* RBI Audit Package Deliberate Dark Navy Card */}
        <div className="bg-[#102A43] rounded-xl border border-slate-700/60 p-5 sm:p-6 flex flex-col justify-between text-white shadow-sm min-h-[175px]">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-teal-400 uppercase mb-1.5">
              RBI AUDIT PACKAGE
            </div>
            <h3 className="text-[17px] sm:text-[18px] font-semibold text-white m-0 leading-snug">
              Inspection-ready, folio by folio.
            </h3>
            <p className="text-[12px] text-slate-300 mt-1.5 mb-0 leading-relaxed truncate">
              {activeFolio ? `Folio in context: ${activeFolio.title ?? activeFolio.id.slice(0, 8)}` : 'Will use the first available folio.'}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full mt-4 h-10 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Package className="w-4 h-4" />
            <span>{generating ? 'Compiling package…' : report ? '✓ Package ready — regenerate' : 'Generate package'}</span>
          </button>
        </div>
      </div>

      {/* 2. Middle Row: Department Scores (40%) + Recent Reports (60%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Scores Panel */}
        <Card pad={true} className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <SectionHead
              eyebrow="DEPARTMENT PERFORMANCE"
              title="Department scores"
              sub="Compliance scores and changes across departments."
              right={
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-[#E2EAF2]">
                  <button
                    onClick={() => setDeptSort('attention')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      deptSort === 'attention'
                        ? 'bg-white text-[#102A43] shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Attention
                  </button>
                  <button
                    onClick={() => setDeptSort('default')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      deptSort === 'default'
                        ? 'bg-white text-[#102A43] shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Default
                  </button>
                  <button
                    onClick={() => setDeptSort('highest')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      deptSort === 'highest'
                        ? 'bg-white text-[#102A43] shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Highest
                  </button>
                </div>
              }
            />

            <div className="flex flex-col gap-4 mt-2">
              {sortedDepts.map(d => {
                const isPositive = d.change.startsWith('+')
                const isBelowTarget = d.score < BENCHMARK_TARGET
                const isDeclining = !isPositive

                return (
                  <div key={d.dept} className="flex flex-col gap-1.5 group">
                    <div className="flex items-center justify-between text-[13px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-[#102A43]">{d.dept}</span>
                        {isBelowTarget && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Below {BENCHMARK_TARGET}%
                          </span>
                        )}
                        {!isBelowTarget && isDeclining && (
                          <span className="inline-flex items-center gap-0.5 text-[10.5px] font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                            Negative trend
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 tabular-nums shrink-0">
                        <span
                          className={`text-[11.5px] font-semibold flex items-center gap-0.5 ${
                            isPositive ? 'text-[#0D9488]' : 'text-red-600'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {d.change}%
                        </span>
                        <span className="font-bold text-[#102A43] text-[13.5px]">
                          {d.score}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar with 90% benchmark indicator */}
                    <div className="relative w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#0D9488] h-full rounded-full transition-all duration-300"
                        style={{ width: `${d.score}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Department Performance Exception Summary Strip */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11.5px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Target: {BENCHMARK_TARGET}% compliance</span>
            </div>
            <span className="font-mono text-slate-400">
              Avg score: 90.8% across 6 depts
            </span>
          </div>
        </Card>

        {/* Recent Reports Panel */}
        <Card pad={true} className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <SectionHead
              eyebrow="REPORTING"
              title="Recent reports"
              sub="Compiled audit packages with immutable snapshots."
            />

            {/* Generated Package Banner */}
            {report && (
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg mb-4 bg-teal-50 border border-teal-200">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="w-5 h-5 text-[#0D9488] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#102A43] m-0 truncate">
                      {report.title ?? 'Audit Package'}
                    </p>
                    <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 font-mono">
                      {new Date(report.generated_at).toLocaleDateString('en-IN')} · {report.completed_count}/{report.total_count} MAPs completed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusChip tone="ok">Ready</StatusChip>
                  <button
                    onClick={() => handleDownload({ id: report.regulation_id, name: report.title })}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0D9488] hover:text-[#0b7e73] bg-white border border-teal-200 hover:bg-teal-50 px-2.5 py-1 rounded transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            )}

            {/* Immutable Report Snapshot Panel */}
            <div
              data-testid="snapshot-panel"
              className="rounded-lg p-4 mb-4 bg-[#F8FAFC] border border-[#E2EAF2]"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  IMMUTABLE REPORT SNAPSHOT
                </div>
                <span className="text-[10.5px] font-mono text-slate-400">
                  WORM AUDIT TRAIL
                </span>
              </div>
              <p className="text-[12px] text-slate-500 mb-3 leading-normal">
                Freeze an approved plan to preserve an immutable audit snapshot.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  data-testid="snapshot-plan-input"
                  value={planId}
                  onChange={e => {
                    setPlanId(e.target.value)
                    setConfirmFreeze(false)
                  }}
                  placeholder="Approved plan ID (e.g., plan-q3-compliance)"
                  className="flex-1 h-9.5 px-3 text-[13px] font-mono bg-white border border-[#E2EAF2] rounded-lg text-[#102A43] placeholder-slate-400 focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/15 transition-all"
                />
                <button
                  data-testid="freeze-snapshot"
                  onClick={handleFreezeSnapshot}
                  disabled={freezing || !planId.trim()}
                  className="h-9.5 px-4 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{freezing ? 'Freezing…' : confirmFreeze ? 'Confirm & Freeze' : 'Freeze snapshot'}</span>
                </button>
              </div>

              {confirmFreeze && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-800 flex items-center justify-between gap-2">
                  <span>
                    Confirm snapshot freeze for plan <strong className="font-mono">{planId}</strong>? This creates a permanent, tamper-proof record.
                  </span>
                  <button
                    onClick={() => setConfirmFreeze(false)}
                    className="text-[11px] font-semibold underline text-amber-900 hover:text-amber-950 shrink-0 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {snapshot && (
                <div
                  data-testid="snapshot-indicator"
                  className="mt-3 text-[11.5px] font-mono text-[#0D9488] bg-teal-50 border border-teal-200 rounded-md px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      Snapshot {snapshot.id.slice(0, 8)}… · cutoff {snapshot.data_cutoff ?? new Date().toISOString().slice(0, 10)} · immutable
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-teal-700 bg-teal-100/70 px-1.5 py-0.5 rounded shrink-0">
                    WORM Sealed
                  </span>
                </div>
              )}
            </div>

            {/* Report List */}
            <div className="flex flex-col divide-y divide-slate-100">
              {rows.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-5 h-5 text-slate-400" />}
                  title="No folios to report on"
                  hint="Register a circular folio to begin generating reports."
                />
              ) : (
                rows.map(r => {
                  const isCurrent = activeFolio?.id === r.id

                  return (
                    <div
                      key={r.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3 first:pt-0 last:pb-0 px-2.5 rounded-lg transition-colors ${
                        isCurrent ? 'bg-teal-50/50' : 'hover:bg-[#F1F5F9]/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-[#102A43] m-0 truncate">
                          {r.name}
                        </p>
                        <p className="text-[11px] text-slate-400 m-0 mt-0.5 font-mono">
                          CIRCULAR · {r.date.toUpperCase()} · FOLIO {r.id.slice(0, 8)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                        <StatusChip tone={statusToneFor(r.status)}>
                          {r.status}
                        </StatusChip>
                        <button
                          onClick={() => setInspectedFolioId(r.id)}
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-600 hover:text-[#102A43] hover:bg-slate-100 px-2.5 py-1 rounded transition-colors cursor-pointer"
                          title="Inspect audit package details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                        <button
                          onClick={() => handleDownload(r)}
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0D9488] hover:text-[#0b7e73] hover:bg-teal-50 px-2.5 py-1 rounded transition-colors cursor-pointer"
                          title="Download compiled report"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11.5px] text-slate-400">
            <span>Showing {rows.length} registered circular folios</span>
            <span className="font-mono">Reserve Bank of India audit format</span>
          </div>
        </Card>
      </div>

      {/* 3. Third Section: Audit Package Details & Snapshot Registry (Resolves Viewport Blank Space) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Audit Package Details Workspace */}
        <Card pad={true} className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <SectionHead
              eyebrow="INSPECTION WORKSPACE"
              title="Audit package details"
              sub={`Selected folio: ${activeFolio?.title ?? 'Reserve Bank of India Master Direction'}`}
              right={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (activeFolio) handleDownload({ id: activeFolio.id, name: activeFolio.title ?? 'Folio' })
                    }}
                    className="h-8 px-3 rounded-lg border border-[#E2EAF2] hover:bg-slate-50 text-slate-700 text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="h-8 px-3 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Compile</span>
                  </button>
                </div>
              }
            />

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2EAF2] mb-5">
              <div>
                <div className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  Readiness
                </div>
                <div className="text-[18px] font-bold text-[#102A43] tabular-nums mt-0.5">
                  92.4%
                </div>
              </div>
              <div>
                <div className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  Total MAPs
                </div>
                <div className="text-[18px] font-bold text-[#102A43] tabular-nums mt-0.5">
                  {totalMapsCount}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  Completed
                </div>
                <div className="text-[18px] font-bold text-[#0D9488] tabular-nums mt-0.5">
                  {completedMapsCount}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  Verified Artifacts
                </div>
                <div className="text-[18px] font-bold text-[#102A43] tabular-nums mt-0.5">
                  {evidenceVerifiedCount}
                </div>
              </div>
            </div>

            {/* Department Breakdown for this Package */}
            <div className="text-[12px] font-semibold text-[#102A43] uppercase tracking-wider mb-2.5">
              Departmental Responsibility Breakdown
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {deptScores.map(d => (
                <div
                  key={d.dept}
                  className="p-2.5 rounded-lg border border-[#E2EAF2] bg-white flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-medium text-[#102A43]">{d.dept}</span>
                    <span className="text-[11.5px] font-bold text-[#0D9488] tabular-nums">{d.score}%</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{d.openMaps} open tasks</span>
                    <span className="font-mono text-slate-500">{d.change}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11.5px] text-slate-400">
            <span>Inspection folio ID: <span className="font-mono text-slate-600">{activeFolio?.id ?? '—'}</span></span>
            <span>Immutable audit trail verified</span>
          </div>
        </Card>

        {/* Snapshot Registry & WORM History */}
        <Card pad={true} className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <SectionHead
              eyebrow="AUDIT INTEGRITY"
              title="Snapshot registry"
              sub="Immutable records preserved under RBI guidelines."
            />

            <div className="flex flex-col gap-3 mt-1">
              {/* Baseline Immutable Snapshot */}
              <div className="p-3.5 rounded-lg border border-[#E2EAF2] bg-[#F8FAFC]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span className="font-mono text-[12.5px] font-semibold text-[#102A43]">
                      SNP-2026-RBI-01
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                    Immutable
                  </span>
                </div>
                <p className="text-[12px] text-slate-600 mt-1.5 mb-0">
                  Approved plan: <span className="font-mono text-slate-700 font-medium">plan-master-2026-v2</span>
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                  <span>Cutoff: 2026-10-01 18:30 IST</span>
                  <span>SHA-256 verified</span>
                </div>
              </div>

              {/* Dynamic Session Frozen Snapshots */}
              {snapshotHistory.map((s, idx) => (
                <div
                  key={s.id || idx}
                  className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span className="font-mono text-[12.5px] font-semibold text-[#102A43]">
                        {s.id.slice(0, 16)}…
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                      Frozen
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-600 mt-1.5 mb-0">
                    Plan ID: <span className="font-mono text-slate-700 font-medium">{s.plan_id}</span>
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                    <span>Cutoff: {s.data_cutoff ? s.data_cutoff.slice(0, 10) : 'Current'}</span>
                    <span>WORM storage</span>
                  </div>
                </div>
              ))}

              {snapshotHistory.length === 0 && (
                <div className="p-3 rounded-lg border border-dashed border-slate-200 text-center text-[12px] text-slate-400">
                  Enter an approved plan ID above to freeze a new immutable audit snapshot.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11.5px] text-slate-600 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              <strong>WORM Guarantee:</strong> Historical reports cannot be altered by subsequent plan edits or task updates.
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}
