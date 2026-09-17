import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import { openFilePicker } from '../lib/fileHelper'
import type { RegulationOut } from '../lib/types'
import { useState } from 'react'

const statusStyle: Record<string, { bg: string; text: string }> = {
  Active:       { bg: '#F0FFF0', text: '#2D8A4E' },
  Review:       { bg: '#FFF8E1', text: '#C17B00' },
  Pending:      { bg: '#FFF3F0', text: '#C13B2A' },
  Completed:    { bg: '#F0F0EA', text: '#666660' },
  'In Progress':{ bg: '#F0F0FF', text: '#4040C0' },
}

function Skeleton() {
  return (
    <div style={{ padding: '20px 0' }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ height: 48, background: '#F5F5F0', borderRadius: 8, marginBottom: 8 }} />
      ))}
    </div>
  )
}

export default function RegulationsPage() {

  const { navigate, toast } = useApp()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [uploading, setUploading] = useState(false)

  const { data: regulations, loading, error, refetch } = useApi<RegulationOut[]>(
    () => api.get<RegulationOut[]>('/regulations/'),
    [],
  )

  const filtered = (regulations ?? []).filter(r =>
    (filterStatus === 'All' || r.status === filterStatus) &&
    ((r.title ?? '').toLowerCase().includes(search.toLowerCase()) || r.id.includes(search))
  )

  const handleUpload = async () => {
    setUploading(true)
    try {
      const picked = await openFilePicker({ accept: '.pdf', extensions: ['pdf'] })
      if (!picked || !picked.blob) { setUploading(false); return }
      const fd = new FormData()
      fd.append('file', picked.blob, picked.fileName)
      const reg = await api.postForm<RegulationOut>('/regulations/', fd)
      toast('success', 'Regulation uploaded', reg.title ?? picked.fileName)
      refetch()
      navigate('regulation-detail', reg.id)
    } catch (err: unknown) {
      toast('error', 'Upload failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3" style={{ height: 38, background: '#FFFFFF', border: '1px solid #E8E8E3', borderRadius: 10 }}>
            <svg width="14" height="14" fill="none" stroke="#888880" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search regulations..." style={{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', fontFamily: 'Inter', width: 200, color: '#0A0A0A' }} />
          </div>
          <div className="flex items-center gap-1 p-1" style={{ background: '#FFFFFF', border: '1px solid #E8E8E3', borderRadius: 10 }}>
            {['All', 'Active', 'In Progress', 'Review', 'Pending', 'Completed'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter', fontWeight: filterStatus === s ? 600 : 400, background: filterStatus === s ? '#111' : 'transparent', color: filterStatus === s ? '#3B82F6' : '#888880', transition: 'all 0.15s' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{ padding: '9px 18px', background: '#3B82F6', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'Inter', color: '#111', display: 'flex', alignItems: 'center', gap: 6, opacity: uploading ? 0.7 : 1 }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {uploading ? 'Uploading...' : 'Upload Regulation'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#FFF3F0', border: '1px solid #FFD7D7', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, color: '#C13B2A', margin: 0, fontFamily: 'Inter' }}>{error}</p>
          <button onClick={refetch} style={{ fontSize: 12, color: '#C13B2A', background: 'none', border: '1px solid #C13B2A', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: 'Inter' }}>Retry</button>
        </div>
      )}

      <div style={{ background: '#FFFFFF', borderRadius: 26, border: '1px solid #E8E8E3', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        {loading ? <Skeleton /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E8E3' }}>
                {['ID', 'Title', 'Status', 'Created', ''].map(col => (
                  <th key={col} style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#888880', padding: '12px 20px', fontFamily: 'Inter' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const ss = statusStyle[row.status] ?? statusStyle['Pending']
                return (
                  <tr
                    key={row.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F5F5F0' : 'none', transition: 'background 0.1s', cursor: 'pointer' }}
                    onClick={() => navigate('regulation-detail', row.id)}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, color: '#444440', fontFamily: 'Geist Mono, monospace', whiteSpace: 'nowrap' }}>{row.id.slice(0, 8)}…</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontFamily: 'Inter', maxWidth: 360 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title ?? '(untitled)'}</span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ background: ss.bg, color: ss.text, fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, fontFamily: 'Inter' }}>{row.status}</span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 11, color: '#888880', fontFamily: 'Geist Mono, monospace', whiteSpace: 'nowrap' }}>
                      {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); navigate('regulation-detail', row.id) }}
                        style={{ padding: '5px 12px', background: '#F5F5F0', border: '1px solid #E8E8E3', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontFamily: 'Inter', color: '#0A0A0A', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#3B82F6'; e.currentTarget.style.borderColor = '#111' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#F5F5F0'; e.currentTarget.style.color = '#0A0A0A'; e.currentTarget.style.borderColor = '#E8E8E3' }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#888880', fontFamily: 'Inter', margin: 0 }}>No regulations found</p>
          </div>
        )}
      </div>
    </div>
  )
}
