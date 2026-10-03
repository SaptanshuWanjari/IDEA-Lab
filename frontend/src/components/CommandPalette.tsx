import { useState, useEffect, useRef } from 'react'

interface CommandItem {
  id: string
  label: string
  subtitle?: string
  icon: React.ReactNode
  action: () => void
  category: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (page: string) => void
}

const navIcon = (d: string) => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d={d} />
  </svg>
)

export default function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: CommandItem[] = [
    { id: 'dash', label: 'Go to Dashboard', subtitle: 'Overview & KPIs', category: 'Navigate', icon: navIcon('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'), action: () => { onNavigate('dashboard'); onClose() } },
    { id: 'regs', label: 'Go to Regulations', subtitle: 'RBI circular management', category: 'Navigate', icon: navIcon('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'), action: () => { onNavigate('regulations'); onClose() } },
    { id: 'twin', label: 'Digital Compliance Twin', subtitle: 'AI prediction model', category: 'Navigate', icon: navIcon('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'), action: () => { onNavigate('digital-twin'); onClose() } },
    { id: 'maps', label: 'MAP Tasks', subtitle: 'Monitor action plans', category: 'Navigate', icon: navIcon('M9 11l3 3L22 4'), action: () => { onNavigate('map-tasks'); onClose() } },
    { id: 'evid', label: 'Evidence', subtitle: 'Upload & manage files', category: 'Navigate', icon: navIcon('M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'), action: () => { onNavigate('evidence'); onClose() } },
    { id: 'reps', label: 'Reports', subtitle: 'Generate audit packages', category: 'Navigate', icon: navIcon('M18 20V10M12 20V4M6 20v-6'), action: () => { onNavigate('reports'); onClose() } },
    { id: 'users', label: 'User Management', subtitle: 'Team & permissions', category: 'Navigate', icon: navIcon('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'), action: () => { onNavigate('users'); onClose() } },
    { id: 'settings', label: 'Settings', subtitle: 'Profile & preferences', category: 'Navigate', icon: navIcon('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'), action: () => { onNavigate('settings'); onClose() } },
    { id: 'upload', label: 'Upload Evidence', subtitle: 'Add new evidence file', category: 'Actions', icon: navIcon('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'), action: () => { onNavigate('evidence'); onClose() } },
    { id: 'newmap', label: 'Create MAP Task', subtitle: 'New monitor action plan', category: 'Actions', icon: navIcon('M12 5v14M5 12h14'), action: () => { onNavigate('map-tasks'); onClose() } },
    { id: 'report', label: 'Generate Audit Report', subtitle: 'RBI-ready package', category: 'Actions', icon: navIcon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'), action: () => { onNavigate('reports'); onClose() } },
  ]

  const filtered = query.trim()
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || (c.subtitle || '').toLowerCase().includes(query.toLowerCase()))
    : commands

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, c) => {
    acc[c.category] = [...(acc[c.category] || []), c]
    return acc
  }, {})

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelected(0)
  }, [query])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && filtered[selected]) { filtered[selected].action() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, selected])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!open) onNavigate('__palette__')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  if (!open) return null

  let flatIndex = 0

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: 580, maxWidth: '92vw', background: '#FFFFFF', borderRadius: 12, boxShadow: 'var(--shadow-pop)', overflow: 'hidden', border: '1px solid var(--line)' }}>
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4" style={{ borderBottom: '1px solid var(--line)', height: 52 }}>
          <svg width="16" height="16" fill="none" stroke="var(--brass)" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search circulars, MAPs, actions..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--ink)', fontFamily: 'Inter', background: 'transparent' }}
          />
          <kbd className="pv-mono" style={{ fontSize: 10, color: 'var(--slate)', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 5, padding: '2px 6px' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div style={{ padding: '6px 16px 4px', fontSize: 10, fontWeight: 700, color: '#AAAAAA', fontFamily: 'Inter', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                {category}
              </div>
              {items.map(item => {
                const idx = flatIndex++
                const isSelected = idx === selected
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelected(idx)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 16px',
                      background: isSelected ? '#F5F5F0' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.08s',
                    }}
                  >
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: isSelected ? 'var(--ink)' : 'var(--paper)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? 'var(--brass-bright)' : 'var(--slate)',
                      flexShrink: 0,
                      transition: 'background 0.08s, color 0.08s',
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', margin: 0, fontFamily: 'Inter' }}>{item.label}</p>
                      {item.subtitle && <p style={{ fontSize: 11, color: '#888880', margin: 0, fontFamily: 'Inter' }}>{item.subtitle}</p>}
                    </div>
                    {isSelected && (
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <kbd style={{ fontSize: 10, color: '#888880', background: '#EBEBEB', border: '1px solid #E0E0E0', borderRadius: 4, padding: '1px 5px', fontFamily: 'IBM Plex Mono, monospace' }}>↵</kbd>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#888880', fontFamily: 'Inter', margin: 0 }}>No results for "{query}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5" style={{ borderTop: '1px solid #F0F0EA' }}>
          {[['↑↓', 'navigate'], ['↵', 'select'], ['esc', 'close']].map(([key, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <kbd style={{ fontSize: 10, color: '#888880', background: '#F5F5F0', border: '1px solid #E8E8E3', borderRadius: 4, padding: '1px 5px', fontFamily: 'IBM Plex Mono, monospace' }}>{key}</kbd>
              <span style={{ fontSize: 11, color: '#AAAAAA', fontFamily: 'Inter' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
