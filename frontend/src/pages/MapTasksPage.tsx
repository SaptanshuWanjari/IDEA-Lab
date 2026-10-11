import { useState } from 'react'
import { ArrowRight, LayoutList, Kanban as KanbanIcon, AlertCircle, ListTodo } from 'lucide-react'
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
    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs font-medium text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{msg}</span>
      </div>
      <button
        onClick={onRetry}
        className="px-3 py-1 rounded-md border border-red-300 bg-white hover:bg-red-100/50 text-red-700 text-xs font-semibold transition-colors cursor-pointer"
      >
        Retry
      </button>
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
    <div className="w-full">
      <Card pad={true}>
        <SectionHead
          eyebrow="ACTION REGISTER"
          title="MAP tasks"
          badge={`${rows.length} MAPs`}
          sub={selectedId ? `Scoped to circular folio ${selectedId.slice(0, 8)}…` : 'Track remediation actions, owners, priorities, and deadlines.'}
          right={
            <div className="inline-flex items-center gap-1 bg-[#F1F5F9] border border-[#E2EAF2] rounded-lg p-1">
              <button
                type="button"
                onClick={() => setView('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  view === 'list'
                    ? 'bg-[#0D9488] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setView('kanban')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  view === 'kanban'
                    ? 'bg-[#0D9488] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KanbanIcon className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>
          }
        />

        {error && <ErrorBanner msg={error} onRetry={refetch} />}

        {loading ? (
          <div className="flex flex-col gap-2.5 py-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-[#F1F5F9] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : view === 'list' ? (
          rows.length === 0 ? (
            <EmptyState
              icon={<ListTodo className="w-5 h-5 text-slate-400" />}
              title="No MAP tasks found"
              hint="Generate MAPs from a circular folio first."
            />
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2EAF2]">
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">MAP ID</th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Description</th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Priority</th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Deadline</th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Est. Days</th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(row => {
                    const priority = priorityFromConfidence(row.confidence)
                    return (
                      <tr
                        key={row.id}
                        onClick={() => navigate('map-review', row.id)}
                        className="hover:bg-[#F1F5F9]/50 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 pr-4 text-[12px] font-mono font-semibold text-slate-600">
                          {row.id.slice(0, 8)}…
                        </td>
                        <td className="py-3.5 pr-4 max-w-sm">
                          <p className="text-[13.5px] font-semibold text-[#102A43] m-0 truncate leading-snug">
                            {row.description}
                          </p>
                        </td>
                        <td className="py-3.5 pr-4">
                          <StatusChip tone={priorityTone(priority)}>
                            {priority}
                          </StatusChip>
                        </td>
                        <td className="py-3.5 pr-4">
                          <StatusChip tone={statusToneFor(row.status)}>
                            {row.status}
                          </StatusChip>
                        </td>
                        <td className="py-3.5 pr-4 text-[12px] font-mono text-slate-500 whitespace-nowrap">
                          {row.deadline ?? '—'}
                        </td>
                        <td className="py-3.5 pr-4 text-[12px] font-mono text-slate-500">
                          {row.estimated_days != null ? `${row.estimated_days}d` : '—'}
                        </td>
                        <td className="py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              navigate('map-review', row.id)
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:text-[#0b7e73] hover:bg-teal-50 px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            <span>Review</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {kanbanCols.map(col => {
              const colMaps = rows.filter(m => m.status === col)
              return (
                <div
                  key={col}
                  className="bg-[#F1F5F9] rounded-xl border border-[#E2EAF2] p-3.5 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3 px-0.5">
                    <StatusChip tone={statusToneFor(col)}>{col}</StatusChip>
                    <span className="font-mono text-xs font-semibold text-slate-400">
                      {colMaps.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {colMaps.map(map => {
                      const priority = priorityFromConfidence(map.confidence)
                      return (
                        <div
                          key={map.id}
                          onClick={() => navigate('map-review', map.id)}
                          className="bg-white rounded-lg border border-[#E2EAF2] p-3 cursor-pointer hover:border-slate-300 shadow-xs transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-[11px] font-medium text-slate-400">
                              {map.id.slice(0, 8)}…
                            </span>
                            <StatusChip tone={priorityTone(priority)}>
                              {priority}
                            </StatusChip>
                          </div>
                          <p className="text-[12.5px] font-semibold text-[#102A43] m-0 mb-2 leading-snug">
                            {map.description}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                            <span>{map.estimated_days ? `${map.estimated_days}d est.` : '—'}</span>
                            <span>{map.deadline ?? ''}</span>
                          </div>
                        </div>
                      )
                    })}
                    {colMaps.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4 m-0">
                        No items
                      </p>
                    )}
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
