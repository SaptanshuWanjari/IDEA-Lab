import { useState } from 'react'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import type { MAPOut, MAPReviewAction } from '../lib/types'

const typeStyle: Record<string, { bg: string; text: string }> = {
  PDF: { bg: '#FFF3F0', text: '#C13B2A' },
  XLS: { bg: '#F0FFF0', text: '#2D8A4E' },
  DOC: { bg: '#FFF8E1', text: '#C17B00' },
}

const statusStyle: Record<string, { bg: string; text: string }> = {
  Approved:     { bg: '#F0FFF0', text: '#2D8A4E' },
  Review:       { bg: '#F0F0FF', text: '#4040C0' },
  Overdue:      { bg: '#FFF3F0', text: '#C13B2A' },
  'In Progress':{ bg: '#F0F0FF', text: '#4040C0' },
  InProgress:   { bg: '#F0F0FF', text: '#4040C0' },
  Pending:      { bg: '#FFF8E1', text: '#C17B00' },
  Critical:     { bg: '#FFF3F0', text: '#C13B2A' },
  Rejected:     { bg: '#FFF3F0', text: '#C13B2A' },
  Draft:        { bg: '#F0F0EA', text: '#666660' },
  Completed:    { bg: '#F0FFF0', text: '#2D8A4E' },
}

function Skeleton() {
  return <div style={{ height: 300, background: '#F5F5F0', borderRadius: 22 }} />
}

export default function MapReviewPage() {
  const { navigate, toast, selectedId } = useApp()
  const [comments, setComments] = useState<{ author: string; avatar: string; time: string; text: string }[]>([])
  const [commentText, setCommentText] = useState('')
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { data: mapData, loading, error, refetch } = useApi<MAPOut>(
    () => {
      if (!selectedId) return Promise.reject(new Error('No MAP selected'))
      return api.get<MAPOut>(`/maps/${selectedId}`)
    },
    [selectedId],
  )

  const handleSubmitReview = async () => {
    if (!decision || !selectedId) return
    setSubmitting(true)
    try {
      const action: MAPReviewAction = {
        action: decision,
        description: reviewNotes || undefined,
      }
      await api.post(`/maps/${selectedId}/review`, action)
      setSubmitted(true)
      toast(
        decision === 'approve' ? 'success' : 'warning',
        decision === 'approve' ? 'MAP Approved' : 'Revision Requested',
        decision === 'approve' ? 'MAP has been approved and closed.' : 'MAP returned to assignee for revision.',
      )
      setTimeout(() => navigate('map-tasks'), 1200)
    } catch (err: unknown) {
      toast('error', 'Review failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePostComment = () => {
    if (!commentText.trim()) return
    setComments(prev => [{ author: 'You', avatar: 'ME', time: 'just now', text: commentText }, ...prev])
    setCommentText('')
    toast('info', 'Comment posted', 'Your comment has been added to the discussion.')
  }

  if (!selectedId) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ fontSize: 14, color: '#888880', fontFamily: 'Inter' }}>No MAP selected.</p>
        <button onClick={() => navigate('map-tasks')} style={{ marginTop: 16, padding: '8px 20px', background: '#111', color: '#3B82F6', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter' }}>← Back</button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate('map-tasks')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888880', fontSize: 12, fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          MAP Tasks
        </button>
        <span style={{ color: '#D0D0C8', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12, color: '#0A0A0A', fontFamily: 'Inter', fontWeight: 500 }}>{selectedId.slice(0, 8)}…</span>
        <span style={{ color: '#D0D0C8', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12, color: '#0A0A0A', fontFamily: 'Inter', fontWeight: 500 }}>Review</span>
      </div>

      {error && (
        <div style={{ background: '#FFF3F0', border: '1px solid #FFD7D7', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, color: '#C13B2A', margin: 0, fontFamily: 'Inter' }}>{error}</p>
          <button onClick={refetch} style={{ fontSize: 12, color: '#C13B2A', background: 'none', border: '1px solid #C13B2A', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: 'Inter' }}>Retry</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        {/* Left */}
        <div className="flex flex-col gap-5">

          {/* MAP header */}
          <div style={{ background: '#FFFFFF', borderRadius: 22, border: '1px solid #E8E8E3', padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            {loading ? <Skeleton /> : mapData && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#888880', fontFamily: 'Geist Mono, monospace' }}>{mapData.id.slice(0, 8)}…</span>
                      <span style={{ background: statusStyle[mapData.status]?.bg, color: statusStyle[mapData.status]?.text, fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, fontFamily: 'Inter' }}>{mapData.status}</span>
                      {mapData.approval_state && <span style={{ background: statusStyle[mapData.approval_state]?.bg, color: statusStyle[mapData.approval_state]?.text, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, fontFamily: 'Inter' }}>{mapData.approval_state}</span>}
                    </div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.4px', lineHeight: 1.3 }}>{mapData.description}</h1>
                    {mapData.reasoning && (
                      <p style={{ fontSize: 13, color: '#888880', margin: 0, marginTop: 10, fontFamily: 'Inter', lineHeight: 1.6 }}>{mapData.reasoning}</p>
                    )}
                  </div>
                  {mapData.confidence != null && (
                    <div style={{ flexShrink: 0, textAlign: 'center' }}>
                      <div style={{ position: 'relative', width: 80, height: 80 }}>
                        <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#F0F0EA" strokeWidth="8"/>
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#3B82F6" strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 32}`} strokeDashoffset={`${2 * Math.PI * 32 * (1 - mapData.confidence)}`}/>
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: '#0A0A0A', fontFamily: 'Inter', letterSpacing: '-0.5px' }}>{Math.round(mapData.confidence * 100)}%</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 10, color: '#888880', margin: 0, marginTop: 4, fontFamily: 'Inter' }}>confidence</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-6 mt-5 pt-4" style={{ borderTop: '1px solid #F5F5F0' }}>
                  {[
                    { label: 'Deadline', value: mapData.deadline ?? '—' },
                    { label: 'Est. Days', value: mapData.estimated_days ? `${mapData.estimated_days}d` : '—' },
                    { label: 'Created', value: new Date(mapData.created_at).toLocaleDateString('en-IN') },
                  ].map(item => (
                    <div key={item.label}>
                      <p style={{ fontSize: 10, color: '#888880', margin: 0, textTransform: 'uppercase', letterSpacing: '0.3px', fontFamily: 'Inter' }}>{item.label}</p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Evidence required */}
          {mapData?.evidence_required && mapData.evidence_required.length > 0 && (
            <div style={{ background: '#FFFFFF', borderRadius: 22, border: '1px solid #E8E8E3', padding: '22px 26px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px', marginBottom: 16 }}>Evidence Required</h2>
              <div className="flex flex-col gap-2">
                {mapData.evidence_required.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FAFAF8', border: '1px solid #F0F0EA' }}>
                    <div style={{ width: 34, height: 34, background: typeStyle['PDF'].bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 8, fontWeight: 800, color: typeStyle['PDF'].text, fontFamily: 'Geist Mono, monospace' }}>REQ</span>
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>{ev}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('evidence', selectedId)} style={{ marginTop: 14, padding: '6px 12px', background: '#3B82F6', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter', color: '#111' }}>Upload Evidence</button>
            </div>
          )}

          {/* Source clauses */}
          {mapData?.source_clauses && mapData.source_clauses.length > 0 && (
            <div style={{ background: '#FFFFFF', borderRadius: 22, border: '1px solid #E8E8E3', padding: '22px 26px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px', marginBottom: 16 }}>Source Clauses</h2>
              <div className="flex flex-wrap gap-2">
                {mapData.source_clauses.map((c, i) => (
                  <span key={i} style={{ background: '#F5F5F0', border: '1px solid #E8E8E3', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontFamily: 'Geist Mono, monospace', color: '#444440' }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-5">

          {/* Review decision */}
          <div style={{ background: '#111111', borderRadius: 22, padding: 22, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0, fontFamily: 'Inter', marginBottom: 4 }}>Review Decision</h3>
            <p style={{ fontSize: 11, color: '#666660', margin: 0, fontFamily: 'Inter', marginBottom: 18 }}>Submit your decision as reviewer</p>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 44, height: 44, background: decision === 'approve' ? '#3B82F6' : '#FF6B6B', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg width="20" height="20" fill="none" stroke={decision === 'approve' ? '#111' : '#fff'} strokeWidth="2.5" viewBox="0 0 24 24">
                    {decision === 'approve' ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                  </svg>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: 0, fontFamily: 'Inter' }}>
                  {decision === 'approve' ? 'MAP Approved' : 'Revision Requested'}
                </p>
                <p style={{ fontSize: 11, color: '#666660', margin: 0, marginTop: 4, fontFamily: 'Inter' }}>Redirecting...</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2 mb-4">
                  {(['approve', 'reject'] as const).map(d => (
                    <button key={d} onClick={() => setDecision(d)}
                      style={{ padding: '10px 16px', borderRadius: 12, border: `2px solid ${decision === d ? (d === 'approve' ? '#3B82F6' : '#FF6B6B') : 'rgba(255,255,255,0.1)'}`, background: decision === d ? (d === 'approve' ? '#3B82F6' : '#FF6B6B') : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Inter', color: decision === d ? '#111' : '#FFFFFF', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        {d === 'approve' ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                      </svg>
                      {d === 'approve' ? 'Approve MAP' : 'Request Revision'}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Add review notes (optional)..."
                  style={{ width: '100%', height: 80, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px', fontSize: 12, fontFamily: 'Inter', background: 'rgba(255,255,255,0.05)', color: '#FFFFFF', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={!decision || submitting}
                  style={{ width: '100%', padding: '11px', marginTop: 12, background: decision ? '#3B82F6' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: decision && !submitting ? 'pointer' : 'not-allowed', fontFamily: 'Inter', color: decision ? '#111' : '#666660', transition: 'all 0.15s' }}
                >
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </>
            )}
          </div>

          {/* Discussion */}
          <div style={{ background: '#FFFFFF', borderRadius: 22, border: '1px solid #E8E8E3', padding: '20px 22px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px', marginBottom: 16 }}>Discussion</h3>
            <div className="flex flex-col gap-4 mb-4">
              {comments.length === 0 ? (
                <p style={{ fontSize: 12, color: '#AAAAAA', fontFamily: 'Inter', margin: 0 }}>No comments yet</p>
              ) : comments.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#111', flexShrink: 0, fontFamily: 'Inter' }}>{c.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: 'Inter' }}>{c.author}</span>
                      <span style={{ fontSize: 10, color: '#AAAAAA', fontFamily: 'Inter' }}>{c.time}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#444440', margin: 0, fontFamily: 'Inter', lineHeight: 1.5 }}>{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #F0F0EA', paddingTop: 14 }}>
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePostComment() }}
                style={{ width: '100%', height: 72, border: '1px solid #E8E8E3', borderRadius: 10, padding: '10px 12px', fontSize: 12, fontFamily: 'Inter', background: '#FAFAF8', color: '#0A0A0A', resize: 'none', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                onBlur={e => e.currentTarget.style.borderColor = '#E8E8E3'}
              />
              <div className="flex items-center justify-between mt-2">
                <span style={{ fontSize: 10, color: '#BBBBBB', fontFamily: 'Inter' }}>⌘↵ to post</span>
                <button
                  onClick={handlePostComment}
                  disabled={!commentText.trim()}
                  style={{ padding: '7px 14px', background: commentText.trim() ? '#111' : '#F5F5F0', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: commentText.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Inter', color: commentText.trim() ? '#3B82F6' : '#AAAAAA', transition: 'all 0.15s' }}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
