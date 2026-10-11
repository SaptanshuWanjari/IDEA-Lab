import { useEffect, useState } from "react"

const axes = ["Operations", "Risk", "IT", "Compliance", "Legal", "HR"]

const datasets = {
  predicted: [88, 72, 91, 95, 78, 84],
  median: [74, 61, 79, 82, 68, 71],
  p90: [94, 85, 97, 98, 89, 93],
}

const INK = "#102A43"
const BRASS = "#0D9488"

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleIndex: number,
  total: number,
) {
  const angle = (Math.PI * 2 * angleIndex) / total - Math.PI / 2
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function dataToPoints(
  data: number[],
  cx: number,
  cy: number,
  maxR: number,
  total: number,
) {
  return data.map((val, i) => {
    const r = (val / 100) * maxR
    return polarToCartesian(cx, cy, r, i, total)
  })
}

function pointsToPath(pts: {
  x: number
  y: number
}[]) {
  return (
    pts
      .map(
        (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      )
      .join(" ") + " Z"
  )
}

export default function RadarChart() {
  const [animated, setAnimated] = useState(false)
  const [hoveredAxis, setHoveredAxis] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200)
    return () => clearTimeout(t)
  }, [])

  const cx = 140,
    cy = 130,
    maxR = 96,
    total = axes.length
  const levels = [0.25, 0.5, 0.75, 1]

  const predictedPts = dataToPoints(datasets.predicted, cx, cy, maxR, total)
  const medianPts = dataToPoints(datasets.median, cx, cy, maxR, total)
  const p90Pts = dataToPoints(datasets.p90, cx, cy, maxR, total)

  return (
    <div style={{ position: "relative" }}>
      <svg
        width={280}
        height={260}
        style={{
          overflow: "visible",
          opacity: animated ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        {levels.map((level, li) => {
          const pts = axes.map((_, i) =>
            polarToCartesian(cx, cy, maxR * level, i, total),
          )
          return (
            <polygon
              key={li}
              points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="var(--line)"
              strokeWidth={1}
            />
          )
        })}
        {axes.map((_, i) => {
          const outer = polarToCartesian(cx, cy, maxR, i, total)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--line)"
              strokeWidth={1}
            />
          )
        })}
        <path
          d={pointsToPath(p90Pts)}
          fill="rgba(154,123,46,0.06)"
          stroke="rgba(154,123,46,0.35)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <path
          d={pointsToPath(medianPts)}
          fill="rgba(12,27,45,0.05)"
          stroke="rgba(12,27,45,0.35)"
          strokeWidth={1}
          strokeDasharray="3 2"
        />
        <path
          d={pointsToPath(predictedPts)}
          fill="rgba(13,148,136,0.16)"
          stroke={BRASS}
          strokeWidth={2}
        />
        {predictedPts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoveredAxis === i ? 5 : 3.5}
            fill={BRASS}
            stroke={INK}
            strokeWidth={1.5}
            style={{ cursor: "pointer", transition: "r 0.15s ease" }}
            onMouseEnter={() => setHoveredAxis(i)}
            onMouseLeave={() => setHoveredAxis(null)}
          />
        ))}
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
              fill={hoveredAxis === i ? INK : "#8A94A1"}
              fontWeight={hoveredAxis === i ? 600 : 400}
              style={{ transition: "fill 0.15s ease" }}
            >
              {label}
            </text>
          )
        })}
        <circle cx={cx} cy={cy} r={3} fill="var(--line)" />
      </svg>

      <div className="flex flex-col gap-1 mt-2">
        {[
          {
            label: "Predicted Completion",
            color: BRASS,
            dash: false,
            value: "88%",
          },
          {
            label: "Median",
            color: "rgba(12,27,45,0.55)",
            dash: true,
            value: "74%",
          },
          {
            label: "P90",
            color: "rgba(154,123,46,0.55)",
            dash: true,
            value: "94%",
          },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: 20,
                  height: 2,
                  background: item.color,
                  borderRadius: 1,
                  backgroundImage: item.dash
                    ? `repeating-linear-gradient(90deg, ${item.color} 0, ${item.color} 4px, transparent 4px, transparent 7px)`
                    : "none",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--slate)" }}>
                {item.label}
              </span>
            </div>
            <span
              className="pv-mono"
              style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}
            >
              {item.value}
            </span>
          </div>
        ))}
        <div
          className="flex items-center justify-between mt-1 pt-2"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <span style={{ fontSize: 11, color: "var(--slate)" }}>
            Confidence
          </span>
          <span
            className="pv-mono"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#F6F1E2",
              background: "var(--ink)",
              borderRadius: 6,
              padding: "2px 8px",
            }}
          >
            91%
          </span>
        </div>
      </div>
    </div>
  )
}
