import type { CSSProperties, ReactNode } from 'react'

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="pv-eyebrow" style={style}>{children}</div>
}

export function Card({ children, style, pad = true }: { children: ReactNode; style?: CSSProperties; pad?: boolean }) {
  return <section className={`pv-card${pad ? ' pv-card-pad' : ''}`} style={style}>{children}</section>
}

export function SectionHead({ eyebrow, title, sub, right }: { eyebrow: string; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="pv-h2">{title}</h2>
        {sub && <p className="pv-sub">{sub}</p>}
      </div>
      {right && <div style={{ flexShrink: 0, paddingTop: 18 }}>{right}</div>}
    </div>
  )
}

type ChipTone = 'ok' | 'bad' | 'warn' | 'navy' | 'brass' | 'neutral'

const dotColor: Record<ChipTone, string> = {
  ok: '#1B6B4A', bad: '#A83226', warn: '#B77900', navy: '#13293F', brass: '#9A7B2E', neutral: '#8A94A1',
}

export function StatusChip({ tone = 'neutral', children }: { tone?: ChipTone; children: ReactNode }) {
  const cls = tone === 'neutral' ? 'pv-chip' : `pv-chip pv-chip--${tone === 'warn' ? 'warn' : tone === 'ok' ? 'ok' : tone === 'bad' ? 'bad' : tone === 'brass' ? 'brass' : 'navy'}`
  return (
    <span className={cls}>
      <span className="dot" style={{ background: dotColor[tone] }} />
      {children}
    </span>
  )
}

export function statusToneFor(status: string): ChipTone {
  const s = (status || '').toLowerCase()
  if (s.includes('complet') || s.includes('approv') || s === 'active') return 'ok'
  if (s.includes('overdue') || s.includes('reject') || s.includes('breach') || s === 'pending') return 'bad'
  if (s.includes('review') || s.includes('progress') || s.includes('due')) return 'warn'
  if (s.includes('draft')) return 'neutral'
  return 'navy'
}

export function StatCard({ eyebrow, value, caption, delta, onClick }: {
  eyebrow: string; value: string; caption: string; delta?: { text: string; good: boolean }; onClick?: () => void
}) {
  return (
    <section
      className="pv-card pv-card-pad"
      style={{ cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}
    >
      <div className="pv-eyebrow">{eyebrow}</div>
      <div className="pv-numeral" style={{ fontSize: 38, fontWeight: 600, lineHeight: 1.1, marginTop: 10 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: 'var(--slate)', marginTop: 4 }}>{caption}</div>
      {delta && (
        <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 8, color: delta.good ? 'var(--emerald)' : 'var(--scarlet)' }}>
          {delta.good ? '▲ ' : '▼ '}{delta.text}
        </div>
      )}
    </section>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div className="pv-mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--brass)' }}>§ NO RECORDS</div>
      <p style={{ fontSize: 14, fontWeight: 600, margin: '8px 0 4px' }}>{title}</p>
      {hint && <p style={{ fontSize: 12.5, color: 'var(--slate)', margin: 0 }}>{hint}</p>}
    </div>
  )
}
