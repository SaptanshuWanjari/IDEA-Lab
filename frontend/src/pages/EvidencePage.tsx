import { useState } from 'react'
import { useApp } from '../App'
import { api, pilotApi } from '../lib/api'
import { openFilePicker } from '../lib/fileHelper'
import EvidenceDecision from '../components/EvidenceDecision'
import type { AssessmentDraftOut, EvidenceReviewState } from '../lib/types'
import { canReviewRole } from '../lib/types'

const typeColors: Record<string, { bg: string; text: string }> = {
  PDF: { bg: '#FFF3F0', text: '#C13B2A' },
  XLS: { bg: '#F0FFF0', text: '#2D8A4E' },
  ZIP: { bg: '#F0F0FF', text: '#4040C0' },
  DOC: { bg: '#FFF8E1', text: '#C17B00' },
  MP4: { bg: '#F5F0FF', text: '#7B40C0' },
}

function UploadModal({ mapId, onClose, onUploaded }: { mapId: string | null; onClose: () => void; onUploaded: (name: string, evidenceId: string | null) => void }) {
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [picked, setPicked] = useState<{ fileName: string; blob: Blob } | null>(null)
  const [error, setError] = useState('')

  const handlePick = async () => {
    const file = await openFilePicker({ accept: '.pdf,.png,.jpg,.xlsx,.docx', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'xlsx', 'docx'] })
    if (file && file.blob) setPicked({ fileName: file.fileName, blob: file.blob })
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
        const raw = res as { evidence_id?: string; evidenceId?: string; id?: string; evidence?: { id?: string } }
        evidenceId = raw.evidence_id ?? raw.evidenceId ?? raw.evidence?.id ?? (typeof raw.id === 'string' ? raw.id : null)
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#FFFFFF', borderRadius: 28, padding: 36, width: 480, boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.4px' }}>Upload Evidence</h2>
          <button onClick={onClose} style={{ background: '#F5F5F0', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#888880' }}>×</button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ width: 64, height: 64, background: '#FFF8E1', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" fill="none" stroke="#C17B00" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p data-testid="upload-awaiting-approval" style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>File submitted — awaiting approval</p>
            <p style={{ fontSize: 13, color: '#888880', margin: 0, marginTop: 6, fontFamily: 'Inter' }}>A different approver must approve before this item can complete.</p>
          </div>
        ) : (
          <>
            {!picked ? (
              <button
                onClick={handlePick}
                style={{ width: '100%', border: '2px dashed #E8E8E3', borderRadius: 16, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', transition: 'all 0.15s', marginBottom: 20 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#8ad8ff'; e.currentTarget.style.background = 'rgba(138,216,255,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E8E3'; e.currentTarget.style.background = '#FAFAF8' }}
              >
                <div style={{ width: 48, height: 48, background: '#F5F5F0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg width="22" height="22" fill="none" stroke="#888880" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>Click to pick a file</p>
                <p style={{ fontSize: 12, color: '#888880', margin: 0, marginTop: 4, fontFamily: 'Inter' }}>PDF, DOC, XLS, PNG, JPG · Max 20 MB</p>
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl mb-5" style={{ background: '#FAFAF8', border: '1px solid #F0F0EA' }}>
                <div style={{ width: 36, height: 36, background: '#F5F5F0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" fill="none" stroke="#888880" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                </div>
                <div className="flex-1">
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>{picked.fileName}</p>
                  <p style={{ fontSize: 10, color: '#888880', margin: 0, fontFamily: 'Inter' }}>{(picked.blob.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={() => setPicked(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888880', fontSize: 16 }}>×</button>
              </div>
            )}

            {!mapId && (
              <p style={{ fontSize: 12, color: '#C17B00', fontFamily: 'Inter', background: '#FFF8E1', border: '1px solid #FFE58F', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
                Navigate to a specific MAP and click "Upload Evidence" to link this evidence to a MAP task.
              </p>
            )}

            {error && (
              <p style={{ fontSize: 12, color: '#C13B2A', fontFamily: 'Inter', margin: '0 0 12px' }}>{error}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleUpload}
                disabled={uploading || !picked}
                style={{ flex: 1, height: 42, background: picked ? '#111' : '#F5F5F0', color: picked ? '#8ad8ff' : '#AAAAAA', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: picked && !uploading ? 'pointer' : 'not-allowed', fontFamily: 'Inter', opacity: uploading ? 0.7 : 1 }}
              >
                {uploading ? 'Uploading...' : 'Submit Evidence'}
              </button>
              <button onClick={onClose} style={{ padding: '0 20px', height: 42, background: '#F5F5F0', border: '1px solid #E8E8E3', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter', color: '#888880' }}>
                Cancel
              </button>
            </div>
          </>
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

      <div style={{ width: '100%' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Submissions',    value: recentUploads.length.toString(), color: '#8ad8ff' },
            { label: 'Accepted Types', value: '5',   color: '#4CAF50' },
            { label: 'Max File Size',  value: '20MB', color: '#F9A825' },
            { label: 'Linked to MAP',  value: selectedId ? 'Yes' : 'No', color: '#5C5CD6' },
          ].map(stat => (
            <div key={stat.label} className="card-hover" style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid #E8E8E3', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: stat.color, margin: 0, fontFamily: 'Inter', letterSpacing: '-0.8px' }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: '#888880', margin: 0, fontFamily: 'Inter' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p style={{ fontSize: 14, color: '#444440', fontFamily: 'Inter', margin: 0 }}>
              {selectedId
                ? <>Uploading evidence for MAP <strong style={{ fontFamily: 'Geist Mono, monospace' }}>{selectedId.slice(0, 8)}…</strong></>
                : 'Navigate to a MAP task and click "Upload Evidence" to link files.'
              }
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            style={{ padding: '9px 18px', background: '#8ad8ff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter', color: '#111', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Upload Evidence
          </button>
        </div>

        {/* Recent uploads this session — explicit review states, never premature Completed */}
        {recentUploads.length > 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: 26, border: '1px solid #E8E8E3', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E8E3', padding: '12px 20px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>This session's uploads</p>
            </div>
            <div className="flex flex-col gap-3" style={{ padding: 16 }}>
              {recentUploads.map((ev, i) => {
                const tc = typeColors[ev.ext] ?? { bg: '#F5F5F0', text: '#888880' }
                return (
                  <div key={i} data-testid="session-upload" data-state={ev.state}>
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FAFAF8', border: '1px solid #F0F0EA' }}>
                      <div style={{ width: 36, height: 36, background: tc.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: tc.text, fontFamily: 'Geist Mono, monospace' }}>{ev.ext}</span>
                      </div>
                      <div className="flex-1">
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>{ev.name}</p>
                        <p style={{ fontSize: 10, color: '#888880', margin: 0, fontFamily: 'Inter' }}>{ev.time}</p>
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
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
                )
              })}
            </div>
          </div>
        )}

        {recentUploads.length === 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: 26, border: '2px dashed #E8E8E3', padding: '60px 24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 56, height: 56, background: '#F5F5F0', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" fill="none" stroke="#888880" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>No evidence uploaded yet</p>
            <p style={{ fontSize: 13, color: '#888880', margin: 0, marginTop: 6, fontFamily: 'Inter' }}>Click "Upload Evidence" to submit files for a MAP task</p>
          </div>
        )}
      </div>
    </>
  )
}
