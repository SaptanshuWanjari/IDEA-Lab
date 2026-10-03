import { useState } from 'react'
import { useApp } from '../App'
import { api, pilotApi } from '../lib/api'
import { openFilePicker } from '../lib/fileHelper'
import EvidenceDecision from '../components/EvidenceDecision'
import type { AssessmentDraftOut, EvidenceReviewState } from '../lib/types'
import { canReviewRole } from '../lib/types'
import { Card, SectionHead, StatCard, EmptyState } from '../components/ui'

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,27,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pv-card" style={{ padding: 32, width: 480, maxWidth: '92vw', boxShadow: 'var(--shadow-pop)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="pv-mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--brass)' }}>§ FILE EVIDENCE</div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 15, color: 'var(--slate)' }}>×</button>
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, margin: '0 0 4px' }}>Upload evidence</h2>
        <p style={{ fontSize: 12.5, color: 'var(--slate)', margin: '0 0 20px' }}>Filed under maker–checker — a different approver must approve.</p>

        {done ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ width: 56, height: 56, background: 'var(--amber-bg)', border: '1px solid #E7D3A0', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="24" height="24" fill="none" stroke="var(--amber)" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p data-testid="upload-awaiting-approval" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>File submitted — awaiting approval</p>
            <p style={{ fontSize: 12.5, color: 'var(--slate)', margin: '6px 0 0' }}>A different approver must approve before this item can complete.</p>
          </div>
        ) : (
          <>
            {!picked ? (
              <button onClick={handlePick}
                style={{ width: '100%', border: '1px dashed var(--brass)', borderRadius: 10, padding: '30px 24px', textAlign: 'center', cursor: 'pointer', background: 'var(--brass-wash)', marginBottom: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Select a file</p>
                <p style={{ fontSize: 12, color: 'var(--slate)', margin: '4px 0 0' }}>PDF, DOC, XLS, PNG, JPG · Max 20 MB</p>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 9, marginBottom: 16, background: 'var(--paper)', border: '1px solid var(--line-soft)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{picked.fileName}</p>
                  <p className="pv-mono" style={{ fontSize: 10.5, color: 'var(--slate)', margin: 0 }}>{(picked.blob.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={() => setPicked(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', fontSize: 16 }}>×</button>
              </div>
            )}

            {!mapId && (
              <p style={{ fontSize: 12, color: 'var(--amber)', background: 'var(--amber-bg)', border: '1px solid #E7D3A0', borderRadius: 8, padding: '8px 12px', margin: '0 0 12px' }}>
                No MAP in context — open a MAP and use “Upload Evidence” to link this file.
              </p>
            )}
            {error && <p style={{ fontSize: 12, color: 'var(--scarlet)', margin: '0 0 12px' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleUpload} disabled={uploading || !picked} className="pv-btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: picked ? 1 : 0.5 }}>
                {uploading ? 'Filing…' : 'Submit evidence'}
              </button>
              <button onClick={onClose} className="pv-btn-ghost">Cancel</button>
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
        <UploadModal mapId={selectedId}
          onClose={() => setShowUpload(false)}
          onUploaded={(name, evidenceId) => {
            const ext = name.split('.').pop()?.toUpperCase() ?? 'FILE'
            setRecentUploads(prev => [{ name, time: 'just now', ext, evidenceId, state: 'file-submitted', assessment: null }, ...prev])
            toast('success', 'Evidence submitted', `${name} filed — awaiting a different approver`)
          }} />
      )}

      <div style={{ width: '100%' }}>
        <div className="pv-grid12" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16, marginBottom: 16 }}>
          <div className="pv-span3" style={{ gridColumn: 'span 3' }}><StatCard eyebrow="Session filings" value={String(recentUploads.length)} caption="Files submitted this session" /></div>
          <div className="pv-span3" style={{ gridColumn: 'span 3' }}><StatCard eyebrow="Accepted types" value="5" caption="PDF · DOC · XLS · PNG · JPG" /></div>
          <div className="pv-span3" style={{ gridColumn: 'span 3' }}><StatCard eyebrow="Max file size" value="20MB" caption="Per-file upload limit" /></div>
          <div className="pv-span3" style={{ gridColumn: 'span 3' }}><StatCard eyebrow="MAP linkage" value={selectedId ? 'Linked' : '—'} caption={selectedId ? `Folio ${selectedId.slice(0, 8)}… in context` : 'Open a MAP to link filings'} /></div>
        </div>

        <Card>
          <SectionHead
            eyebrow="§ Evidence vault"
            title="Session filings"
            sub={selectedId ? <>Filing against MAP <strong className="pv-mono">{selectedId.slice(0, 8)}…</strong> — approval requires a different approver.</> : 'Open a MAP task and file evidence against it.'}
            right={<button onClick={() => setShowUpload(true)} className="pv-btn-primary pv-btn-brass">+ File evidence</button>}
          />
          {recentUploads.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentUploads.map((ev, i) => (
                <div key={i} data-testid="session-upload" data-state={ev.state}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 9, background: 'var(--paper)', border: '1px solid var(--line-soft)' }}>
                    <span className="pv-mono" style={{ fontSize: 10, fontWeight: 700, background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '4px 8px', color: 'var(--slate)' }}>{ev.ext}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</p>
                      <p className="pv-mono" style={{ fontSize: 10.5, color: 'var(--faint)', margin: 0 }}>{ev.time}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <EvidenceDecision state={ev.state} assessment={ev.assessment} canDecide={canDecide} busy={deciding === ev.name}
                      onApprove={rationale => void handleDecision(i, 'APPROVED', rationale)}
                      onReject={rationale => void handleDecision(i, 'REJECTED', rationale)} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No evidence filed this session" hint="File artefacts against the MAP in context — each filing enters maker–checker." />
          )}
        </Card>
      </div>
    </>
  )
}
