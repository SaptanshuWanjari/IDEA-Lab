import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import { openFilePicker } from '../lib/fileHelper'
import type { RegulationOut } from '../lib/types'
import { useState } from 'react'
import { Card, SectionHead, StatusChip, statusToneFor, EmptyState } from '../components/ui'

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
      toast('success', 'Circular registered', reg.title ?? picked.fileName)
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
      <Card>
        <SectionHead
          eyebrow={`§ Circulars ledger · ${filtered.length} folios`}
          title="RBI circulars"
          sub="Registered circulars with status, intake date and folio reference."
          right={
            <button onClick={handleUpload} disabled={uploading} className="pv-btn-primary pv-btn-brass" style={{ opacity: uploading ? 0.7 : 1 }}>
              {uploading ? 'Registering…' : '+ Register circular'}
            </button>
          }
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or folio ID…" className="pv-input" style={{ width: 260 }} aria-label="Search regulations" />
          <div style={{ display: 'flex', gap: 2, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 9, padding: 3 }}>
            {['All', 'Active', 'In Progress', 'Review', 'Pending', 'Completed'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className="pv-segtab" data-active={filterStatus === s}>{s}</button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--scarlet-bg)', border: '1px solid #EFC4BE', borderRadius: 10, padding: '12px 16px', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, color: 'var(--scarlet)', margin: 0 }}>{error}</p>
            <button onClick={refetch} className="pv-btn-ghost" style={{ color: 'var(--scarlet)', borderColor: '#EFC4BE' }}>Retry</button>
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
              {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ height: 48, background: '#F1EFE9', borderRadius: 8 }} />)}
            </div>
          ) : (
            <table className="pv-table">
              <thead><tr><th>Folio</th><th>Title</th><th>Status</th><th>Registered</th><th /></tr></thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => navigate('regulation-detail', row.id)}>
                    <td className="pv-mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', whiteSpace: 'nowrap' }}>{row.id.slice(0, 8)}…</td>
                    <td style={{ fontWeight: 600, maxWidth: 380 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title ?? '(untitled)'}</span>
                    </td>
                    <td><StatusChip tone={statusToneFor(row.status)}>{row.status}</StatusChip></td>
                    <td className="pv-mono" style={{ fontSize: 11.5, color: 'var(--slate)', whiteSpace: 'nowrap' }}>
                      {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={e => { e.stopPropagation(); navigate('regulation-detail', row.id) }}
                        className="pv-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        Open folio →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !error && filtered.length === 0 && (
            <EmptyState title="No circulars match this filter" hint="Register a circular PDF or clear the search." />
          )}
        </div>
      </Card>
    </div>
  )
}
