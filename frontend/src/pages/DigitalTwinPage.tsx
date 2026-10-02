import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import type { SimulationResponse } from '../lib/types'

const axes = ['Operations', 'Risk', 'IT', 'Compliance', 'Legal', 'HR']

type Scenario = 'current' | 'optimistic' | 'stressed'

const scenarios: Record<Scenario, { label: string; color: string; data: number[] }> = {
  current:   { label: 'Current State',      color: '#8ad8ff', data: [88, 72, 91, 95, 78, 84] },
  optimistic:{ label: 'Optimistic (+30d)',   color: '#4CAF50', data: [94, 85, 96, 98, 89, 91] },
  stressed:  { label: 'Stressed Scenario',   color: '#FF6B6B', data: [71, 58, 74, 82, 61, 68] },
}

function polarToCartesian(cx: number, cy: number, r: number, i: number, total: number) {
  const angle = (Math.PI * 2 * i) / total - Math.PI / 2
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function dataToPath(data: number[], cx: number, cy: number, maxR: number) {
  const pts = data.map((v, i) => {
    const r = (v / 100) * maxR
    return polarToCartesian(cx, cy, r, i, data.length)
  })
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'
}

const W = 400, H = 370, cx = 200, cy = 185, maxR = 130

export default function DigitalTwinPage() {
  const { selectedId } = useApp()
  const [activeScenario, setActiveScenario] = useState<Scenario>('current')
  const [animated, setAnimated] = useState(false)
  const [hovAxis, setHovAxis] = useState<number | null>(null)
  const [liveScore, setLiveScore] = useState(91.0)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveScore(prev => {
        const delta = (Math.random() - 0.5) * 0.4
        return parseFloat(Math.min(99, Math.max(85, prev + delta)).toFixed(1))
      })
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  const { data: sim } = useApi<SimulationResponse>(
    () => {
      if (!selectedId) return Promise.resolve(null as unknown as SimulationResponse)
      return api.get<SimulationResponse>(`/regulations/${selectedId}/simulate`)
    },
    [selectedId],
  )

  const levels = [0.25, 0.5, 0.75, 1]

  const card: React.CSSProperties = {
    background: '#FFFFFF', borderRadius: 26, border: '1px solid #E8E8E3',
    padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  }

  // Prediction chart (static visual)
  const predictions = [
    { week: 'W1', score: 91 }, { week: 'W2', score: 89 }, { week: 'W3', score: 93 },
    { week: 'W4', score: 95 }, { week: 'W5', score: 94 }, { week: 'W6', score: 97 },
    { week: 'W7', score: 96 }, { week: 'W8', score: 98 },
  ]
  const PW = 320, PH = 80, pPL = 18, pPR = 16, pPT = 8, pPB = 20
  const pCW = PW - pPL - pPR, pCH = PH - pPT - pPB
  const minS = 85, maxS = 100
  const px = (i: number) => pPL + (i / (predictions.length - 1)) * pCW
  const py = (v: number) => pPT + pCH - ((v - minS) / (maxS - minS)) * pCH
  const pPath = predictions.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(i).toFixed(1)} ${py(d.score).toFixed(1)}`).join(' ')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: '1fr', gap: 20, width: '100%', flex: 1 }}>

      {/* Main Radar */}
      <div className="card-hover" style={{ ...card, gridColumn: 'span 6' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.4px' }}>Implementation Scenario Estimate</h2>
            <p style={{ fontSize: 12, color: '#888880', margin: 0, marginTop: 2 }}>Advisory scenario model · not a forecast · updates every 15 min</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4CAF50', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#4CAF50', fontFamily: 'Inter' }}>LIVE</span>
          </div>
        </div>

        {/* Scenario toggle */}
        <div className="flex items-center gap-1 mb-5 p-1" style={{ background: '#F5F5F0', borderRadius: 10, display: 'inline-flex' }}>
          {(Object.keys(scenarios) as Scenario[]).map(s => (
            <button key={s} onClick={() => setActiveScenario(s)} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'Inter', fontWeight: activeScenario === s ? 600 : 400, background: activeScenario === s ? '#111' : 'transparent', color: activeScenario === s ? scenarios[s].color : '#888880', transition: 'all 0.15s' }}>
              {scenarios[s].label}
            </button>
          ))}
        </div>

        <div className="flex items-start gap-4">
          <svg width={W} height={H} style={{ overflow: 'visible', opacity: animated ? 1 : 0, transition: 'opacity 0.5s ease', flexShrink: 0 }}>
            {levels.map((level, li) => {
              const pts = axes.map((_, i) => polarToCartesian(cx, cy, maxR * level, i, axes.length))
              return <polygon key={li} points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#E8E8E3" strokeWidth={1} />
            })}
            {levels.map((level, li) => {
              const pt = polarToCartesian(cx, cy, maxR * level, 0, axes.length)
              return <text key={li} x={pt.x + 4} y={pt.y} fontSize={8} fill="#BBBBBB" fontFamily="Geist Mono, monospace" dominantBaseline="middle">{level * 100}%</text>
            })}
            {axes.map((_, i) => {
              const outer = polarToCartesian(cx, cy, maxR, i, axes.length)
              return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#E8E8E3" strokeWidth={1} />
            })}
            {(Object.keys(scenarios) as Scenario[]).filter(s => s !== activeScenario).map(s => (
              <path key={s} d={dataToPath(scenarios[s].data, cx, cy, maxR)} fill={`${scenarios[s].color}08`} stroke={`${scenarios[s].color}28`} strokeWidth={1} strokeDasharray="4 3" />
            ))}
            <path d={dataToPath(scenarios[activeScenario].data, cx, cy, maxR)} fill={`${scenarios[activeScenario].color}22`} stroke={scenarios[activeScenario].color} strokeWidth={2.5} style={{ filter: `drop-shadow(0 0 10px ${scenarios[activeScenario].color}40)`, transition: 'd 0.5s ease' }} />
            {scenarios[activeScenario].data.map((val, i) => {
              const r = (val / 100) * maxR
              const pt = polarToCartesian(cx, cy, r, i, axes.length)
              const isHov = hovAxis === i
              return (
                <g key={i} onMouseEnter={() => setHovAxis(i)} onMouseLeave={() => setHovAxis(null)} style={{ cursor: 'pointer' }}>
                  <circle cx={pt.x} cy={pt.y} r={isHov ? 8 : 5} fill={scenarios[activeScenario].color} stroke="#111" strokeWidth={isHov ? 2 : 1.5} style={{ transition: 'r 0.15s ease' }} />
                  {isHov && (
                    <g>
                      <rect x={pt.x - 18} y={pt.y - 28} width={36} height={18} rx={5} fill="#111" />
                      <text x={pt.x} y={pt.y - 16} textAnchor="middle" fontSize={10} fill={scenarios[activeScenario].color} fontFamily="Geist Mono, monospace" fontWeight={700}>{val}%</text>
                    </g>
                  )}
                </g>
              )
            })}
            {axes.map((label, i) => {
              const pos = polarToCartesian(cx, cy, maxR + 22, i, axes.length)
              return <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontFamily="Inter, sans-serif" fill={hovAxis === i ? '#0A0A0A' : '#888880'} fontWeight={hovAxis === i ? 700 : 400} style={{ transition: 'fill 0.15s' }}>{label}</text>
            })}
          </svg>

          {/* Score + axis breakdown */}
          <div className="flex flex-col gap-3" style={{ minWidth: 0, paddingTop: 8, flex: 1 }}>
            <div style={{ background: '#F8F7F2', borderRadius: 16, padding: '16px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#888880', margin: 0, fontFamily: 'Inter' }}>Live Score</p>
              <p style={{ fontSize: 38, fontWeight: 800, color: '#8ad8ff', margin: 0, letterSpacing: '-2px', fontFamily: 'Inter', lineHeight: 1.1, textShadow: '0 0 30px rgba(138,216,255,0.3)' }}>{liveScore.toFixed(1)}</p>
              <p style={{ fontSize: 10, color: '#4CAF50', margin: 0, fontFamily: 'Inter', fontWeight: 500 }}>trending up</p>
            </div>
            {axes.map((label, i) => (
              <div key={label} style={{ padding: '8px 12px', background: hovAxis === i ? '#F5F5F0' : '#FAFAF8', borderRadius: 10, border: '1px solid #F0F0EA', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={() => setHovAxis(i)} onMouseLeave={() => setHovAxis(null)}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 11, color: '#444440', fontFamily: 'Inter' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: 'Geist Mono, monospace' }}>{scenarios[activeScenario].data[i]}%</span>
                </div>
                <div style={{ height: 3, background: '#E8E8E3', borderRadius: 2, marginTop: 6 }}>
                  <div style={{ height: '100%', width: `${scenarios[activeScenario].data[i]}%`, background: scenarios[activeScenario].color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column */}
      <div style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Simulation Results (from backend) */}
        {sim && (
          <div className="card-hover" style={{ ...card }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px' }}>Implementation Scenario Estimate</h3>
                <p style={{ fontSize: 11, color: '#888880', margin: 0, marginTop: 2 }}>
                  {sim.label ?? 'Implementation Scenario Estimate (uncalibrated)'} · {sim.iterations.toLocaleString()} iterations
                  {typeof sim.seed === 'number' ? ` · seed ${sim.seed}` : ''}
                  {sim.input_snapshot_id ? ` · snapshot ${sim.input_snapshot_id}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  title={(sim.data_quality_notes ?? []).join('; ')}
                  style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, fontFamily: 'Inter',
                    color: sim.calibrated ? '#1E7E34' : '#856404', background: sim.calibrated ? '#E6F4EA' : '#FFF3CD' }}>
                  {sim.calibrated ? 'Calibrated' : 'Uncalibrated'}
                </span>
                {sim.bottleneck_department && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#C13B2A', background: '#FFF3F0', padding: '3px 10px', borderRadius: 20, fontFamily: 'Inter' }}>
                    Bottleneck: {sim.bottleneck_department}
                  </span>
                )}
              </div>
            </div>
            {(sim.data_quality_notes ?? []).length > 0 && (
              <div style={{ background: '#FFFBEB', border: '1px solid #F5E6A8', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#856404', margin: 0, fontFamily: 'Inter' }}>Data quality</p>
                <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  {(sim.data_quality_notes ?? []).map((note, i) => (
                    <li key={i} style={{ fontSize: 11, color: '#856404', fontFamily: 'Inter' }}>{note}</li>
                  ))}
                </ul>
                {typeof sim.data_completeness === 'number' && (
                  <p style={{ fontSize: 11, color: '#856404', margin: '4px 0 0', fontFamily: 'Inter' }}>
                    Data completeness: {(sim.data_completeness * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Median Completion', value: `${sim.median_completion_days}d` },
                { label: 'Scenario P90 (estimate)',    value: `${sim.p90_completion_days}d` },
                { label: 'Optimistic',         value: `${sim.optimistic_completion_days}d` },
                { label: 'Pessimistic',        value: `${sim.pessimistic_completion_days}d` },
              ].map(item => (
                <div key={item.label} style={{ background: '#FAFAF8', borderRadius: 14, padding: 14, border: '1px solid #F0F0EA' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.5px' }}>{item.value}</p>
                  <p style={{ fontSize: 10, color: '#888880', margin: 0, fontFamily: 'Inter' }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prediction chart */}
        <div className="card-hover" style={{ ...card }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px' }}>8-Week Scenario Trajectory</h3>
              <p style={{ fontSize: 11, color: '#888880', margin: 0, marginTop: 2 }}>Advisory scenario signal · not a calibrated forecast</p>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#8ad8ff', fontFamily: 'Inter', letterSpacing: '-1px' }}>+7.2%</span>
          </div>
          <svg width={PW} height={PH} style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8ad8ff" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#8ad8ff" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[85, 90, 95, 100].map(v => <line key={v} x1={pPL} y1={py(v)} x2={PW - pPR} y2={py(v)} stroke="#F0F0EA" strokeWidth={1} />)}
            <path d={pPath + ` L ${px(predictions.length - 1)} ${pPT + pCH} L ${px(0)} ${pPT + pCH} Z`} fill="url(#predGrad)" />
            <path d={pPath} fill="none" stroke="#8ad8ff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {predictions.map((d, i) => (
              <g key={i}>
                <circle cx={px(i)} cy={py(d.score)} r={3} fill="#8ad8ff" stroke="#111" strokeWidth={1.5} />
                <text x={px(i)} y={PH - 4} textAnchor="middle" fontSize={8} fill="#BBBBBB" fontFamily="Geist Mono, monospace">{d.week}</text>
              </g>
            ))}
            {[85, 95].map(v => <text key={v} x={pPL - 4} y={py(v)} textAnchor="end" fontSize={8} fill="#BBBBBB" fontFamily="Geist Mono, monospace" dominantBaseline="middle">{v}</text>)}
          </svg>
        </div>

        {/* Scenario comparison */}
        <div className="card-hover" style={{ ...card }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Inter', letterSpacing: '-0.3px', marginBottom: 16 }}>Scenario Comparison</h3>
          <div className="flex flex-col gap-2">
            {(Object.keys(scenarios) as Scenario[]).map(s => {
              const avg = Math.round(scenarios[s].data.reduce((a, b) => a + b, 0) / scenarios[s].data.length)
              return (
                <div key={s} onClick={() => setActiveScenario(s)} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ border: `1px solid ${activeScenario === s ? scenarios[s].color + '60' : '#F0F0EA'}`, background: activeScenario === s ? scenarios[s].color + '0A' : '#FAFAF8', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: scenarios[s].color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#0A0A0A', fontFamily: 'Inter' }}>{scenarios[s].label}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: scenarios[s].color, fontFamily: 'Inter', letterSpacing: '-0.5px' }}>{avg}%</span>
                  <span style={{ fontSize: 10, color: '#888880', fontFamily: 'Inter' }}>avg</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
