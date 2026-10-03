import { useState } from 'react'
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
    status: r.status,
    date: new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    id: r.id,
  }))

  return (
    <div className="pv-grid12" style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
      <div className="pv-span8" style={{ gridColumn: 'span 8', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Overall Compliance', score: 92 },
          { label: 'MAP Completion', score: 89 },
          { label: 'Evidence Coverage', score: 96 },
        ].map((item) => (
          <Card key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ComplianceRing score={item.score} size={100} label={item.label} />
          </Card>
        ))}
      </div>

      <section className="pv-span4" style={{
        gridColumn: 'span 4', borderRadius: 12, padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: 'linear-gradient(165deg, #10253C 0%, #0C1B2D 60%)', border: '1px solid #22394F', color: '#F6F1E2',
      }}>
        <div>
          <div className="pv-mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: '#D9BC6B' }}>§ RBI AUDIT PACKAGE</div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 21, fontWeight: 600, margin: '8px 0', lineHeight: 1.25 }}>
            Inspection-ready,<br />folio by folio.
          </h3>
          <p style={{ fontSize: 12, color: '#AEB9C6', margin: 0, lineHeight: 1.55 }}>
            {selectedId ? 'Generating for the folio in context.' : 'Will use the first available folio.'}
          </p>
        </div>
        <button onClick={handleGenerate} disabled={generating}
          className="pv-btn-primary pv-btn-brass" style={{ justifyContent: 'center', marginTop: 20, opacity: generating ? 0.7 : 1 }}>
          {generating ? 'Compiling…' : report ? '✓ Package ready — regenerate' : 'Generate package'}
        </button>
      </section>

      <Card style={{ gridColumn: 'span 4' }}>
        <div className="pv-span4">
          <SectionHead eyebrow="§ By department" title="Department scores" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {deptScores.map(d => (
            <div key={d.dept}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{d.dept}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: d.change.startsWith('+') ? 'var(--emerald)' : 'var(--scarlet)', fontWeight: 600 }}>{d.change}%</span>
                  <span className="pv-numeral" style={{ fontSize: 13, fontWeight: 600 }}>{d.score}%</span>
                </div>
              </div>
              <div style={{ height: 5, background: '#EFEEE8', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${d.score}%`, background: d.score >= 90 ? 'var(--ink)' : d.score >= 80 ? 'var(--brass)' : 'var(--scarlet)', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ gridColumn: 'span 8' }}>
        <SectionHead eyebrow="§ Issued packages" title="Recent reports" sub="Compiled audit packages with immutable snapshots." />
        {report && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 9, marginBottom: 12, border: '1px solid #DCC88F', background: 'var(--brass-wash)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.title ?? 'Audit Package'}</p>
              <p className="pv-mono" style={{ fontSize: 11, color: 'var(--slate)', margin: '2px 0 0' }}>
                {new Date(report.generated_at).toLocaleDateString('en-IN')} · {report.total_count} MAPS
              </p>
            </div>
            <StatusChip tone="ok">Ready</StatusChip>
          </div>
        )}

        <div data-testid="snapshot-panel" style={{ border: '1px dashed var(--line)', borderRadius: 10, padding: 12, marginBottom: 12, background: 'var(--paper)' }}>
          <p className="pv-mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--brass)', margin: '0 0 8px' }}>IMMUTABLE REPORT SNAPSHOT</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input data-testid="snapshot-plan-input" value={planId} onChange={e => setPlanId(e.target.value)}
              placeholder="Approved plan ID" className="pv-input pv-mono" style={{ flex: 1 }} />
            <button data-testid="freeze-snapshot" onClick={handleFreezeSnapshot} disabled={freezing} className="pv-btn-primary" style={{ opacity: freezing ? 0.6 : 1 }}>
              {freezing ? 'Freezing…' : 'Freeze snapshot'}
            </button>
          </div>
          {snapshot && (
            <p data-testid="snapshot-indicator" className="pv-mono" style={{ fontSize: 11, color: 'var(--emerald)', background: 'var(--emerald-bg)', borderRadius: 8, padding: '6px 10px', margin: '8px 0 0' }}>
              Snapshot {snapshot.id.slice(0, 8)}… · cutoff {snapshot.data_cutoff ?? '—'} · immutable
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rows.length === 0 ? (
            <EmptyState title="No folios to report on" hint="Register a circular to begin." />
          ) : rows.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 4px', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                <p className="pv-mono" style={{ fontSize: 10.5, color: 'var(--faint)', margin: '2px 0 0' }}>CIRCULAR · {r.date.toUpperCase()}</p>
              </div>
              <StatusChip tone={statusToneFor(r.status)}>{r.status}</StatusChip>
              <button onClick={() => toast('info', 'Report download', r.name + ' — available via backend endpoint.')} className="pv-btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }}>
                Download
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
