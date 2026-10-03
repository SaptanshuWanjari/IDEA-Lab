import type { BankDemoPolicy } from '../lib/bankDemoManifest'

interface PolicyDrawerProps {
  open: boolean
  policies: BankDemoPolicy[]
  onClose: () => void
}

export default function PolicyDrawer({ open, policies, onClose }: PolicyDrawerProps) {
  if (!open) return null
  const [active, ...rest] = policies

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} role="dialog" aria-modal="true" aria-label="Internal policy">
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }}
      />
      <aside
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(420px, 92vw)',
          background: '#FFFFFF', boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '20px 22px 0' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#888880', margin: 0, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Internal Policy{rest.length > 0 ? ` (1 of ${policies.length})` : ''}
            </p>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0A0A0A', margin: '6px 0 0', fontFamily: 'Inter' }}>
              {active?.title ?? 'No linked policy'}
            </h2>
            {active && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6E5620', background: 'var(--brass-wash)', border: '1px solid #DCC88F', padding: '3px 10px', borderRadius: 20, fontFamily: 'IBM Plex Mono, monospace' }}>
                  {active.version}
                </span>
                <span style={{ fontSize: 12, color: '#888880', fontFamily: 'Inter' }}>{active.owner_dept}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close policy drawer"
            style={{ background: '#F5F5F0', border: '1px solid #E8E8E3', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#444440', flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '16px 22px 22px', overflowY: 'auto', flex: 1 }}>
          {!active ? (
            <p style={{ fontSize: 14, color: '#888880', fontFamily: 'Inter', textAlign: 'center', margin: '40px 0' }}>
              No linked policy
            </p>
          ) : (
            <>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', margin: '0 0 8px', fontFamily: 'Inter' }}>
                Procedure preview
              </p>
              <pre style={{
                fontSize: 12, color: '#444440', background: '#F5F5F0', border: '1px solid #E8E8E3',
                borderRadius: 12, padding: '14px 16px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1.6, margin: 0,
              }}>
                {active.excerpt}
              </pre>
              <p style={{ fontSize: 11, color: '#888880', margin: '12px 0 0', fontFamily: 'IBM Plex Mono, monospace' }}>
                {active.file} · {active.id}
              </p>
              {rest.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', margin: '0 0 8px', fontFamily: 'Inter' }}>
                    Also linked
                  </p>
                  {rest.map(p => (
                    <div key={p.id} style={{ border: '1px solid #E8E8E3', borderRadius: 10, padding: '8px 12px', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: 'Inter' }}>{p.title}</span>
                      <span style={{ fontSize: 11, color: '#888880', marginLeft: 8, fontFamily: 'IBM Plex Mono, monospace' }}>{p.version} · {p.owner_dept}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
