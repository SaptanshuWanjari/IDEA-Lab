import { useEffect, useRef, useState } from 'react'

const axes = ['Operations', 'Risk', 'IT', 'Compliance', 'Legal', 'HR']

const datasets = {
  predicted: [88, 72, 91, 95, 78, 84],
  median: [74, 61, 79, 82, 68, 71],
  p90: [94, 85, 97, 98, 89, 93],
}

function polarToCartesian(cx: number, cy: number, r: number, angleIndex: number, total: number) {
  const angle = (Math.PI * 2 * angleIndex) / total - Math.PI / 2
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}

function dataToPoints(data: number[], cx: number, cy: number, maxR: number, total: number) {
  return data.map((val, i) => {
    const r = (val / 100) * maxR
    return polarToCartesian(cx, cy, r, i, total)
  })
}

function pointsToPath(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'
}

export default function RadarChart() {
  const [animated, setAnimated] = useState(false)
  const [hoveredAxis, setHoveredAxis] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200)
    return () => clearTimeout(t)
  }, [])

  const cx = 140, cy = 130, maxR = 96, total = axes.length
  const levels = [0.25, 0.5, 0.75, 1]

  const predictedPts = dataToPoints(datasets.predicted, cx, cy, maxR, total)
  const medianPts = dataToPoints(datasets.median, cx, cy, maxR, total)
  const p90Pts = dataToPoints(datasets.p90, cx, cy, maxR, total)

  return (
    <div style={{ position: 'relative' }}>
      <svg width={280} height={260} style={{ overflow: 'visible', opacity: animated ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        {/* Grid rings */}
        {levels.map((level, li) => {
          const pts = axes.map((_, i) => polarToCartesian(cx, cy, maxR * level, i, total))
          return (
            <polygon
              key={li}
              points={pts.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#E8E8E3"
              strokeWidth={1}
            />
          )
        })}

        {/* Axis lines */}
        {axes.map((_, i) => {
          const outer = polarToCartesian(cx, cy, maxR, i, total)
          return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#E8E8E3" strokeWidth={1} />
        })}

        {/* P90 area */}
        <path
          d={pointsToPath(p90Pts)}
          fill="rgba(138, 216, 255, 0.08)"
          stroke="rgba(138, 216, 255, 0.3)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Median area */}
        <path
          d={pointsToPath(medianPts)}
          fill="rgba(138, 216, 255, 0.12)"
          stroke="rgba(138, 216, 255, 0.5)"
          strokeWidth={1}
          strokeDasharray="3 2"
        />

        {/* Predicted (main) area */}
        <path
          d={pointsToPath(predictedPts)}
          fill="rgba(138, 216, 255, 0.28)"
          stroke="#8ad8ff"
          strokeWidth={2}
        />

        {/* Dots */}
        {predictedPts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoveredAxis === i ? 5 : 3.5}
            fill="#8ad8ff"
            stroke="#111"
            strokeWidth={1.5}
            style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
            onMouseEnter={() => setHoveredAxis(i)}
            onMouseLeave={() => setHoveredAxis(null)}
          />
        ))}

        {/* Axis labels */}
        {axes.map((label, i) => {
          const pos = polarToCartesian(cx, cy, maxR + 18, i, total)
          return (
            <text
              key={i}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fontFamily="Inter, sans-serif"
              fill={hoveredAxis === i ? '#0A0A0A' : '#888880'}
              fontWeight={hoveredAxis === i ? 600 : 400}
              style={{ transition: 'fill 0.15s ease' }}
            >
              {label}
            </text>
          )
        })}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill="#E8E8E3" />
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-1 mt-2">
        {[
          { label: 'Predicted Completion', color: '#8ad8ff', dash: false, value: '88%' },
          { label: 'Median', color: 'rgba(138,216,255,0.6)', dash: true, value: '74%' },
          { label: 'P90', color: 'rgba(138,216,255,0.4)', dash: true, value: '94%' },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div style={{
                width: 20,
                height: 2,
                background: item.color,
                borderRadius: 1,
                backgroundImage: item.dash ? `repeating-linear-gradient(90deg, ${item.color} 0, ${item.color} 4px, transparent 4px, transparent 7px)` : 'none',
              }} />
              <span style={{ fontSize: 11, color: '#888880', fontFamily: 'Inter' }}>{item.label}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0A0A0A', fontFamily: 'Geist Mono, monospace' }}>{item.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between mt-1 pt-2" style={{ borderTop: '1px solid #E8E8E3' }}>
          <span style={{ fontSize: 11, color: '#888880' }}>Confidence</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#8ad8ff', background: '#111', borderRadius: 6, padding: '2px 8px', fontFamily: 'Geist Mono, monospace' }}>91%</span>
        </div>
      </div>
    </div>
  )
}
