import { useState } from 'react'
import type { ObligationOut, ObligationValidation } from '../lib/types'
import SourceCitation from './SourceCitation'

interface Props {
  obligation: ObligationOut
  validation?: ObligationValidation | null
  canReview: boolean
  busy?: boolean
  onApprove: (rationale?: string) => void
  onReject: (rationale: string) => void
}

/** Obligation review card: source-first, approve/reject with rationale. */
export default function ObligationReview({ obligation, validation, canReview, busy, onApprove, onReject }: Props) {
  const [rationale, setRationale] = useState('')
  const [error, setError] = useState('')

  const handleReject = () => {
    if (!rationale.trim()) {
      setError('Rejection requires a rationale.')
      return
    }
    setError('')
    onReject(rationale.trim())
  }

  return (
    <div data-testid="obligation-review" style={{ background: '#FFFFFF', border: '1px solid #E8E8E3', borderRadius: 16, padding: '16px 18px' }}>
      <div className="flex items-center gap-2 mb-2">
        <span data-testid="obligation-status" style={{ fontSize: 10, fontWeight: 700, background: '#F0F0FF', color: '#4040C0', padding: '2px 8px', borderRadius: 20, fontFamily: 'Inter' }}>
          {obligation.status}
        </span>
        {obligation.owner_hint && (
          <span style={{ fontSize: 11, color: '#888880', fontFamily: 'Inter' }}>owner hint: {obligation.owner_hint}</span>
        )}
      </div>
      <p data-testid="obligation-text" style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 10px', fontFamily: 'Inter' }}>
        {obligation.obligation_text || '(no extracted text)'}
      </p>
      <SourceCitation
        quote={obligation.quote}
        page={obligation.page}
        clauseId={obligation.clause_id}
        quality={validation?.quality ?? null}
      />
      {validation && !validation.valid && (
        <p data-testid="validation-errors" style={{ fontSize: 11, color: '#C13B2A', fontFamily: 'Inter', margin: '8px 0 0' }}>
          Citation issues: {validation.errors.join('; ')}
        </p>
      )}
      {obligation.reviewer_rationale && (
        <p data-testid="reviewer-rationale" style={{ fontSize: 11, color: '#444440', fontFamily: 'Inter', margin: '8px 0 0' }}>
          Reviewer rationale: {obligation.reviewer_rationale}
        </p>
      )}
      {canReview ? (
        <div style={{ marginTop: 12 }}>
          <textarea
            data-testid="obligation-rationale"
            value={rationale}
            onChange={e => setRationale(e.target.value)}
            placeholder="Reviewer rationale (required to reject)…"
            style={{ width: '100%', height: 56, border: '1px solid #E8E8E3', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontFamily: 'Inter', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
          />
          {error && <p style={{ fontSize: 11, color: '#C13B2A', fontFamily: 'Inter', margin: '4px 0 0' }}>{error}</p>}
          <div className="flex items-center gap-2 mt-2">
            <button
              data-testid="approve-obligation"
              onClick={() => onApprove(rationale.trim() || undefined)}
              disabled={busy}
              style={{ padding: '7px 14px', background: '#0C1B2D', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'Inter', color: '#F6F1E2', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? 'Submitting…' : 'Approve obligation'}
            </button>
            <button
              data-testid="reject-obligation"
              onClick={handleReject}
              disabled={busy}
              style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #E53935', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'Inter', color: '#C13B2A' }}
            >
              Reject with rationale
            </button>
          </div>
        </div>
      ) : (
        <p data-testid="review-hidden" style={{ fontSize: 11, color: '#AAAAAA', fontFamily: 'Inter', margin: '10px 0 0' }}>
          Review actions are hidden — reviewer role required.
        </p>
      )}
    </div>
  )
}
