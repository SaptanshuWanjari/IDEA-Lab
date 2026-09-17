import { useApp } from '../App'
import RadarChart from '../components/RadarChart'
import DependencyGraph from '../components/DependencyGraph'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import type { RegulationOut } from '../lib/types'

const card = {
  background: '#FFFFFF',
  borderRadius: 26,
  border: '1px solid #E8E8E3',
  padding: 24,
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
}

function HoverCard({ children, style = {}, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <div
      className="card-hover"
      style={{ ...card, ...style, cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  Active:       { bg: '#F0FFF0', text: '#2D8A4E', dot: '#4CAF50' },
  Review:       { bg: '#FFF8E1', text: '#C17B00', dot: '#F9A825' },
  Pending:      { bg: '#FFF3F0', text: '#C13B2A', dot: '#E53935' },
  Completed:    { bg: '#F0F0EA', text: '#666660', dot: '#AAAAAA' },
  'In Progress':{ bg: '#F0F0FF', text: '#4040C0', dot: '#5C5CD6' },
  Draft:        { bg: '#F5F5F0', text: '#666660', dot: '#AAAAAA' },
}

function StatusBadge({ status }: { status: string }) {
  const s = statusColors[status] || statusColors['Pending']
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: s.bg, display: 'inline-flex' }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot }} />
      <span style={{ fontSize: 11, fontWeight: 500, color: s.text, fontFamily: 'Inter' }}>{status}</span>
    </div>
  )
}

export default function DashboardPage() {
  const { navigate } = useApp()

  const { data: regulations, loading } = useApi<RegulationOut[]>(
    () => api.get<RegulationOut[]>('/regulations/'),
    [],
  )

  const circulars = (regulations ?? []).slice(0, 5)

  // Fallback for visual mock data in table if no circulars
  const tableData = circulars.length > 0 ? circulars : [
    { id: '1', title: 'Master Direction – Operational Resilience', status: 'Review', date: '2026-08-24' },
    { id: '2', title: 'Master Direction – Cybersecurity', status: 'In Progress', date: '2026-09-08' },
    { id: '3', title: 'Guidelines on Fraud Risk Management', status: 'Draft', date: '2026-09-15' },
    { id: '4', title: 'Master Direction – Credit Risk Management', status: 'Completed', date: '2026-08-10' },
    { id: '5', title: 'Guidelines on MSME Lending', status: 'In Progress', date: '2026-08-22' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, paddingBottom: 32, flex: 1 }}>

      {/* ROW 1: STATS */}
      <HoverCard style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(76, 175, 80, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" fill="none" stroke="#4CAF50" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div>
          <p style={{ fontSize: 13, color: '#888880', margin: 0, fontFamily: 'Inter', fontWeight: 500 }}>Compliance Health</p>
          <div className="flex items-end gap-2 mt-1">
            <span style={{ fontSize: 28, fontWeight: 800, color: '#0A0A0A', fontFamily: 'Inter', lineHeight: 1 }}>94%</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <svg width="12" height="12" fill="none" stroke="#4CAF50" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 600 }}>+2.4% from last quarter</span>
          </div>
        </div>
      </HoverCard>

      <HoverCard style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => navigate('map-tasks')}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(249, 168, 37, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" fill="none" stroke="#F9A825" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <div>
          <p style={{ fontSize: 13, color: '#888880', margin: 0, fontFamily: 'Inter', fontWeight: 500 }}>Open MAPs</p>
          <div className="flex items-end gap-2 mt-1">
            <span style={{ fontSize: 28, fontWeight: 800, color: '#0A0A0A', fontFamily: 'Inter', lineHeight: 1 }}>23</span>
          </div>
          <p style={{ fontSize: 11, color: '#888880', margin: 0, marginTop: 4 }}>12% of total</p>
        </div>
      </HoverCard>

      <HoverCard style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => navigate('map-tasks')}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(92, 92, 214, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" fill="none" stroke="#5C5CD6" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div>
          <p style={{ fontSize: 13, color: '#888880', margin: 0, fontFamily: 'Inter', fontWeight: 500 }}>Pending Review</p>
          <div className="flex items-end gap-2 mt-1">
            <span style={{ fontSize: 28, fontWeight: 800, color: '#0A0A0A', fontFamily: 'Inter', lineHeight: 1 }}>14</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <svg width="12" height="12" fill="none" stroke="#888880" strokeWidth="2" viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
            <span style={{ fontSize: 11, color: '#888880', fontWeight: 500 }}>6% of total</span>
          </div>
        </div>
      </HoverCard>

      <HoverCard style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => navigate('map-tasks')}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(76, 175, 80, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" fill="none" stroke="#4CAF50" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div>
          <p style={{ fontSize: 13, color: '#888880', margin: 0, fontFamily: 'Inter', fontWeight: 500 }}>Completed</p>
          <div className="flex items-end gap-2 mt-1">
            <span style={{ fontSize: 28, fontWeight: 800, color: '#0A0A0A', fontFamily: 'Inter', lineHeight: 1 }}>187</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <svg width="12" height="12" fill="none" stroke="#4CAF50" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 500 }}>82% of total</span>
          </div>
        </div>
      </HoverCard>


      {/* ROW 2 */}
      {/* Regulatory Execution (Span 7) */}
      <HoverCard style={{ gridColumn: 'span 7' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Regulatory Execution</h2>
            <p style={{ fontSize: 12, color: '#888880', margin: 0, marginTop: 2 }}>Recent RBI circulars in this quarter</p>
          </div>
          <button
            onClick={() => navigate('regulations')}
            style={{ padding: '8px 16px', background: '#111111', color: '#3B82F6', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            View All
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1,2,3,4,5].map(i => <div key={i} style={{ height: 42, background: '#F5F5F0', borderRadius: 8 }} />)}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E8E3' }}>
                {['Circular', 'Status', 'MAPs', 'Owner', 'Deadline'].map(col => (
                  <th key={col} style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#888880', paddingBottom: 10, paddingRight: 16, fontFamily: 'Inter', letterSpacing: '0.3px' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => {
                // Determine mock values if missing
                const dateStr = (row as any).date ? new Date((row as any).date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(row.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const mapsCnt = [24, 18, 12, 31, 16, 9][i % 6];
                const owner = ['Operations', 'IT', 'Risk', 'Risk', 'Credit', 'Compliance'][i % 6];

                return (
                  <tr
                    key={row.id}
                    style={{ borderBottom: i < tableData.length - 1 ? '1px solid #F5F5F0' : 'none', transition: 'background 0.1s', cursor: 'pointer' }}
                    onClick={() => navigate('regulation-detail', row.id)}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 16px 11px 0', fontSize: 12, color: '#0A0A0A', fontFamily: 'Inter', maxWidth: 260 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title ?? '(untitled)'}</span>
                    </td>
                    <td style={{ padding: '11px 16px 11px 0' }}><StatusBadge status={row.status} /></td>
                    <td style={{ padding: '11px 16px 11px 0', fontSize: 12, color: '#0A0A0A', fontFamily: 'Inter' }}>
                      {mapsCnt}
                    </td>
                    <td style={{ padding: '11px 16px 11px 0', fontSize: 12, color: '#0A0A0A', fontFamily: 'Inter' }}>
                      {owner}
                    </td>
                    <td style={{ padding: '11px 0 11px 0', fontSize: 11, color: '#888880', fontFamily: 'Geist Mono, monospace', whiteSpace: 'nowrap' }}>
                      {dateStr}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </HoverCard>

      {/* Digital Compliance Twin (Span 5) */}
      <HoverCard style={{ gridColumn: 'span 5' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Digital Compliance Twin</h2>
            <p style={{ fontSize: 11, color: '#888880', margin: 0, marginTop: 2 }}>Predicted completion timeline</p>
          </div>
          <button
            onClick={() => navigate('digital-twin')}
            style={{ background: '#3B82F6', color: '#111', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8, fontFamily: 'Inter', border: 'none', cursor: 'pointer' }}
          >
            LIVE
          </button>
        </div>
        <RadarChart />
      </HoverCard>

      {/* ROW 3 */}
      {/* Critical Dependencies (Span 7) */}
      <HoverCard style={{ gridColumn: 'span 7' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Critical Dependency Path</h2>
            <p style={{ fontSize: 11, color: '#888880', margin: 0, marginTop: 2 }}>5 nodes · 4 critical path steps</p>
          </div>
          <button
            onClick={() => navigate('digital-twin')}
            style={{ padding: '6px 12px', background: '#F5F5F0', border: '1px solid #E8E8E3', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer', color: '#0A0A0A', fontFamily: 'Inter', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#3B82F6' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F5F5F0'; e.currentTarget.style.color = '#0A0A0A' }}
          >
            Open Graph
          </button>
        </div>
        <DependencyGraph />
      </HoverCard>

      {/* Top Bottlenecks (Span 5) */}
      <HoverCard style={{ gridColumn: 'span 5' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px', marginBottom: 4 }}>Top Bottlenecks</h2>
        <p style={{ fontSize: 11, color: '#888880', margin: 0, marginBottom: 20 }}>By open MAP count</p>
        <div className="flex flex-col gap-4">
          {[
            { dept: 'IT',         count: 14, pct: 78 },
            { dept: 'Risk',       count: 11, pct: 62 },
            { dept: 'Operations', count: 9,  pct: 51 },
            { dept: 'Branches',   count: 7,  pct: 40 },
            { dept: 'Legal',      count: 5,  pct: 29 },
          ].map((b, i) => (
            <div key={b.dept} style={{ cursor: 'pointer' }} onClick={() => navigate('map-tasks')}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#888880', fontFamily: 'Geist Mono, monospace', width: 16 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: 'Inter' }}>{b.dept}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: 'Geist Mono, monospace' }}>{b.count}</span>
              </div>
              <div style={{ height: 6, background: '#F0F0EA', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${b.pct}%`, background: i === 0 ? '#3B82F6' : i === 1 ? '#4CAF50' : i === 2 ? '#8BC34A' : '#CDDC39', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </HoverCard>


      {/* ROW 4 */}
      {/* Upcoming Deadlines (Span 7) */}
      <HoverCard style={{ gridColumn: 'span 7' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px', marginBottom: 2 }}>Upcoming Deadlines</h2>
            <p style={{ fontSize: 12, color: '#888880', margin: 0 }}>Key compliance tasks across departments</p>
          </div>
          <button
            onClick={() => navigate('map-tasks')}
            style={{ padding: '6px 12px', background: '#F5F5F0', border: '1px solid #E8E8E3', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer', color: '#0A0A0A', fontFamily: 'Inter', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#3B82F6' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F5F5F0'; e.currentTarget.style.color = '#0A0A0A' }}
          >
            View all
          </button>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E8E8E3' }}>
              {['Date', 'Task', 'Regulation', 'Owner', 'Status'].map(col => (
                <th key={col} style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#888880', paddingBottom: 10, paddingRight: 16, fontFamily: 'Inter', letterSpacing: '0.3px' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { date: 'TODAY', task: 'Submit AML/CFT Q2 Report', reg: 'Fraud Risk Management', owner: 'Risk', status: 'Due today', dot: '#E53935', bg: '#FFF8E1' },
              { date: 'TOMORROW', task: 'Complete MAP Review: Cyber Policy', reg: 'Cybersecurity Controls', owner: 'Compliance', status: 'Due tomorrow', dot: '#F9A825', bg: '#FFF3F0' },
              { date: 'THIS WEEK', task: 'Upload Evidence: System Resilience Test', reg: 'Operational Resilience', owner: 'IT', status: 'Due 7 Aug', dot: '#AAAAAA', bg: '#F5F5F0' },
              { date: 'THIS WEEK', task: 'Finalize MSME Credit Policy Update', reg: 'MSME Lending', owner: 'Credit', status: 'Due 8 Aug', dot: '#AAAAAA', bg: '#F5F5F0' },
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: i < 3 ? '1px solid #F5F5F0' : 'none', cursor: 'pointer' }} onClick={() => navigate('map-tasks')}>
                <td style={{ padding: '11px 16px 11px 0' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#0A0A0A', background: row.bg, padding: '2px 8px', borderRadius: 6, fontFamily: 'Inter', textTransform: 'uppercase' }}>{row.date}</span>
                </td>
                <td style={{ padding: '11px 16px 11px 0', fontSize: 12, color: '#0A0A0A', fontFamily: 'Inter' }}>{row.task}</td>
                <td style={{ padding: '11px 16px 11px 0', fontSize: 12, color: '#888880', fontFamily: 'Inter' }}>{row.reg}</td>
                <td style={{ padding: '11px 16px 11px 0', fontSize: 12, color: '#0A0A0A', fontFamily: 'Inter' }}>{row.owner}</td>
                <td style={{ padding: '11px 0 11px 0', fontSize: 11, color: '#888880', fontFamily: 'Inter' }}>
                  <div className="flex items-center gap-1.5">
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: row.dot }} />
                    {row.status}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </HoverCard>

      {/* Audit Package (Span 5) */}
      <HoverCard style={{ gridColumn: 'span 5', background: '#3B82F6', position: 'relative', overflow: 'hidden', minHeight: 160 }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -60, width: 150, height: 150, borderRadius: '50%', background: 'rgba(0,0,0,0.04)', pointerEvents: 'none' }} />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div style={{ width: 36, height: 36, background: '#111', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" fill="none" stroke="#3B82F6" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#111', fontFamily: 'Inter', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.6 }}>Audit Package Ready</span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111111', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.8px', lineHeight: 1.15, maxWidth: 320 }}>
              Generate RBI-ready compliance reports in one click
            </h2>
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => navigate('reports')}
                style={{ padding: '10px 22px', background: '#111111', color: '#3B82F6', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </HoverCard>

    </div>
  )
}
