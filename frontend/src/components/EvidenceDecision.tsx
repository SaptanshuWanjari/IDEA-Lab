import { useState } from 'react'
import type { AssessmentDraftOut, EvidenceReviewState } from '../lib/types'

interface Props {
  state: EvidenceReviewState
  assessment?: AssessmentDraftOut | null
  canDecide: boolean
  busy?: boolean
  onApprove: (rationale?: string) => void
  onReject: (rationale: string) => void
}

const stateStyle: Record<EvidenceReviewState, { bg: string; text: string; label: string }> = {
  'file-submitted':   { bg: '#FFF8E1', text: '#C17B00', label: 'File submitted — awaiting approval' },
  'needs-review':     { bg: '#F0F0FF', text: '#4040C0', label: 'Needs review' },
  'approved':         { bg: '#F0F0FF', text: '#4040C0', label: 'Approved — pending completion' },
  'rejected':         { bg: '#FFF3F0', text: '#C13B2A', label: 'Rejected' },
  'exception-active': { bg: '#FFF3F0', text: '#C13B2A', label: 'Exception active' },
  'completed':        { bg: '#F0FFF0', text: '#2D8A4E', label: 'Completed' },
}

/**
 * Evidence decision card. An attachment alone NEVER renders a green
 * "Completed" badge — completion requires a separate approver's approval.
 */
export default function EvidenceDecision({ state, assessment, canDecide, busy, onApprove, onReject }: Props) {
  const [rationale, setRationale] = useState('')
  const [error, setError] = useState('')
  const s = stateStyle[state]

  const handleReject = () => {
    if (!rationale.trim()) {
      setError('Rejection requires a rationale.')
      return
    }
    setError('')
    onReject(rationale.trim())
  }

  return (
    <div data-testid="evidence-decision" style={{ background: '#FFFFFF', border: '1px solid #E8E8E3', borderRadius: 16, padding: '16px 18px' }}>
      <span data-testid="evidence-state" data-state={state} style={{ fontSize: 11, fontWeight: 600, color: s.text, background: s.bg, padding: '3px 10px', borderRadius: 20, fontFamily: 'Inter' }}>
        {s.label}
      </span>
      {state !== 'completed' && (
        <p data-testid="no-premature-completion" style={{ fontSize: 11, color: '#888880', fontFamily: 'Inter', margin: '8px 0 0' }}>
          Attachment alone does not complete this item — a different approver must approve.
        </p>
      )}
      {assessment && (
        <div data-testid="assessment-draft" style={{ marginTop: 10, background: '#FAFAF8', border: '1px solid #F0F0EA', borderRadius: 10, padding: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#444440', margin: '0 0 4px', fontFamily: 'Inter' }}>
            Advisory assessment: {assessment.decision} (advisory only)
          </p>
          {assessment.missing_elements.length > 0 && (
            <p style={{ fontSize: 11, color: '#C17B00', margin: 0, fontFamily: 'Inter' }}>
              Missing: {assessment.missing_elements.join(', ')}
            </p>
          )}
          {assessment.note && (
            <p style={{ fontSize: 11, color: '#888880', margin: '4px 0 0', fontFamily: 'Inter' }}>{assessment.note}</p>
          )}
        </div>
      )}
      {canDecide && (state === 'file-submitted' || state === 'needs-review') ? (
        <div style={{ marginTop: 12 }}>
          <textarea
            data-testid="evidence-rationale"
            value={rationale}
            onChange={e => setRationale(e.target.value)}
            placeholder="Decision rationale (required to reject)…"
            style={{ width: '100%', height: 52, border: '1px solid #E8E8E3', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontFamily: 'Inter', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
          />
          {error && <p style={{ fontSize: 11, color: '#C13B2A', fontFamily: 'Inter', margin: '4px 0 0' }}>{error}</p>}
          <div className="flex items-center gap-2 mt-2">
            <button
              data-testid="approve-evidence"
              onClick={() => onApprove(rationale.trim() || undefined)}
              disabled={busy}
              style={{ padding: '7px 14px', background: '#0C1B2D', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'Inter', color: '#F6F1E2', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? 'Submitting…' : 'Approve evidence'}
            </button>
            <button
              data-testid="reject-evidence"
              onClick={handleReject}
              disabled={busy}
              style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #E53935', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'Inter', color: '#C13B2A' }}
            >
              Reject with rationale
            </button>
          </div>
        </div>
      ) : !canDecide ? (
        <p data-testid="evidence-actions-hidden" style={{ fontSize: 11, color: '#AAAAAA', fontFamily: 'Inter', margin: '10px 0 0' }}>
          Approval actions are hidden — reviewer role required.
        </p>
      ) : null}
    </div>
  )
}
