import { useMemo, useState } from 'react'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import { getPoliciesForReg } from '../lib/bankDemoManifest'
import PolicyDrawer from '../components/PolicyDrawer'
import type { RegulationOut, MAPOut, GraphResponse, IngestResponse } from '../lib/types'

const statusStyle: Record<string, { bg: string; text: string }> = {
  Mapped:       { bg: '#F0FFF0', text: '#2D8A4E' },
  'In Progress':{ bg: '#F0F0FF', text: '#4040C0' },
  Pending:      { bg: '#FFF8E1', text: '#C17B00' },
  Overdue:      { bg: '#FFF3F0', text: '#C13B2A' },
  Approved:     { bg: '#F0FFF0', text: '#2D8A4E' },
  Review:       { bg: '#F0F0FF', text: '#4040C0' },
  Active:       { bg: '#F0FFF0', text: '#2D8A4E' },
}

const riskColor: Record<string, string> = { High: '#E53935', Medium: '#F9A825', Low: '#4CAF50' }

function SkeletonBlock({ h = 200 }: { h?: number }) {
  return <div style={{ height: h, background: '#F5F5F0', borderRadius: 16 }} />
}

function ErrorBanner({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div style={{ background: '#FFF3F0', border: '1px solid #FFD7D7', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <p style={{ fontSize: 13, color: '#C13B2A', margin: 0, fontFamily: 'Inter' }}>{msg}</p>
      <button onClick={onRetry} style={{ fontSize: 12, color: '#C13B2A', background: 'none', border: '1px solid #C13B2A', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: 'Inter' }}>Retry</button>
    </div>
  )
}

export default function RegulationDetailPage() {
  const { navigate, toast, selectedId } = useApp()
  const [activeTab, setActiveTab] = useState<'maps' | 'graph' | 'history'>('maps')
  const [ingesting, setIngesting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)

  const { data: regulation, loading: regLoading, error: regError, refetch: regRefetch } = useApi<RegulationOut>(
    () => {
      if (!selectedId) return Promise.reject(new Error('No regulation selected'))
      return api.get<RegulationOut>(`/regulations/${selectedId}`)
    },
    [selectedId],
  )

  const { data: maps, loading: mapsLoading, refetch: mapsRefetch } = useApi<MAPOut[]>(
    () => {
      if (!selectedId) return Promise.resolve([])
      return api.get<MAPOut[]>(`/maps/?regulation_id=${selectedId}`)
    },
    [selectedId],
  )

  const { data: graph, loading: graphLoading, refetch: graphRefetch } = useApi<GraphResponse>(
    () => {
      if (!selectedId || activeTab !== 'graph') return Promise.resolve({ nodes: [], edges: [], critical_path: [], topological_order: [] })
      return api.get<GraphResponse>(`/regulations/${selectedId}/graph`)
    },
    [selectedId, activeTab],
  )

  const linkedPolicies = useMemo(
    () => getPoliciesForReg(selectedId ?? '', regulation?.title ?? ''),
    [selectedId, regulation?.title],
  )

  const handleIngest = async () => {
    if (!selectedId) return
    setIngesting(true)
    try {
      const res = await api.post<IngestResponse>(`/regulations/${selectedId}/ingest`)
      toast('success', `Ingested — ${res.clause_count} clauses, ${res.document_class}`)
      regRefetch()
    } catch (err: unknown) {
      toast('error', 'Ingest failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIngesting(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedId) return
    setGenerating(true)
    try {
      const newMaps = await api.post<MAPOut[]>(`/regulations/${selectedId}/generate`)
      toast('success', `Generated ${newMaps.length} MAPs`)
      mapsRefetch()
      regRefetch()
    } catch (err: unknown) {
      toast('error', 'Generate failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  if (!selectedId) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ fontSize: 14, color: '#888880', fontFamily: 'Inter' }}>No regulation selected. Go back to Regulations.</p>
        <button onClick={() => navigate('regulations')} style={{ marginTop: 16, padding: '8px 20px', background: '#111', color: '#8ad8ff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter' }}>← Back</button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate('regulations')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888880', fontSize: 12, fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          Regulations
        </button>
        <span style={{ color: '#D0D0C8', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12, color: '#0A0A0A', fontFamily: 'Inter', fontWeight: 500 }}>{selectedId.slice(0, 8)}…</span>
      </div>

      {regError && <ErrorBanner msg={regError} onRetry={regRefetch} />}

      {/* Hero card */}
      <div style={{ background: '#111111', borderRadius: 26, padding: '28px 32px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(138,216,255,0.06)', pointerEvents: 'none' }} />

        {regLoading ? <SkeletonBlock h={140} /> : regulation && (
          <div className="flex items-start justify-between relative z-10">
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-3 mb-3">
                <span style={{ fontSize: 12, fontWeight: 700, color: '#8ad8ff', fontFamily: 'Geist Mono, monospace', background: 'rgba(138,216,255,0.12)', padding: '3px 10px', borderRadius: 7 }}>{regulation.id.slice(0, 8)}…</span>
                <span style={{ background: statusStyle[regulation.status]?.bg, color: statusStyle[regulation.status]?.text, fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, fontFamily: 'Inter' }}>{regulation.status}</span>
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.5px', lineHeight: 1.3, maxWidth: 640 }}>{regulation.title ?? '(untitled)'}</h1>
              {regulation.summary && (
                <p style={{ fontSize: 13, color: '#888880', margin: 0, marginTop: 10, fontFamily: 'Inter', lineHeight: 1.6, maxWidth: 600 }}>{regulation.summary}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mt-5 pt-5 relative z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleIngest}
            disabled={ingesting}
            style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: ingesting ? 'not-allowed' : 'pointer', fontFamily: 'Inter', color: '#FFFFFF', opacity: ingesting ? 0.6 : 1 }}
          >
            {ingesting ? 'Ingesting…' : 'Ingest PDF'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{ padding: '8px 16px', background: '#8ad8ff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'Inter', color: '#111', opacity: generating ? 0.7 : 1 }}
          >
            {generating ? 'Generating…' : 'Generate MAPs'}
          </button>
          {linkedPolicies.length > 0 ? (
            <button
              onClick={() => setPolicyOpen(true)}
              style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter', color: '#FFFFFF' }}
            >
              Internal Policy ({linkedPolicies[0].version})
            </button>
          ) : (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter' }}>No linked policy</span>
          )}
        </div>
      </div>

      <PolicyDrawer open={policyOpen} policies={linkedPolicies} onClose={() => setPolicyOpen(false)} />

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 p-1" style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E8E8E3', display: 'inline-flex', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {(['maps', 'graph', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter', fontWeight: activeTab === tab ? 600 : 400, background: activeTab === tab ? '#111' : 'transparent', color: activeTab === tab ? '#8ad8ff' : '#888880', textTransform: 'capitalize', transition: 'all 0.15s' }}>
            {tab}
            {tab === 'maps' && maps && <span style={{ marginLeft: 6, background: activeTab === tab ? 'rgba(138,216,255,0.2)' : '#F0F0EA', color: activeTab === tab ? '#8ad8ff' : '#888880', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 8, fontFamily: 'Geist Mono, monospace' }}>{maps.length}</span>}
          </button>
        ))}
      </div>

      {/* MAPs tab */}
      {activeTab === 'maps' && (
        <div className="flex flex-col gap-3">
          {mapsLoading ? <SkeletonBlock /> : (maps ?? []).length === 0 ? (
            <div style={{ background: '#FFFFFF', borderRadius: 22, border: '1px solid #E8E8E3', padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#888880', fontFamily: 'Inter', margin: 0 }}>No MAPs yet — ingest the PDF then click "Generate MAPs"</p>
            </div>
          ) : (maps ?? []).map(map => {
            const ss = statusStyle[map.status]
            return (
              <div key={map.id} className="card-hover" style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E8E8E3', padding: '18px 22px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                onClick={() => navigate('map-review', map.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#888880', fontFamily: 'Geist Mono, monospace' }}>{map.id.slice(0, 8)}…</span>
                      <span style={{ background: ss?.bg, color: ss?.text, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, fontFamily: 'Inter' }}>{map.status}</span>
                      {map.approval_state && <span style={{ fontSize: 10, color: '#888880', fontFamily: 'Inter' }}>{map.approval_state}</span>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>{map.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {map.deadline && <span style={{ fontSize: 11, color: '#888880', fontFamily: 'Geist Mono, monospace' }}>Due: {map.deadline}</span>}
                      {map.estimated_days && <span style={{ fontSize: 11, color: '#888880', fontFamily: 'Inter' }}>Est: {map.estimated_days}d</span>}
                    </div>
                  </div>
                  {map.confidence != null && (
                    <span style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', fontFamily: 'Inter', letterSpacing: '-1px', flexShrink: 0 }}>{Math.round(map.confidence * 100)}%</span>
                  )}
                </div>
              </div>
            )
          })}
          <button onClick={() => navigate('map-tasks')} style={{ padding: '10px', background: '#F5F5F0', border: '2px dashed #E8E8E3', borderRadius: 16, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter', color: '#888880', fontWeight: 500, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FAFAF8'; e.currentTarget.style.borderColor = '#8ad8ff'; e.currentTarget.style.color = '#0A0A0A' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F5F5F0'; e.currentTarget.style.borderColor = '#E8E8E3'; e.currentTarget.style.color = '#888880' }}>
            View all MAP Tasks
          </button>
        </div>
      )}

      {/* Graph tab */}
      {activeTab === 'graph' && (
        <div style={{ background: '#FFFFFF', borderRadius: 22, border: '1px solid #E8E8E3', padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          {graphLoading ? <SkeletonBlock /> : !graph || graph.nodes.length === 0 ? (
            <p style={{ fontSize: 14, color: '#888880', fontFamily: 'Inter', textAlign: 'center', margin: '40px 0' }}>No dependency graph yet. Generate MAPs first.</p>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: '#888880', fontFamily: 'Inter', margin: '0 0 16px' }}>
                {graph.nodes.length} nodes · {graph.edges.length} edges · {graph.critical_path.length} critical path
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {graph.nodes.map(n => {
                  const ss = statusStyle[n.status]
                  return (
                    <div key={n.id} style={{ background: ss?.bg ?? '#F5F5F0', border: `1px solid ${ss?.text ?? '#E8E8E3'}40`, borderRadius: 10, padding: '6px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: ss?.text ?? '#444440', fontFamily: 'Inter' }}>{n.label || n.id.slice(0, 8)}</span>
                      {n.department && <span style={{ fontSize: 10, color: '#888880', marginLeft: 6, fontFamily: 'Inter' }}>· {n.department}</span>}
                    </div>
                  )
                })}
              </div>
              {graph.critical_path.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: 'Inter', margin: '0 0 8px' }}>Critical Path</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {graph.critical_path.map((id, i) => {
                      const n = graph.nodes.find(x => x.id === id)
                      return (
                        <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#E53935', background: '#FFF3F0', border: '1px solid #FFD7D7', borderRadius: 7, padding: '3px 10px', fontFamily: 'Inter' }}>{n?.label ?? id.slice(0, 8)}</span>
                          {i < graph.critical_path.length - 1 && <span style={{ color: '#E53935', fontSize: 12 }}>→</span>}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div style={{ background: '#FFFFFF', borderRadius: 22, border: '1px solid #E8E8E3', padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          {regulation ? (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#8ad8ff', border: '2px solid #111', flexShrink: 0, marginTop: 2 }} />
              </div>
              <div>
                <p style={{ fontSize: 13, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}><strong>System</strong> regulation uploaded</p>
                <p style={{ fontSize: 11, color: '#888880', margin: 0, marginTop: 2, fontFamily: 'Geist Mono, monospace' }}>{new Date(regulation.created_at).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: '#888880', fontFamily: 'Inter', textAlign: 'center', margin: 0 }}>No history available</p>
          )}
        </div>
      )}
    </div>
  )
}
