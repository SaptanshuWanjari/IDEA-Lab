import { useState, useEffect } from 'react'
import { Plus, Search, ArrowRight, AlertCircle, FileText, Inbox, Trash2 } from 'lucide-react'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import { openFilePicker } from '../lib/fileHelper'
import type { RegulationOut } from '../lib/types'
import CleanDbModal from '../components/CleanDbModal'
import {
  Card,
  SectionHead,
  StatusChip,
  statusToneFor,
  EmptyState,
} from '../components/ui'

const statusFilters = ['All', 'Active', 'In Progress', 'Review', 'Pending', 'Completed']

export default function RegulationsPage() {
  const { navigate, toast } = useApp()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [uploading, setUploading] = useState(false)
  const [showCleanDbModal, setShowCleanDbModal] = useState(false)

  // Handle navigation from DemoModal
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.regId) {
        navigate('regulation-detail', e.detail.regId)
      }
    }
    window.addEventListener('navigate-to-regulation', handler as EventListener)
    return () => window.removeEventListener('navigate-to-regulation', handler as EventListener)
  }, [navigate])

  const {
    data: regulations,
    loading,
    error,
    refetch,
  } = useApi<RegulationOut[]>(
    () => api.get<RegulationOut[]>('/regulations/'),
    [],
  )

  const allRegs = regulations ?? []
  const filtered = allRegs.filter(
    r =>
      (filterStatus === 'All' || r.status === filterStatus) &&
      ((r.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
        r.id.includes(search)),
  )

  const handleUpload = async () => {
    setUploading(true)
    try {
      const picked = await openFilePicker({
        accept: '.pdf',
        extensions: ['pdf'],
      })
      if (!picked || !picked.blob) {
        setUploading(false)
        return
      }
      const fd = new FormData()
      fd.append('file', picked.blob, picked.fileName)
      const reg = await api.postForm<RegulationOut>('/regulations/', fd)
      toast('success', 'Circular registered', reg.title ?? picked.fileName)
      refetch()
      navigate('regulation-detail', reg.id)
    } catch (err: unknown) {
      toast(
        'error',
        'Upload failed',
        err instanceof Error ? err.message : 'Unknown error',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full">
      <Card pad={true}>
        {/* Main Section Header */}
        <SectionHead
          eyebrow="CIRCULARS LEDGER"
          title="RBI circulars"
          badge={`${filtered.length} folios`}
          sub="Manage registered regulatory circulars, intake dates, and folio references."
          right={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCleanDbModal(true)}
                className="h-9.5 px-3 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-xs"
                title="Reset generated policies, MAP tasks, and audit logs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clean DB</span>
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="h-9.5 px-3.5 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer disabled:opacity-70 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{uploading ? 'Registering…' : 'Register circular'}</span>
              </button>
            </div>
          }
        />

        {/* Toolbar: Search input + Status filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5 pt-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title or folio ID..."
              className="w-full h-9.5 pl-9 pr-3 text-[13px] bg-[#F1F5F9] border border-[#E2EAF2] rounded-lg text-[#102A43] placeholder-slate-400 focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/15 transition-all"
              aria-label="Search circulars"
            />
          </div>

          <div className="inline-flex items-center gap-1 bg-[#F1F5F9] border border-[#E2EAF2] rounded-lg p-1 overflow-x-auto">
            {statusFilters.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === s
                    ? 'bg-[#0D9488] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={refetch}
              className="px-3 py-1 rounded-md border border-red-300 bg-white hover:bg-red-100/50 text-red-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content area: loading skeletons, table, or empty state */}
        <div className="w-full">
          {loading ? (
            <div className="flex flex-col gap-2.5 py-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-[#F1F5F9] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2EAF2]">
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Folio</th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Title</th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Registered</th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => navigate('regulation-detail', row.id)}
                      className="hover:bg-[#F1F5F9]/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 pr-4 text-[12px] font-mono font-semibold text-slate-600 whitespace-nowrap">
                        {row.id.slice(0, 8)}…
                      </td>
                      <td className="py-3.5 pr-4 max-w-md">
                        <span className="text-[13.5px] font-semibold text-[#102A43] block truncate leading-snug">
                          {row.title ?? '(untitled)'}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <StatusChip tone={statusToneFor(row.status)}>
                          {row.status}
                        </StatusChip>
                      </td>
                      <td className="py-3.5 pr-4 text-[12px] font-mono text-slate-500 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            navigate('regulation-detail', row.id)
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:text-[#0b7e73] hover:bg-teal-50 px-2.5 py-1 rounded transition-colors cursor-pointer"
                        >
                          <span>Open folio</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : allRegs.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-5 h-5 text-slate-400" />}
              title="No circulars registered"
              hint="Register a circular PDF to begin tracking regulatory intake and folios."
              action={
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="h-9 px-3.5 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register circular</span>
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={<FileText className="w-5 h-5 text-slate-400" />}
              title="No matching circulars found"
              hint="Adjust your search keywords or filter status to view registered folios."
              action={
                <button
                  onClick={() => {
                    setSearch('')
                    setFilterStatus('All')
                  }}
                  className="h-8.5 px-3 rounded-lg border border-[#E2EAF2] hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Clear filters
                </button>
              }
            />
          )}
        </div>
      </Card>

      <CleanDbModal
        open={showCleanDbModal}
        onClose={() => setShowCleanDbModal(false)}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
