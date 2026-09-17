import { useState } from 'react'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import type { MAPOut } from '../lib/types'

const priorityFromConfidence = (c: number | null): string => {
  if (c == null) return 'Medium'
  if (c >= 0.85) return 'Critical'
  if (c >= 0.70) return 'High'
  if (c >= 0.50) return 'Medium'
  return 'Low'
}

const priorityStyle: Record<string, { bg: string; text: string }> = {
  Critical: { bg: '#FFF3F0', text: '#C13B2A' },
  High:     { bg: '#FFF8E1', text: '#C17B00' },
  Medium:   { bg: '#F0F0FF', text: '#4040C0' },
  Low:      { bg: '#F0FFF0', text: '#2D8A4E' },
}

const statusStyle: Record<string, { bg: string; text: string }> = {
  Overdue:     { bg: '#FFF3F0', text: '#C13B2A' },
  'In Progress':{ bg: '#F0F0FF', text: '#4040C0' },
  InProgress:  { bg: '#F0F0FF', text: '#4040C0' },
  Pending:     { bg: '#FFF8E1', text: '#C17B00' },
  Completed:   { bg: '#F0FFF0', text: '#2D8A4E' },
  Draft:       { bg: '#F0F0EA', text: '#666660' },
  Rejected:    { bg: '#FFF3F0', text: '#C13B2A' },
}

const kanbanCols = ['Pending', 'InProgress', 'Completed', 'Rejected']

function ErrorBanner({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div style={{ background: '#FFF3F0', border: '1px solid #FFD7D7', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <p style={{ fontSize: 13, color: '#C13B2A', margin: 0, fontFamily: 'Inter' }}>{msg}</p>
      <button onClick={onRetry} style={{ fontSize: 12, color: '#C13B2A', background: 'none', border: '1px solid #C13B2A', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: 'Inter' }}>Retry</button>
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 p-1" style={{ background: '#FFFFFF', border: '1px solid #E8E8E3', borderRadius: 10 }}>
          {(['list', 'kanban'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter', fontWeight: view === v ? 600 : 400, background: view === v ? '#111' : 'transparent', color: view === v ? '#3B82F6' : '#888880', textTransform: 'capitalize', transition: 'all 0.15s' }}>
              {v === 'list'
                ? <span className="flex items-center gap-1.5"><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> List</span>
                : <span className="flex items-center gap-1.5"><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg> Kanban</span>
              }
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#888880', fontFamily: 'Inter' }}>
          <span style={{ fontWeight: 700, color: '#0A0A0A' }}>{rows.length}</span> tasks total
        </span>
      </div>

      {error && <ErrorBanner msg={error} onRetry={refetch} />}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: 52, background: '#F5F5F0', borderRadius: 12 }} />)}
        </div>
      ) : view === 'list' ? (
        <div style={{ background: '#FFFFFF', borderRadius: 26, border: '1px solid #E8E8E3', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E8E3' }}>
                {['MAP ID', 'Description', 'Priority', 'Status', 'Deadline', 'Est. Days', ''].map(col => (
                  <th key={col} style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#888880', padding: '12px 14px', fontFamily: 'Inter' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', fontSize: 14, color: '#888880', fontFamily: 'Inter' }}>
                    No MAP tasks found
                  </td>
                </tr>
              ) : rows.map((row, i) => {
                const priority = priorityFromConfidence(row.confidence)
                const ps = priorityStyle[priority]
                const ss = statusStyle[row.status] ?? statusStyle['Pending']
                return (
                  <tr
                    key={row.id}
                    style={{ borderBottom: i < rows.length - 1 ? '1px solid #F5F5F0' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                    onClick={() => navigate('map-review', row.id)}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 14px', fontSize: 11, fontWeight: 700, color: '#888880', fontFamily: 'Geist Mono, monospace' }}>{row.id.slice(0, 8)}…</td>
                    <td style={{ padding: '13px 14px', fontSize: 13, color: '#0A0A0A', fontFamily: 'Inter', maxWidth: 280 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</span>
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <span style={{ background: ps.bg, color: ps.text, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, fontFamily: 'Inter' }}>{priority}</span>
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <span style={{ background: ss.bg, color: ss.text, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, fontFamily: 'Inter' }}>{row.status}</span>
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 11, color: '#888880', fontFamily: 'Geist Mono, monospace', whiteSpace: 'nowrap' }}>{row.deadline ?? '—'}</td>
                    <td style={{ padding: '13px 14px', fontSize: 11, color: '#888880', fontFamily: 'Geist Mono, monospace' }}>{row.estimated_days ?? '—'}</td>
                    <td style={{ padding: '13px 14px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); navigate('map-review', row.id) }}
                        style={{ padding: '4px 10px', background: '#F5F5F0', border: '1px solid #E8E8E3', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'Inter', color: '#0A0A0A', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#3B82F6'; e.currentTarget.style.borderColor = '#111' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#F5F5F0'; e.currentTarget.style.color = '#0A0A0A'; e.currentTarget.style.borderColor = '#E8E8E3' }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {kanbanCols.map(col => {
            const colMaps = rows.filter(m => m.status === col)
            const ss = statusStyle[col] ?? statusStyle['Pending']
            return (
              <div key={col} style={{ background: '#FAFAF8', borderRadius: 20, border: '1px solid #E8E8E3', padding: 16 }}>
                <div className="flex items-center justify-between mb-4">
                  <span style={{ background: ss.bg, color: ss.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, fontFamily: 'Inter' }}>{col}</span>
                  <span style={{ fontSize: 11, color: '#888880', fontFamily: 'Geist Mono, monospace' }}>{colMaps.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {colMaps.map(map => {
                    const priority = priorityFromConfidence(map.confidence)
                    return (
                      <div
                        key={map.id}
                        onClick={() => navigate('map-review', map.id)}
                        style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E8E8E3', padding: 14, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span style={{ fontSize: 10, color: '#888880', fontFamily: 'Geist Mono, monospace' }}>{map.id.slice(0, 8)}…</span>
                          <span style={{ background: priorityStyle[priority].bg, color: priorityStyle[priority].text, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10, fontFamily: 'Inter' }}>{priority}</span>
                        </div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', margin: 0, marginBottom: 10, fontFamily: 'Inter', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{map.description}</p>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: 10, color: '#888880', fontFamily: 'Inter' }}>{map.estimated_days ? `${map.estimated_days}d est.` : ''}</span>
                          <span style={{ fontSize: 10, color: '#888880', fontFamily: 'Geist Mono, monospace' }}>{map.deadline ?? ''}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
