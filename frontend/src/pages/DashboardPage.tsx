import { useMemo } from 'react'
import { useApp } from '../App'
import RadarChart from '../components/RadarChart'
import DependencyGraph from '../components/DependencyGraph'
import { Card, SectionHead, StatusChip, StatCard, statusToneFor, EmptyState } from '../components/ui'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import type { MAPOut, RegulationOut, SimulationResponse } from '../lib/types'

export default function DashboardPage() {
  const { navigate } = useApp()

  const { data: regulations, loading, error: regsError } = useApi<RegulationOut[]>(
    () => api.get<RegulationOut[]>('/regulations/'),
    [],
  )

  const circulars = (regulations ?? []).slice(0, 5)
  const regIdsKey = circulars.map(r => r.id).join(',')

  const { data: extras, loading: extrasLoading } = useApi<{
    mapsByReg: Record<string, MAPOut[]>
    simByReg: Record<string, SimulationResponse>
  }>(
    async () => {
      const mapsByReg: Record<string, MAPOut[]> = {}
      const simByReg: Record<string, SimulationResponse> = {}
      await Promise.all(
        circulars.map(async (reg) => {
          try { mapsByReg[reg.id] = await api.get<MAPOut[]>(`/maps/?regulation_id=${reg.id}`) }
          catch { mapsByReg[reg.id] = [] }
          try { simByReg[reg.id] = await api.get<SimulationResponse>(`/regulations/${reg.id}/simulate`) }
          catch { /* no data */ }
        }),
      )
      return { mapsByReg, simByReg }
    },
    [regIdsKey],
  )

  const mapsByReg = extras?.mapsByReg ?? {}
  const simByReg = extras?.simByReg ?? {}
  const totalMaps = useMemo(
    () => Object.values(mapsByReg).reduce((n, arr) => n + arr.length, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [extras],
  )

  const stillLoading = loading || extrasLoading
  const usingDemoData = !stillLoading && (circulars.length === 0 || regsError !== null || totalMaps === 0)

  const topDeptFor = (regId: string): string => {
    const workloads = simByReg[regId]?.department_workloads
    if (!workloads) return '—'
    const entries = Object.entries(workloads)
    if (entries.length === 0) return '—'
    return entries.sort((a, b) => b[1] - a[1])[0][0]
  }

  const earliestDeadlineFor = (regId: string, fallback?: string): string => {
    const dated = (mapsByReg[regId] ?? []).filter(m => m.deadline)
    if (dated.length === 0) return fallback ?? new Date().toISOString()
    return dated.map(m => m.deadline as string).sort()[0]
  }

  const bottlenecks = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const sim of Object.values(simByReg)) {
      for (const [dept, w] of Object.entries(sim?.department_workloads ?? {})) {
        totals[dept] = (totals[dept] ?? 0) + (w as number)
      }
    }
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5)
    if (sorted.length === 0) return null
    const max = sorted[0][1] || 1
    return sorted.map(([dept, count]) => ({
      dept, count: Math.round(count),
      pct: Math.max(8, Math.round((count / max) * 100)),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extras])

  const staticBottlenecks = [
    { dept: 'Information Technology', count: 14, pct: 100 },
    { dept: 'Risk Management', count: 11, pct: 79 },
    { dept: 'Operations', count: 9, pct: 64 },
    { dept: 'Branch Banking', count: 7, pct: 50 },
    { dept: 'Legal & Compliance', count: 5, pct: 36 },
  ]
  const bottleneckRows = bottlenecks ?? staticBottlenecks

  const deadlines = useMemo(() => {
    const regTitleById: Record<string, string> = {}
    for (const r of circulars) regTitleById[r.id] = r.title ?? '(untitled)'
    const all = Object.entries(mapsByReg).flatMap(([regId, maps]) =>
      (maps ?? []).filter(m => m.deadline)
        .map(m => ({ map: m, regId, regTitle: regTitleById[regId] ?? '(untitled)' })),
    )
    if (all.length === 0) return null
    all.sort((a, b) => String(a.map.deadline).localeCompare(String(b.map.deadline)))
    const now = new Date()
    const dayMs = 86400000
    return all.slice(0, 4).map(({ map, regTitle, regId }) => {
      const d = new Date(map.deadline as string)
      const diffDays = Math.round((d.getTime() - now.getTime()) / dayMs)
      const bucket = diffDays <= 0 ? 'Due today' : diffDays === 1 ? 'Due tomorrow'
        : `Due ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
      const tone = diffDays <= 0 ? 'bad' : diffDays === 1 ? 'warn' : 'neutral'
      return {
        id: map.id, bucket, tone: tone as 'bad' | 'warn' | 'neutral',
        task: map.description.length > 64 ? map.description.slice(0, 61) + '…' : map.description,
        reg: regTitle, owner: topDeptFor(regId),
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extras, regIdsKey])

  const staticDeadlines = [
    { id: 'd1', bucket: 'Due today', tone: 'bad' as const, task: 'Submit AML/CFT Q2 return to RBI', reg: 'Fraud Risk Management', owner: 'Risk' },
    { id: 'd2', bucket: 'Due tomorrow', tone: 'warn' as const, task: 'Complete maker–checker review: Cyber Security Policy', reg: 'Cybersecurity Controls', owner: 'Compliance' },
    { id: 'd3', bucket: 'Due 7 Aug', tone: 'neutral' as const, task: 'Upload resilience test evidence pack', reg: 'Operational Resilience', owner: 'IT' },
    { id: 'd4', bucket: 'Due 8 Aug', tone: 'neutral' as const, task: 'Finalize MSME credit policy amendment', reg: 'MSME Lending', owner: 'Credit' },
  ]
  const deadlineRows = deadlines ?? staticDeadlines

  const reviewQueue = useMemo(() => {
    const all = Object.values(mapsByReg).flat()
    if (all.length === 0) return null
    const awaiting = all.filter(m => (m.approval_state ?? m.status) === 'Review' || m.status === 'In Progress').length
    const approved = all.filter(m => (m.approval_state ?? m.status) === 'Approved').length
    const rejected = all.filter(m => (m.approval_state ?? m.status) === 'Rejected').length
    return { awaiting, approved, rejected, total: all.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extras])

  const tableData: Array<RegulationOut | { id: string; title: string; status: string; date: string; created_at?: string }> =
    !usingDemoData && circulars.length > 0 ? circulars : [
      { id: '1', title: 'Master Direction — Operational Resilience', status: 'Review', date: '2026-08-24' },
      { id: '2', title: 'Master Direction — Cybersecurity Framework', status: 'In Progress', date: '2026-09-08' },
      { id: '3', title: 'Guidelines on Fraud Risk Management', status: 'Draft', date: '2026-09-15' },
      { id: '4', title: 'Master Direction — Credit Risk Management', status: 'Completed', date: '2026-08-10' },
      { id: '5', title: 'Guidelines on MSME Lending', status: 'In Progress', date: '2026-08-22' },
    ]

  return (
    <div className="pv-grid12" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16, paddingBottom: 8 }}>
      {/* stats */}
      <div className="pv-span3" style={{ gridColumn: 'span 3' }}>
        <StatCard eyebrow="Compliance health" value="94%" caption="Across 5 active circulars" delta={{ text: '+2.4 pts vs last quarter', good: true }} />
      </div>
      <div className="pv-span3" style={{ gridColumn: 'span 3' }}>
        <StatCard eyebrow="Open MAPs" value={usingDemoData ? '23' : String(totalMaps)} caption="Assigned with owners + due dates" onClick={() => navigate('map-tasks')} />
      </div>
      <div className="pv-span3" style={{ gridColumn: 'span 3' }}>
        <StatCard eyebrow="Pending review" value="14" caption="Awaiting checker approval" delta={{ text: '3 overdue', good: false }} onClick={() => navigate('map-review')} />
      </div>
      <div className="pv-span3" style={{ gridColumn: 'span 3' }}>
        <StatCard eyebrow="Evidence coverage" value="82%" caption="MAPs with verified evidence" delta={{ text: '+6 pts this month', good: true }} onClick={() => navigate('evidence')} />
      </div>

      {/* review queue strip */}
      {reviewQueue && (
        <div data-testid="review-queue" className="pv-span12" style={{ gridColumn: 'span 12', background: 'var(--ink)', borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
          <span className="pv-mono" style={{ fontSize: 10.5, letterSpacing: '0.14em', color: 'var(--brass-bright)' }}>MAKER–CHECKER QUEUE</span>
          {[
            { label: 'Awaiting approval', value: reviewQueue.awaiting },
            { label: 'Approved', value: reviewQueue.approved },
            { label: 'Returned', value: reviewQueue.rejected },
            { label: 'Total MAPs', value: reviewQueue.total },
          ].map(q => (
            <span key={q.label} style={{ fontSize: 12.5, color: '#E7ECF2' }}>
              {q.label}: <strong className="pv-mono">{q.value}</strong>
            </span>
          ))}
          <button className="pv-btn-brass pv-btn-primary" style={{ marginLeft: 'auto', padding: '7px 14px', fontSize: 12 }} onClick={() => navigate('map-review')}>Open review queue</button>
        </div>
      )}

      {/* regulatory execution */}
      <Card style={{ gridColumn: 'span 7' }}>
        <div className="pv-span7">
          <SectionHead
            eyebrow="§ Circulars ledger · Q3"
            title="Regulatory execution"
            sub={usingDemoData ? 'Illustrative folio — connect the seeder to load live circulars.' : 'Live circulars with MAP coverage, owners and deadlines.'}
            right={<button className="pv-btn-primary" onClick={() => navigate('regulations')}>View ledger</button>}
          />
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 44, background: '#F1EFE9', borderRadius: 8 }} />)}
          </div>
        ) : (
          <table className="pv-table">
            <thead><tr><th>Circular</th><th>Status</th><th>MAPs</th><th>Owner</th><th>Deadline</th></tr></thead>
            <tbody>
              {tableData.map((row, i) => {
                const isFallback = usingDemoData
                const mapsForRow = !isFallback ? (mapsByReg[row.id] ?? null) : null
                const fallbackDate = (row as { date?: string; created_at?: string }).date ?? (row as { created_at?: string }).created_at
                const dateSrc = !isFallback && mapsForRow ? earliestDeadlineFor(row.id, (row as RegulationOut).created_at) : fallbackDate
                const dateStr = new Date(dateSrc || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                const mapsCnt = !isFallback && mapsForRow ? mapsForRow.length : [24, 18, 12, 31, 16][i % 5]
                const owner = !isFallback ? topDeptFor(row.id) : ['Operations', 'IT', 'Risk', 'Risk', 'Credit'][i % 5]
                return (
                  <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => navigate('regulation-detail', row.id)}>
                    <td style={{ fontWeight: 600, maxWidth: 280 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title ?? '(untitled)'}</span>
                      <span className="pv-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>RBI/2026-27/{String(40 + i).padStart(2, '0')} · Folio {String(i + 1).padStart(2, '0')}</span>
                    </td>
                    <td><StatusChip tone={statusToneFor(row.status)}>{row.status}</StatusChip></td>
                    <td className="pv-mono" style={{ fontWeight: 600 }}>{mapsCnt}</td>
                    <td>{owner}</td>
                    <td className="pv-mono" style={{ fontSize: 11.5, color: 'var(--slate)', whiteSpace: 'nowrap' }}>{dateStr}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* twin */}
      <Card style={{ gridColumn: 'span 5' }}>
        <SectionHead
          eyebrow="§ Scenario estimates · Uncalibrated"
          title="Digital compliance twin"
          sub="Workload model — estimates, not forecasts."
          right={<span className="pv-chip pv-chip--brass"><span className="dot" style={{ background: 'var(--brass)' }} />LIVE MODEL</span>}
        />
        <RadarChart />
        <button className="pv-btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => navigate('digital-twin')}>
          Open scenario planner →
        </button>
      </Card>

      {/* dependencies */}
      <Card style={{ gridColumn: 'span 7' }}>
        <SectionHead
          eyebrow="§ Critical path · 5 nodes"
          title="Dependency path"
          sub="Blocking sequence across MAPs — longest chain first."
          right={<button className="pv-btn-ghost" onClick={() => navigate('digital-twin')}>Open graph</button>}
        />
        <DependencyGraph />
      </Card>

      {/* bottlenecks */}
      <Card style={{ gridColumn: 'span 5' }}>
        <SectionHead eyebrow="§ Capacity" title="Bottleneck departments" sub="Ranked by open MAP load." />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {bottleneckRows.map((b, i) => (
            <div key={b.dept} style={{ cursor: 'pointer' }} onClick={() => navigate('map-tasks')}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span className="pv-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{b.dept}</span>
                </div>
                <span className="pv-numeral" style={{ fontSize: 17, fontWeight: 600 }}>{b.count}</span>
              </div>
              <div style={{ height: 6, background: '#EFEEE8', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${b.pct}%`, background: i === 0 ? 'linear-gradient(90deg,#8A6E28,#C5A254)' : '#0C1B2D', borderRadius: 4, opacity: i === 0 ? 1 : 0.75 - i * 0.1 }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* deadlines */}
      <Card style={{ gridColumn: 'span 7' }}>
        <SectionHead
          eyebrow="§ Due register"
          title="Upcoming deadlines"
          sub="Owner-confirmed dates across departments."
          right={<button className="pv-btn-ghost" onClick={() => navigate('map-tasks')}>View all</button>}
        />
        <table className="pv-table">
          <thead><tr><th>Task</th><th>Circular</th><th>Owner</th><th>Due</th></tr></thead>
          <tbody>
            {deadlineRows.map((row) => (
              <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => navigate('map-tasks')}>
                <td style={{ fontWeight: 500 }}>{row.task}</td>
                <td style={{ color: 'var(--slate)' }}>{row.reg}</td>
                <td>{row.owner}</td>
                <td><StatusChip tone={row.tone === 'bad' ? 'bad' : row.tone === 'warn' ? 'warn' : 'neutral'}>{row.bucket}</StatusChip></td>
              </tr>
            ))}
          </tbody>
        </table>
        {deadlineRows.length === 0 && <EmptyState title="No upcoming deadlines" hint="All MAPs are clear or undated." />}
      </Card>

      {/* audit CTA — the one brass moment */}
      <section style={{
        gridColumn: 'span 5', borderRadius: 12, padding: '26px 24px', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(165deg, #10253C 0%, #0C1B2D 60%, #14304A 100%)',
        border: '1px solid #22394F', color: '#F6F1E2',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(300px 200px at 85% 10%, rgba(197,162,84,0.22), transparent 65%)', pointerEvents: 'none' }} />
        <div className="pv-mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: '#D9BC6B' }}>§ AUDIT PACKAGE · RBI-READY</div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 27, fontWeight: 600, lineHeight: 1.15, margin: '10px 0 8px', letterSpacing: '-0.01em' }}>
          One ledger.<br />Every proof attached.
        </h2>
        <p style={{ fontSize: 13, color: '#B9C4D2', margin: '0 0 20px', lineHeight: 1.55 }}>
          MAPs, maker–checker decisions and verified evidence compiled with folio traceability — ready for inspection.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="pv-btn-primary pv-btn-brass" onClick={() => navigate('reports')}>Generate report</button>
          <button onClick={() => navigate('evidence')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: '#F6F1E2', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Verify evidence</button>
        </div>
        <div className="pv-mono" style={{ fontSize: 10, color: '#7E8DA0', marginTop: 18, letterSpacing: '0.06em' }}>TRACEABILITY 100% · EXPORT PDF + XLSX</div>
      </section>
    </div>
  )
}
