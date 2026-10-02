import { useState } from 'react'
import ComplianceRing from '../components/ComplianceRing'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api, pilotApi } from '../lib/api'
import type { RegulationOut, ReportOut, ReportSnapshotOut } from '../lib/types'

const statusColor = (s: string) =>
  s === 'Ready' ? { bg: '#F0FFF0', text: '#2D8A4E' }
  : s === 'Submitted' ? { bg: '#F0F0FF', text: '#4040C0' }
  : { bg: '#FFF8E1', text: '#C17B00' }

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
    if (!id) { toast('warning', 'Select a regulation first', 'Navigate to a regulation to generate its audit package.'); return }
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
    type: 'Circular',
    status: r.status === 'Active' ? 'Ready' : r.status === 'Pending' ? 'Draft' : 'Submitted',
    date: new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    size: '—',
    id: r.id,
  }))

  return (
    <div style={{ width: '100%', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'auto 1fr', gap: 20 }}>

      {/* Summary Ring Cards */}
      <div style={{ gridColumn: 'span 8', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Overall Compliance', score: 92 },
          { label: 'MAP Completion', score: 89 },
          { label: 'Evidence Coverage', score: 96 },
        ].map((item) => (
          <div key={item.label} className="card-hover" style={{ background: '#FFFFFF', borderRadius: 24, border: '1px solid #E8E8E3', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <ComplianceRing score={item.score} size={100} label={item.label} />
          </div>
        ))}
      </div>

      {/* Generate Report CTA */}
      <div style={{ gridColumn: 'span 4', background: '#111111', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div>
          <div style={{ width: 40, height: 40, background: '#8ad8ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="20" height="20" fill="none" stroke="#111" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px', lineHeight: 1.3 }}>
            Generate RBI Audit Package
          </h3>
          <p style={{ fontSize: 12, color: '#666660', margin: 0, marginTop: 8, fontFamily: 'Inter', lineHeight: 1.5 }}>
            {selectedId ? 'Generating report for selected regulation.' : 'Will use first available regulation.'}
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{ padding: '11px 0', background: report ? '#4CAF50' : '#8ad8ff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'Inter', color: '#111', marginTop: 20, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: generating ? 0.8 : 1 }}
        >
          {generating ? (
            <><div style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Generating...</>
          ) : report ? (
            <><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Package Ready</>
          ) : 'Generate Package'}
        </button>
      </div>

      {/* Department Scores */}
      <div className="card-hover" style={{ gridColumn: 'span 4', background: '#FFFFFF', borderRadius: 24, border: '1px solid #E8E8E3', padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px', marginBottom: 20 }}>Department Scores</h2>
        <div className="flex flex-col gap-4">
          {deptScores.map(d => (
            <div key={d.dept}>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontSize: 12, color: '#444440', fontFamily: 'Inter', fontWeight: 500 }}>{d.dept}</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 11, color: d.change.startsWith('+') ? '#4CAF50' : '#E53935', fontWeight: 600, fontFamily: 'Inter' }}>{d.change}%</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: 'Geist Mono, monospace' }}>{d.score}%</span>
                </div>
              </div>
              <div style={{ height: 5, background: '#F0F0EA', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${d.score}%`, background: d.score >= 90 ? '#8ad8ff' : d.score >= 80 ? '#F9A825' : '#E53935', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Reports (from regulations list + generated report) */}
      <div className="card-hover" style={{ gridColumn: 'span 8', background: '#FFFFFF', borderRadius: 24, border: '1px solid #E8E8E3', padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Recent Reports</h2>
        </div>

        {/* Show generated report at top if available */}
        {report && (
          <div className="flex items-center gap-4 p-3 rounded-xl mb-3" style={{ border: '1px solid #8ad8ff', background: 'rgba(138,216,255,0.05)' }}>
            <div style={{ width: 36, height: 36, background: '#8ad8ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" fill="none" stroke="#111" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
            <div className="flex-1">
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>{report.title ?? 'Audit Package'}</p>
              <p style={{ fontSize: 11, color: '#888880', margin: 0, fontFamily: 'Inter' }}>Regulatory · {new Date(report.generated_at).toLocaleDateString('en-IN')} · {report.total_count} MAPs</p>
            </div>
            <span style={{ background: '#F0FFF0', color: '#2D8A4E', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, fontFamily: 'Inter' }}>Ready</span>
          </div>
        )}

        {/* Immutable snapshot indicator */}
        <div data-testid="snapshot-panel" style={{ border: '1px dashed #E8E8E3', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', margin: '0 0 8px', fontFamily: 'Inter' }}>Immutable report snapshot</p>
          <div className="flex items-center gap-2">
            <input
              data-testid="snapshot-plan-input"
              value={planId}
              onChange={e => setPlanId(e.target.value)}
              placeholder="Approved plan ID"
              style={{ flex: 1, border: '1px solid #E8E8E3', borderRadius: 8, padding: '7px 10px', fontSize: 12, fontFamily: 'Geist Mono, monospace', outline: 'none' }}
            />
            <button
              data-testid="freeze-snapshot"
              onClick={handleFreezeSnapshot}
              disabled={freezing}
              style={{ padding: '7px 14px', background: '#111', color: '#8ad8ff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: freezing ? 'not-allowed' : 'pointer', fontFamily: 'Inter' }}
            >
              {freezing ? 'Freezing…' : 'Freeze snapshot'}
            </button>
          </div>
          {snapshot && (
            <p data-testid="snapshot-indicator" style={{ fontSize: 11, color: '#2D8A4E', background: '#F0FFF0', borderRadius: 8, padding: '6px 10px', margin: '8px 0 0', fontFamily: 'Geist Mono, monospace' }}>
              Snapshot {snapshot.id.slice(0, 8)}… · cutoff {snapshot.data_cutoff ?? '—'} · immutable
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {rows.length === 0 ? (
            <p style={{ fontSize: 14, color: '#888880', fontFamily: 'Inter', textAlign: 'center', margin: '24px 0' }}>No regulations found — upload one to start.</p>
          ) : rows.map((r, i) => {
            const sc = statusColor(r.status)
            return (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl" style={{ border: '1px solid #F0F0EA', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 36, height: 36, background: '#F5F5F0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" fill="none" stroke="#888880" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                  <p style={{ fontSize: 11, color: '#888880', margin: 0, fontFamily: 'Inter' }}>{r.type} · {r.date}</p>
                </div>
                <span style={{ background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, fontFamily: 'Inter', flexShrink: 0 }}>{r.status}</span>
                <button
                  onClick={e => { e.stopPropagation(); toast('info', 'Report download', r.name + ' — available via backend endpoint.') }}
                  style={{ padding: '5px 12px', background: '#F5F5F0', border: '1px solid #E8E8E3', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontFamily: 'Inter', color: '#0A0A0A', flexShrink: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#8ad8ff'; e.currentTarget.style.borderColor = '#111' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F5F5F0'; e.currentTarget.style.color = '#0A0A0A'; e.currentTarget.style.borderColor = '#E8E8E3' }}
                >
                  Download
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
