import { useState } from 'react'
import { FileUp, UploadCloud, X, CheckCircle2, FileText, Layers, HardDrive, Link2, Plus } from 'lucide-react'
import { useApp } from '../App'
import { api, pilotApi } from '../lib/api'
import { openFilePicker } from '../lib/fileHelper'
import EvidenceDecision from '../components/EvidenceDecision'
import type { AssessmentDraftOut, EvidenceReviewState } from '../lib/types'
import { canReviewRole } from '../lib/types'
import { Card, SectionHead, StatCard, EmptyState } from '../components/ui'

function UploadModal({
  mapId,
  onClose,
  onUploaded,
}: {
  mapId: string | null
  onClose: () => void
  onUploaded: (name: string, evidenceId: string | null) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [picked, setPicked] = useState<{ fileName: string; blob: Blob } | null>(null)
  const [error, setError] = useState('')

  const handlePick = async () => {
    const file = await openFilePicker({
      accept: '.pdf,.png,.jpg,.xlsx,.docx',
      extensions: ['pdf', 'png', 'jpg', 'jpeg', 'xlsx', 'docx'],
    })
    if (file && file.blob) {
      setPicked({ fileName: file.fileName, blob: file.blob })
    }
  }

  const handleUpload = async () => {
    if (!picked) return
    setUploading(true)
    setError('')
    try {
      let evidenceId: string | null = null
      if (mapId) {
        const fd = new FormData()
        fd.append('file', picked.blob, picked.fileName)
        const res = await api.postForm<Record<string, unknown>>(`/maps/${mapId}/complete`, fd)
        const raw = res as {
          evidence_id?: string
          evidenceId?: string
          id?: string
          evidence?: { id?: string }
        }
        evidenceId =
          raw.evidence_id ??
          raw.evidenceId ??
          raw.evidence?.id ??
          (typeof raw.id === 'string' ? raw.id : null)
      }
      setDone(true)
      onUploaded(picked.fileName, evidenceId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-[#0C1B2D]/50 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl border border-[#E2EAF2] p-7 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            FILE EVIDENCE
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg border border-[#E2EAF2] bg-[#F1F5F9] hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-xl font-semibold text-[#102A43] m-0 mb-1">
          Upload evidence
        </h2>
        <p className="text-[12.5px] text-slate-500 m-0 mb-5 leading-relaxed">
          Filed under maker–checker — a different approver must approve.
        </p>

        {done ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 text-[#0D9488] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p data-testid="upload-awaiting-approval" className="text-[15px] font-bold text-[#102A43] m-0">
              File submitted — awaiting approval
            </p>
            <p className="text-[12.5px] text-slate-500 mt-1.5 mb-0">
              A different approver must approve before this item can complete.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {!picked ? (
              <button
                onClick={handlePick}
                className="w-full border-2 border-dashed border-[#E2EAF2] hover:border-[#0D9488] rounded-xl p-6 text-center cursor-pointer bg-[#F1F5F9]/50 hover:bg-teal-50/40 transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-full bg-white border border-[#E2EAF2] group-hover:border-teal-200 text-slate-500 group-hover:text-[#0D9488] flex items-center justify-center transition-colors">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#102A43] m-0">Select a file</p>
                  <p className="text-xs text-slate-500 mt-0.5 m-0">PDF, DOC, XLS, PNG, JPG · Max 20 MB</p>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F1F5F9] border border-[#E2EAF2]">
                <div className="w-8 h-8 rounded-md bg-white border border-[#E2EAF2] text-[#0D9488] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#102A43] m-0 truncate">{picked.fileName}</p>
                  <p className="text-[11px] text-slate-500 m-0 font-mono">{(picked.blob.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={() => setPicked(null)}
                  className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {!mapId && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 m-0">
                No MAP in context — open a MAP and use “Upload Evidence” to link this file.
              </p>
            )}
            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 m-0">
                {error}
              </p>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleUpload}
                disabled={uploading || !picked}
                className="flex-1 h-10 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {uploading ? 'Filing…' : 'Submit evidence'}
              </button>
              <button
                onClick={onClose}
                className="px-4 h-10 rounded-lg border border-[#E2EAF2] hover:bg-slate-100 text-slate-700 text-[13px] font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface SessionUpload {
  name: string
  time: string
  ext: string
  evidenceId: string | null
  state: EvidenceReviewState
  assessment: AssessmentDraftOut | null
}

export default function EvidencePage() {
  const { toast, selectedId, user } = useApp()
  const [showUpload, setShowUpload] = useState(false)
  const [recentUploads, setRecentUploads] = useState<SessionUpload[]>([])
  const [deciding, setDeciding] = useState<string | null>(null)
  const canDecide = canReviewRole(user?.role)

  const handleDecision = async (index: number, decision: 'APPROVED' | 'REJECTED', rationale?: string) => {
    const item = recentUploads[index]
    if (!item?.evidenceId) {
      toast('warning', 'No evidence ID', 'This upload is not linked to a server-side evidence record yet.')
      return
    }
    setDeciding(item.name)
    try {
      await pilotApi.approveEvidence(item.evidenceId, { decision, rationale })
      setRecentUploads(prev => prev.map((u, i) =>
        i === index ? { ...u, state: decision === 'APPROVED' ? 'approved' : 'rejected' } : u,
      ))
      toast(decision === 'APPROVED' ? 'success' : 'warning', decision === 'APPROVED' ? 'Evidence approved' : 'Evidence rejected')
    } catch (err: unknown) {
      toast('error', 'Decision failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDeciding(null)
    }
  }

  return (
    <>
      {showUpload && (
        <UploadModal
          mapId={selectedId}
          onClose={() => setShowUpload(false)}
          onUploaded={(name, evidenceId) => {
            const ext = name.split('.').pop()?.toUpperCase() ?? 'FILE'
            setRecentUploads(prev => [{ name, time: 'just now', ext, evidenceId, state: 'file-submitted', assessment: null }, ...prev])
            toast('success', 'Evidence submitted', `${name} filed — awaiting a different approver`)
          }}
        />
      )}

      <div className="w-full flex flex-col gap-6">
        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FileText className="w-4 h-4 text-[#0D9488]" />}
            eyebrow="Session filings"
            value={String(recentUploads.length)}
            caption="Files submitted this session"
          />
          <StatCard
            icon={<Layers className="w-4 h-4 text-[#0D9488]" />}
            eyebrow="Accepted types"
            value="5"
            caption="PDF · DOC · XLS · PNG · JPG"
          />
          <StatCard
            icon={<HardDrive className="w-4 h-4 text-[#0D9488]" />}
            eyebrow="Max file size"
            value="20MB"
            caption="Per-file upload limit"
          />
          <StatCard
            icon={<Link2 className="w-4 h-4 text-[#0D9488]" />}
            eyebrow="MAP linkage"
            value={selectedId ? 'Linked' : '—'}
            caption={selectedId ? `Folio ${selectedId.slice(0, 8)}… in context` : 'Open a MAP to link filings'}
          />
        </div>

        {/* Evidence Vault Card */}
        <Card pad={true}>
          <SectionHead
            eyebrow="EVIDENCE VAULT"
            title="Session filings"
            sub={
              selectedId ? (
                <>
                  Filing against MAP{' '}
                  <strong className="font-mono text-[#102A43]">{selectedId.slice(0, 8)}…</strong>{' '}
                  — approval requires a different approver.
                </>
              ) : (
                'Open a MAP task and attach supporting evidence for maker-checker review.'
              )
            }
            right={
              <button
                onClick={() => setShowUpload(true)}
                className="h-9.5 px-3.5 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>File evidence</span>
              </button>
            }
          />

          {recentUploads.length > 0 ? (
            <div className="flex flex-col gap-3">
              {recentUploads.map((ev, i) => (
                <div
                  key={i}
                  data-testid="session-upload"
                  data-state={ev.state}
                  className="rounded-lg p-3 bg-[#F1F5F9]/60 border border-[#E2EAF2] flex flex-col gap-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10.5px] font-bold bg-white border border-[#E2EAF2] rounded-md px-2 py-1 text-slate-600 shrink-0">
                      {ev.ext}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#102A43] m-0 truncate">
                        {ev.name}
                      </p>
                      <p className="text-[11px] text-slate-400 m-0 font-mono">
                        {ev.time}
                      </p>
                    </div>
                  </div>
                  <div>
                    <EvidenceDecision
                      state={ev.state}
                      assessment={ev.assessment}
                      canDecide={canDecide}
                      busy={deciding === ev.name}
                      onApprove={rationale => void handleDecision(i, 'APPROVED', rationale)}
                      onReject={rationale => void handleDecision(i, 'REJECTED', rationale)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FileUp className="w-5 h-5 text-[#0D9488]" />}
              title="No evidence filed yet"
              hint="Attach supporting documents to a MAP task. Every filing enters the maker-checker review workflow."
              action={
                <button
                  onClick={() => setShowUpload(true)}
                  className="h-9 px-3.5 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>File evidence</span>
                </button>
              }
            />
          )}
        </Card>
      </div>
    </>
  )
}
