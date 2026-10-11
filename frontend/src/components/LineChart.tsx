import { useEffect, useState } from "react"

const weekData = [
  { week: "W1", ops: 12, risk: 8, it: 15, legal: 6 },
  { week: "W2", ops: 18, risk: 14, it: 20, legal: 9 },
  { week: "W3", ops: 14, risk: 19, it: 17, legal: 12 },
  { week: "W4", ops: 22, risk: 16, it: 24, legal: 15 },
  { week: "W5", ops: 28, risk: 22, it: 19, legal: 18 },
  { week: "W6", ops: 24, risk: 28, it: 22, legal: 21 },
  { week: "W7", ops: 31, risk: 25, it: 28, legal: 24 },
  { week: "W8", ops: 27, risk: 31, it: 32, legal: 20 },
]

const W = 340,
  H = 120
const padL = 28,
  padR = 16,
  padT = 10,
  padB = 24
const chartW = W - padL - padR
const chartH = H - padT - padB

const maxVal = 36

function scaleX(i: number) {
  return padL + (i / (weekData.length - 1)) * chartW
}
function scaleY(v: number) {
  return padT + chartH - (v / maxVal) * chartH
}

function makePath(key: keyof typeof weekData[0]) {
  return weekData
    .map(
      (d, i) =>
        `${
          i === 0 ? "M" : "L"
        } ${scaleX(i).toFixed(1)} ${scaleY(d[key] as number).toFixed(1)}`,
    )
    .join(" ")
}

export default function LineChart() {
  const [progress, setProgress] = useState(0)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    d: typeof weekData[0]
  } | null>(null)

  useEffect(() => {
    const start = Date.now()
    const duration = 1000
    const frame = () => {
      const t = Math.min((Date.now() - start) / duration, 1)
      setProgress(t < 1 ? t : 1)
      if (t < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [])

  const mainPath = makePath("ops")

  return (
    <div style={{ position: "relative" }}>
      <svg
        width={W}
        height={H}
        onMouseLeave={() => setTooltip(null)}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C5A254" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#C5A254" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="lineClip">
            <rect x={padL} y={padT} width={chartW * progress} height={chartH} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {[0, 12, 24, 36].map((v) => (
          <line
            key={v}
            x1={padL}
            y1={scaleY(v)}
            x2={padL + chartW}
            y2={scaleY(v)}
            stroke="#E8E8E3"
            strokeWidth={1}
          />
        ))}

        {/* Y-axis labels */}
        {[0, 12, 24, 36].map((v) => (
          <text
            key={v}
            x={padL - 6}
            y={scaleY(v) + 1}
            textAnchor="end"
            fontSize={9}
            fill="#BBBBBB"
            fontFamily="IBM Plex Mono, monospace"
            dominantBaseline="middle"
          >
            {v}
          </text>
        ))}

        {/* Area fill */}
        <path
          d={
            mainPath +
            ` L ${scaleX(weekData.length - 1)} ${padT + chartH} L ${scaleX(0)} ${padT + chartH} Z`
          }
          fill="url(#lineGrad)"
          clipPath="url(#lineClip)"
        />

        {/* Main line */}
        <path
          d={mainPath}
          fill="none"
          stroke="#C5A254"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath="url(#lineClip)"
        />

        {/* Secondary lines */}
        {(["risk", "it", "legal"] as const).map((key, ki) => (
          <path
            key={key}
            d={makePath(key)}
            fill="none"
            stroke={
              [
                "rgba(197,162,84,0.35)",
                "rgba(197,162,84,0.2)",
                "rgba(197,162,84,0.12)",
              ][ki]
            }
            strokeWidth={1.5}
            strokeDasharray="4 3"
            clipPath="url(#lineClip)"
          />
        ))}

        {/* Interactive hover dots */}
        {weekData.map((d, i) => (
          <g key={i}>
            <circle
              cx={scaleX(i)}
              cy={scaleY(d.ops)}
              r={8}
              fill="transparent"
              onMouseEnter={() =>
                setTooltip({ x: scaleX(i), y: scaleY(d.ops), d })
              }
            />
            {progress === 1 && (
              <circle
                cx={scaleX(i)}
                cy={scaleY(d.ops)}
                r={3}
                fill="#C5A254"
                stroke="#111"
                strokeWidth={1.5}
                opacity={0.8}
              />
            )}
          </g>
        ))}

        {/* X-axis labels */}
        {weekData.map((d, i) => (
          <text
            key={d.week}
            x={scaleX(i)}
            y={H - 4}
            textAnchor="middle"
            fontSize={9}
            fill="#BBBBBB"
            fontFamily="IBM Plex Mono, monospace"
          >
            {d.week}
          </text>
        ))}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <line
              x1={tooltip.x}
              y1={padT}
              x2={tooltip.x}
              y2={padT + chartH}
              stroke="#E8E8E3"
              strokeWidth={1}
              strokeDasharray="3 2"
            />
            <rect
              x={tooltip.x + 6}
              y={tooltip.y - 22}
              width={60}
              height={20}
              rx={5}
              fill="#111"
            />
            <text
              x={tooltip.x + 36}
              y={tooltip.y - 9}
              textAnchor="middle"
              fontSize={10}
              fill="#C5A254"
              fontFamily="IBM Plex Mono, monospace"
            >
              {tooltip.d.ops} MAPs
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        {[
          { label: "Operations", color: "#C5A254" },
          { label: "Risk", color: "rgba(197,162,84,0.5)" },
          { label: "IT", color: "rgba(197,162,84,0.3)" },
          { label: "Legal", color: "rgba(197,162,84,0.15)" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div
              style={{
                width: 12,
                height: 2,
                background: l.color,
                borderRadius: 1,
              }}
            />
            <span
              style={{ fontSize: 10, color: "#888880", fontFamily: "Inter" }}
            >
              {l.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
