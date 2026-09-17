import { useApp } from '../App'
import RadarChart from '../components/RadarChart'
import LineChart from '../components/LineChart'
import DependencyGraph from '../components/DependencyGraph'
import ComplianceRing from '../components/ComplianceRing'
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

const deadlines = [
  { label: 'Today',     items: ['Submit AML/CFT Q2 Report — Risk', 'MAP Review: Cyber Policy — IT'] },
  { label: 'Tomorrow',  items: ['MSME Credit MAP Deadline — Legal'] },
  { label: 'This Week', items: ['Digital Lending Audit Package', 'Evidence Upload — Operations'] },
  { label: 'Next Week', items: ['Board Compliance Review — All Depts'] },
]

export default function DashboardPage() {
  const { navigate } = useApp()

  const { data: regulations, loading } = useApi<RegulationOut[]>(
    () => api.get<RegulationOut[]>('/regulations/'),
    [],
  )

  const circulars = (regulations ?? []).slice(0, 5)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, paddingBottom: 32 }}>

      {/* CARD 1: RBI Circulars */}
      <HoverCard style={{ gridColumn: 'span 8' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Recent RBI Circulars</h2>
            <p style={{ fontSize: 12, color: '#888880', margin: 0, marginTop: 2 }}>{circulars.length} active regulations this quarter</p>
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
                {['Title', 'Status', 'Created'].map(col => (
                  <th key={col} style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#888880', paddingBottom: 10, paddingRight: 16, fontFamily: 'Inter', letterSpacing: '0.3px' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {circulars.map((row, i) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: i < circulars.length - 1 ? '1px solid #F5F5F0' : 'none', transition: 'background 0.1s', cursor: 'pointer' }}
                  onClick={() => navigate('regulation-detail', row.id)}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 16px 11px 0', fontSize: 12, color: '#0A0A0A', fontFamily: 'Inter', maxWidth: 260 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title ?? '(untitled)'}</span>
                  </td>
                  <td style={{ padding: '11px 16px 11px 0' }}><StatusBadge status={row.status} /></td>
                  <td style={{ padding: '11px 0 11px 0', fontSize: 11, color: '#888880', fontFamily: 'Geist Mono, monospace', whiteSpace: 'nowrap' }}>
                    {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {circulars.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '24px 0', fontSize: 13, color: '#888880', fontFamily: 'Inter', textAlign: 'center' }}>No regulations yet — upload one to get started</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </HoverCard>

      {/* CARD 3: Compliance Health */}
      <HoverCard style={{ gridColumn: 'span 4' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px', marginBottom: 4 }}>Compliance Health</h2>
        <p style={{ fontSize: 11, color: '#888880', margin: 0, marginBottom: 20 }}>Overall status — Q3 2026</p>

        <div className="flex flex-col items-center mb-6">
          <span style={{ fontSize: 72, fontWeight: 800, color: '#3B82F6', lineHeight: 1, letterSpacing: '-4px', fontFamily: 'Inter', textShadow: '0 0 40px rgba(59,130,246,0.4)' }}>94%</span>
          <span style={{ fontSize: 12, color: '#888880', marginTop: 4, fontFamily: 'Inter' }}>Overall Compliance</span>
          <div className="flex items-center gap-1 mt-2">
            <svg width="12" height="12" fill="none" stroke="#4CAF50" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 500 }}>+2.4% from last quarter</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {[
            { label: 'Open MAPs',       value: 23,  color: '#F9A825', page: 'map-tasks' as const },
            { label: 'Completed',       value: 187, color: '#4CAF50', page: 'map-tasks' as const },
            { label: 'Pending Review',  value: 14,  color: '#5C5CD6', page: 'map-tasks' as const },
            { label: 'Rejected',        value: 6,   color: '#E53935', page: 'map-tasks' as const },
          ].map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between py-2"
              style={{ borderBottom: '1px solid #F5F5F0', cursor: 'pointer', borderRadius: 4, transition: 'background 0.1s' }}
              onClick={() => navigate(item.page)}
              onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="flex items-center gap-2">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                <span style={{ fontSize: 12, color: '#444440', fontFamily: 'Inter' }}>{item.label}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: 'Geist Mono, monospace' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </HoverCard>

      {/* CARD 2: Digital Twin Radar */}
      <HoverCard style={{ gridColumn: 'span 5' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Digital Compliance Twin</h2>
            <p style={{ fontSize: 11, color: '#888880', margin: 0, marginTop: 2 }}>Compliance prediction radar</p>
          </div>
          <button
            onClick={() => navigate('digital-twin')}
            style={{ background: '#111', color: '#3B82F6', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8, fontFamily: 'Inter', border: 'none', cursor: 'pointer' }}
          >
            LIVE
          </button>
        </div>
        <RadarChart />
      </HoverCard>

      {/* CARD 4: Department Workload */}
      <HoverCard style={{ gridColumn: 'span 4' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Department Workload</h2>
            <p style={{ fontSize: 11, color: '#888880', margin: 0, marginTop: 2 }}>Active MAPs — last 8 weeks</p>
          </div>
        </div>
        <LineChart />
      </HoverCard>

      {/* CARD 8: Compliance Score Ring */}
      <HoverCard style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px', alignSelf: 'flex-start', marginBottom: 16 }}>Score</h2>
        <ComplianceRing score={92} size={140} label="" />
        <div className="flex flex-col gap-2 mt-4 w-full">
          {[
            { label: 'Documentation',    score: 96 },
            { label: 'Timeliness',       score: 88 },
            { label: 'Evidence Quality', score: 91 },
          ].map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontSize: 11, color: '#888880', fontFamily: 'Inter' }}>{item.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0A0A0A', fontFamily: 'Geist Mono, monospace' }}>{item.score}%</span>
              </div>
              <div style={{ height: 4, background: '#F0F0EA', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${item.score}%`, background: '#3B82F6', borderRadius: 2, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
              </div>
            </div>
          ))}
        </div>
      </HoverCard>

      {/* CARD 5: Dependency Graph */}
      <HoverCard style={{ gridColumn: 'span 4' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Critical Dependencies</h2>
            <p style={{ fontSize: 11, color: '#888880', margin: 0, marginTop: 2 }}>7 nodes · 4 critical path</p>
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

      {/* CARD 6: Top Bottlenecks — static (no direct endpoint) */}
      <HoverCard style={{ gridColumn: 'span 4' }}>
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
                <div style={{ height: '100%', width: `${b.pct}%`, background: i === 0 ? '#3B82F6' : i === 1 ? '#B8E830' : i === 2 ? '#9BD120' : '#7EBA10', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </HoverCard>

      {/* CARD 7: Recent Evidence — static summary */}
      <HoverCard style={{ gridColumn: 'span 4' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Recent Evidence</h2>
            <p style={{ fontSize: 11, color: '#888880', margin: 0, marginTop: 2 }}>Recent uploads</p>
          </div>
          <button onClick={() => navigate('evidence')} style={{ fontSize: 11, color: '#888880', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter' }}>View all</button>
        </div>
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#888880', fontFamily: 'Inter', margin: 0 }}>Navigate to Evidence to see uploads</p>
        </div>
      </HoverCard>

      {/* CARD 9: Upcoming Deadlines */}
      <HoverCard style={{ gridColumn: 'span 4' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px', marginBottom: 20 }}>Upcoming Deadlines</h2>
        <div className="flex flex-col gap-4">
          {deadlines.map((group, gi) => (
            <div key={gi} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: gi === 0 ? '#3B82F6' : gi === 1 ? '#F9A825' : '#E8E8E3', border: gi === 0 ? '2px solid #111' : '2px solid #E8E8E3', marginTop: 2, flexShrink: 0 }} />
                {gi < deadlines.length - 1 && <div style={{ width: 1, background: '#E8E8E3', flex: 1, marginTop: 4 }} />}
              </div>
              <div className="flex-1 pb-4">
                <span style={{ fontSize: 10, fontWeight: 700, color: gi === 0 ? '#3B82F6' : '#888880', background: gi === 0 ? '#111' : '#F0F0EA', padding: '2px 8px', borderRadius: 6, fontFamily: 'Inter', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {group.label}
                </span>
                <div className="flex flex-col gap-1.5 mt-2">
                  {group.items.map((item, ii) => (
                    <p
                      key={ii}
                      style={{ fontSize: 12, color: '#444440', margin: 0, fontFamily: 'Inter', lineHeight: 1.4, cursor: 'pointer' }}
                      onClick={() => navigate('map-tasks')}
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </HoverCard>

      {/* CARD 10: Audit Package */}
      <HoverCard style={{ gridColumn: 'span 8', background: '#3B82F6', position: 'relative', overflow: 'hidden', minHeight: 160 }}>
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
