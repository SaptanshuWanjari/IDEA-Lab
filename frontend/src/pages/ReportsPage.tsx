import { useState } from 'react'
import { Package, Lock, Download, CheckCircle2, FileText } from 'lucide-react'
import ComplianceRing from '../components/ComplianceRing'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api, pilotApi } from '../lib/api'
import type { RegulationOut, ReportOut, ReportSnapshotOut } from '../lib/types'
import { Card, SectionHead, StatusChip, statusToneFor, EmptyState } from '../components/ui'

const deptScores = [
  { dept: 'Operations', score: 91, change: '+3' },
  { dept: 'IT',         score: 87, change: '-2' },
  { dept: 'Risk',       score: 94, change: '+5' },
  { dept: 'Legal',      score: 98, change: '+1' },
  { dept: 'HR',         score: 79, change: '+8' },
  { dept: 'Compliance', score: 96, change: '+2' },
]

export default function ReportsPage() {
  const { toast, selectedId } = useApp()
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<ReportOut | null>(null)
  const [planId, setPlanId] = useState('')
  const [snapshot, setSnapshot] = useState<ReportSnapshotOut | null>(null)
  const [freezing, setFreezing] = useState(false)

  const { data: regulations } = useApi<RegulationOut[]>(
    () => api.get<RegulationOut[]>('/regulations/'),
    [],
  )

  const handleGenerate = async () => {
    const id = selectedId ?? regulations?.[0]?.id
    if (!id) {
      toast('warning', 'Select a regulation first', 'Navigate to a regulation to generate its audit package.')
      return
    }
    setGenerating(true)
    try {
      const res = await api.post<ReportOut>(`/regulations/${id}/report`)
      setReport(res)
      toast('success', 'Audit package ready', res.title ?? 'Report generated and ready to download.')
    } catch (err: unknown) {
      toast('error', 'Generation failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  const handleFreezeSnapshot = async () => {
    const id = selectedId ?? regulations?.[0]?.id
    if (!id || !planId.trim()) {
      toast('warning', 'Plan ID required', 'Enter the approved plan ID to freeze a snapshot.')
      return
    }
    setFreezing(true)
    try {
      const snap = await pilotApi.createSnapshot({ regulation_version_id: id, plan_id: planId.trim() })
      setSnapshot(snap)
      toast('success', 'Snapshot frozen', `Snapshot ${snap.id.slice(0, 8)}… is immutable.`)
    } catch (err: unknown) {
      toast('error', 'Snapshot failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setFreezing(false)
    }
  }

  const rows = (regulations ?? []).slice(0, 4).map(r => ({
    name: r.title ?? '(untitled)',
    status: r.status,
    date: new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    id: r.id,
  }))

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top row: 3 Compliance cards + 1 RBI Audit Package card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Overall Compliance', score: 92 },
          { label: 'MAP Completion', score: 89 },
          { label: 'Evidence Coverage', score: 96 },
        ].map(item => (
          <Card key={item.label} pad={true} className="flex flex-col items-center justify-center min-h-[190px]">
            <ComplianceRing score={item.score} size={110} label={item.label} />
          </Card>
        ))}

        {/* RBI Audit Package Deliberate Dark Navy Card */}
        <div className="bg-[#102A43] rounded-xl border border-slate-700/60 p-6 flex flex-col justify-between text-white shadow-sm">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-teal-400 uppercase mb-2">
              RBI AUDIT PACKAGE
            </div>
            <h3 className="text-[18px] font-semibold text-white m-0 leading-snug">
              Inspection-ready, folio by folio.
            </h3>
            <p className="text-[12.5px] text-slate-300 mt-2 mb-0 leading-relaxed">
              {selectedId ? 'Generating for the folio in context.' : 'Will use the first available folio.'}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full mt-5 h-9.5 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-70"
          >
            <Package className="w-4 h-4" />
            <span>{generating ? 'Compiling…' : report ? '✓ Package ready — regenerate' : 'Generate package'}</span>
          </button>
        </div>
      </div>

      {/* Middle row: Department Scores + Recent Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Scores Panel */}
        <Card pad={true} className="lg:col-span-5 flex flex-col">
          <SectionHead
            eyebrow="DEPARTMENT PERFORMANCE"
            title="Department scores"
            sub="Compliance scores and changes across departments."
          />
          <div className="flex flex-col gap-4 mt-1">
            {deptScores.map(d => {
              const isPositive = d.change.startsWith('+')
              return (
                <div key={d.dept} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-[#102A43]">{d.dept}</span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className={`text-[11.5px] font-semibold ${isPositive ? 'text-[#0D9488]' : 'text-red-600'}`}>
                        {d.change}%
                      </span>
                      <span className="font-semibold text-[#102A43] text-[13px]">{d.score}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#0D9488] h-full rounded-full transition-all duration-300"
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Recent Reports Panel */}
        <Card pad={true} className="lg:col-span-7 flex flex-col">
          <SectionHead
            eyebrow="REPORTING"
            title="Recent reports"
            sub="Compiled audit packages with immutable snapshots."
          />

          {/* Generated Package Banner */}
          {report && (
            <div className="flex items-center gap-3 p-3 rounded-lg mb-4 bg-teal-50 border border-teal-200">
              <CheckCircle2 className="w-5 h-5 text-[#0D9488] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#102A43] m-0 truncate">
                  {report.title ?? 'Audit Package'}
                </p>
                <p className="text-[11px] text-slate-500 m-0 mt-0.5 font-mono">
                  {new Date(report.generated_at).toLocaleDateString('en-IN')} · {report.total_count} MAPs
                </p>
              </div>
              <StatusChip tone="ok">Ready</StatusChip>
            </div>
          )}

          {/* Immutable Report Snapshot Panel */}
          <div
            data-testid="snapshot-panel"
            className="rounded-lg p-3.5 mb-4 bg-[#F1F5F9] border border-[#E2EAF2]"
          >
            <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-2">
              IMMUTABLE REPORT SNAPSHOT
            </div>
            <div className="flex items-center gap-2">
              <input
                data-testid="snapshot-plan-input"
                value={planId}
                onChange={e => setPlanId(e.target.value)}
                placeholder="Approved plan ID"
                className="flex-1 h-9 px-3 text-[13px] font-mono bg-white border border-[#E2EAF2] rounded-lg text-[#102A43] placeholder-slate-400 focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/15 transition-all"
              />
              <button
                data-testid="freeze-snapshot"
                onClick={handleFreezeSnapshot}
                disabled={freezing}
                className="h-9 px-3.5 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer disabled:opacity-60 shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{freezing ? 'Freezing…' : 'Freeze snapshot'}</span>
              </button>
            </div>
            {snapshot && (
              <div
                data-testid="snapshot-indicator"
                className="mt-2 text-[11.5px] font-mono text-[#0D9488] bg-teal-50 border border-teal-200 rounded-md px-2.5 py-1.5 flex items-center gap-1.5"
              >
                <Lock className="w-3 h-3" />
                <span>Snapshot {snapshot.id.slice(0, 8)}… · cutoff {snapshot.data_cutoff ?? '—'} · immutable</span>
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
              rows.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-[#F1F5F9]/40 px-2 rounded-lg transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#102A43] m-0 truncate">
                      {r.name}
                    </p>
                    <p className="text-[11px] text-slate-400 m-0 mt-0.5 font-mono">
                      CIRCULAR · {r.date.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusChip tone={statusToneFor(r.status)}>
                      {r.status}
                    </StatusChip>
                    <button
                      onClick={() => toast('info', 'Report download', `${r.name} — available via backend endpoint.`)}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0D9488] hover:text-[#0b7e73] hover:bg-teal-50 px-2.5 py-1 rounded transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
