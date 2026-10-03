import { useState } from 'react'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import type { MAPOut } from '../lib/types'
import { Card, SectionHead, StatusChip, statusToneFor, EmptyState } from '../components/ui'

const priorityFromConfidence = (c: number | null): string => {
  if (c == null) return 'Medium'
  if (c >= 0.85) return 'Critical'
  if (c >= 0.70) return 'High'
  if (c >= 0.50) return 'Medium'
  return 'Low'
}

const priorityTone = (p: string): 'bad' | 'warn' | 'navy' | 'ok' =>
  p === 'Critical' ? 'bad' : p === 'High' ? 'warn' : p === 'Medium' ? 'navy' : 'ok'

const kanbanCols = ['Pending', 'InProgress', 'Completed', 'Rejected']

function ErrorBanner({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div style={{ background: 'var(--scarlet-bg)', border: '1px solid #EFC4BE', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <p style={{ fontSize: 13, color: 'var(--scarlet)', margin: 0 }}>{msg}</p>
      <button onClick={onRetry} className="pv-btn-ghost" style={{ color: 'var(--scarlet)', borderColor: '#EFC4BE' }}>Retry</button>
    </div>
  )
}

export default function MapTasksPage() {
  const { navigate, selectedId } = useApp()
  const [view, setView] = useState<'list' | 'kanban'>('list')

  const { data: maps, loading, error, refetch } = useApi<MAPOut[]>(
    () => {
      const qs = selectedId ? `?regulation_id=${selectedId}` : ''
      return api.get<MAPOut[]>(`/maps/${qs}`)
    },
    [selectedId],
  )

  const rows = maps ?? []

  return (
    <div style={{ width: '100%' }}>
      <Card>
        <SectionHead
          eyebrow={`§ Action register · ${rows.length} MAPs`}
          title="MAP tasks"
          sub={selectedId ? `Scoped to circular folio ${selectedId.slice(0, 8)}…` : 'All measurable action points with owners and due dates.'}
          right={
            <div style={{ display: 'flex', gap: 2, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 9, padding: 3 }}>
              {(['list', 'kanban'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} className="pv-segtab" data-active={view === v} style={{ textTransform: 'capitalize' }}>{v}</button>
              ))}
            </div>
          }
        />

        {error && <ErrorBanner msg={error} onRetry={refetch} />}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ height: 52, background: '#F1EFE9', borderRadius: 8 }} />)}
          </div>
        ) : view === 'list' ? (
          rows.length === 0 ? (
            <EmptyState title="No MAP tasks found" hint="Generate MAPs from a circular folio first." />
          ) : (
            <table className="pv-table">
              <thead><tr>{['MAP ID', 'Description', 'Priority', 'Status', 'Deadline', 'Est. Days', ''].map(col => <th key={col}>{col}</th>)}</tr></thead>
              <tbody>
                {rows.map((row) => {
                  const priority = priorityFromConfidence(row.confidence)
                  return (
                    <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => navigate('map-review', row.id)}>
                      <td className="pv-mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)' }}>{row.id.slice(0, 8)}…</td>
                      <td style={{ fontWeight: 600, maxWidth: 300 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</span>
                      </td>
                      <td><StatusChip tone={priorityTone(priority)}>{priority}</StatusChip></td>
                      <td><StatusChip tone={statusToneFor(row.status)}>{row.status}</StatusChip></td>
                      <td className="pv-mono" style={{ fontSize: 11.5, color: 'var(--slate)', whiteSpace: 'nowrap' }}>{row.deadline ?? '—'}</td>
                      <td className="pv-mono" style={{ fontSize: 11.5, color: 'var(--slate)' }}>{row.estimated_days != null ? `${row.estimated_days}d` : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={e => { e.stopPropagation(); navigate('map-review', row.id) }}
                          className="pv-btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }}
                        >
                          Review →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {kanbanCols.map(col => {
              const colMaps = rows.filter(m => m.status === col)
              return (
                <div key={col} style={{ background: 'var(--paper)', borderRadius: 10, border: '1px solid var(--line)', padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <StatusChip tone={statusToneFor(col)}>{col}</StatusChip>
                    <span className="pv-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>{colMaps.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {colMaps.map(map => {
                      const priority = priorityFromConfidence(map.confidence)
                      return (
                        <div key={map.id} onClick={() => navigate('map-review', map.id)}
                          className="pv-card" style={{ padding: 12, cursor: 'pointer', borderRadius: 9 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span className="pv-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>{map.id.slice(0, 8)}…</span>
                            <StatusChip tone={priorityTone(priority)}>{priority}</StatusChip>
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 8px', lineHeight: 1.45 }}>{map.description}</p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 10.5, color: 'var(--slate)' }}>{map.estimated_days ? `${map.estimated_days}d est.` : '—'}</span>
                            <span className="pv-mono" style={{ fontSize: 10.5, color: 'var(--slate)' }}>{map.deadline ?? ''}</span>
                          </div>
                        </div>
                      )
                    })}
                    {colMaps.length === 0 && <p style={{ fontSize: 11.5, color: 'var(--faint)', textAlign: 'center', margin: '8px 0' }}>No items</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
