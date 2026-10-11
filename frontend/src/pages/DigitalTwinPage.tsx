import { useState, useEffect } from "react"
import { useApp } from "../App"
import { useApi } from "../hooks/useApi"
import { api } from "../lib/api"
import type { SimulationResponse } from "../lib/types"
import { Card, SectionHead, StatusChip } from "../components/ui"

const axes = ["Operations", "Risk", "IT", "Compliance", "Legal", "HR"]

type Scenario = "current" | "optimistic" | "stressed"

const scenarios: Record<Scenario, {
  label: string
  color: string
  data: number[]
}> = {
  current: {
    label: "Current State",
    color: "#0C1B2D",
    data: [88, 72, 91, 95, 78, 84],
  },
  optimistic: {
    label: "Optimistic (+30d)",
    color: "#1B6B4A",
    data: [94, 85, 96, 98, 89, 91],
  },
  stressed: {
    label: "Stressed Scenario",
    color: "#A83226",
    data: [71, 58, 74, 82, 61, 68],
  },
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  i: number,
  total: number,
) {
  const angle = (Math.PI * 2 * i) / total - Math.PI / 2
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function dataToPath(data: number[], cx: number, cy: number, maxR: number) {
  const pts = data.map((v, i) => {
    const r = (v / 100) * maxR
    return polarToCartesian(cx, cy, r, i, data.length)
  })
  return (
    pts
      .map(
        (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      )
      .join(" ") + " Z"
  )
}

const W = 400,
  H = 370,
  cx = 200,
  cy = 185,
  maxR = 130

export default function DigitalTwinPage() {
  const { selectedId } = useApp()
  const [activeScenario, setActiveScenario] = useState<Scenario>("current")
  const [animated, setAnimated] = useState(false)
  const [hovAxis, setHovAxis] = useState<number | null>(null)
  const [liveScore, setLiveScore] = useState(91.0)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveScore((prev) => {
        const delta = (Math.random() - 0.5) * 0.4
        return parseFloat(Math.min(99, Math.max(85, prev + delta)).toFixed(1))
      })
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  const { data: sim } = useApi<SimulationResponse>(() => {
    if (!selectedId)
      return Promise.resolve(null as unknown as SimulationResponse)
    return api.get<SimulationResponse>(`/regulations/${selectedId}/simulate`)
  }, [selectedId])

  const levels = [0.25, 0.5, 0.75, 1]

  const predictions = [
    { week: "W1", score: 91 },
    { week: "W2", score: 89 },
    { week: "W3", score: 93 },
    { week: "W4", score: 95 },
    { week: "W5", score: 94 },
    { week: "W6", score: 97 },
    { week: "W7", score: 96 },
    { week: "W8", score: 98 },
  ]
  const PW = 320,
    PH = 80,
    pPL = 18,
    pPR = 16,
    pPT = 8,
    pPB = 20
  const pCW = PW - pPL - pPR,
    pCH = PH - pPT - pPB
  const minS = 85,
    maxS = 100
  const px = (i: number) => pPL + (i / (predictions.length - 1)) * pCW
  const py = (v: number) => pPT + pCH - ((v - minS) / (maxS - minS)) * pCH
  const pPath = predictions
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(d.score).toFixed(1)}`,
    )
    .join(" ")

  return (
    <div
      className="pv-grid12"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: 16,
        width: "100%",
      }}
    >
      <Card style={{ gridColumn: "span 6" }}>
        <div className="pv-span6">
          <SectionHead
            eyebrow="§ Scenario estimates · Uncalibrated"
            title="Implementation estimate"
            sub="Advisory model · not a forecast · refreshes every 15 min"
            right={<StatusChip tone="ok">Live</StatusChip>}
          />
        </div>
        <div
          style={{
            display: "inline-flex",
            gap: 2,
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 9,
            padding: 3,
            marginBottom: 16,
          }}
        >
          {(Object.keys(scenarios) as Scenario[]).map((s) => (
            <button
              key={s}
              onClick={() => setActiveScenario(s)}
              className="pv-segtab"
              data-active={activeScenario === s}
            >
              {scenarios[s].label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <svg
            width={W}
            height={H}
            style={{
              overflow: "visible",
              opacity: animated ? 1 : 0,
              transition: "opacity 0.5s ease",
              flexShrink: 0,
              maxWidth: "55%",
            }}
            viewBox={`0 0 ${W} ${H}`}
          >
            {levels.map((level, li) => {
              const pts = axes.map((_, i) =>
                polarToCartesian(cx, cy, maxR * level, i, axes.length),
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
              const outer = polarToCartesian(cx, cy, maxR, i, axes.length)
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
            {(Object.keys(scenarios) as Scenario[])
              .filter((s) => s !== activeScenario)
              .map((s) => (
                <path
                  key={s}
                  d={dataToPath(scenarios[s].data, cx, cy, maxR)}
                  fill="transparent"
                  stroke="var(--line)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
              ))}
            <path
              d={dataToPath(scenarios[activeScenario].data, cx, cy, maxR)}
              fill="rgba(154,123,46,0.12)"
              stroke={scenarios[activeScenario].color}
              strokeWidth={2.5}
            />
            {scenarios[activeScenario].data.map((val, i) => {
              const r = (val / 100) * maxR
              const pt = polarToCartesian(cx, cy, r, i, axes.length)
              const isHov = hovAxis === i
              return (
                <g
                  key={i}
                  onMouseEnter={() => setHovAxis(i)}
                  onMouseLeave={() => setHovAxis(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHov ? 8 : 5}
                    fill={scenarios[activeScenario].color}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                  {isHov && (
                    <g>
                      <rect
                        x={pt.x - 18}
                        y={pt.y - 28}
                        width={36}
                        height={18}
                        rx={5}
                        fill="var(--ink)"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 16}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#F6F1E2"
                        fontFamily="IBM Plex Mono, monospace"
                        fontWeight={700}
                      >
                        {val}%
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
            {axes.map((label, i) => {
              const pos = polarToCartesian(cx, cy, maxR + 22, i, axes.length)
              return (
                <text
                  key={i}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontFamily="Inter, sans-serif"
                  fill={hovAxis === i ? "#0C1B2D" : "#8A94A1"}
                  fontWeight={hovAxis === i ? 700 : 400}
                >
                  {label}
                </text>
              )
            })}
          </svg>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: 0,
              paddingTop: 8,
              flex: 1,
            }}
          >
            <div
              style={{
                background: "var(--ink)",
                borderRadius: 10,
                padding: "14px 18px",
                textAlign: "center",
              }}
            >
              <p
                className="pv-mono"
                style={{
                  fontSize: 9.5,
                  letterSpacing: "0.14em",
                  color: "var(--brass-bright)",
                  margin: 0,
                }}
              >
                LIVE SCORE
              </p>
              <p
                className="pv-numeral"
                style={{
                  fontSize: 36,
                  fontWeight: 600,
                  color: "#F6F1E2",
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                {liveScore.toFixed(1)}
              </p>
              <p
                style={{
                  fontSize: 10.5,
                  color: "#7FB08C",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                ▲ trending up
              </p>
            </div>
            {axes.map((label, i) => (
              <div
                key={label}
                style={{
                  padding: "7px 10px",
                  background: hovAxis === i ? "var(--paper)" : "#fff",
                  borderRadius: 8,
                  border: "1px solid var(--line-soft)",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHovAxis(i)}
                onMouseLeave={() => setHovAxis(null)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--slate)" }}>
                    {label}
                  </span>
                  <span
                    className="pv-mono"
                    style={{ fontSize: 12, fontWeight: 700 }}
                  >
                    {scenarios[activeScenario].data[i]}%
                  </span>
                </div>
                <div
                  style={{
                    height: 3,
                    background: "#EFEEE8",
                    borderRadius: 2,
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${scenarios[activeScenario].data[i]}%`,
                      background: scenarios[activeScenario].color,
                      borderRadius: 2,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div
        style={{
          gridColumn: "span 6",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {sim && (
          <Card>
            <SectionHead
              eyebrow={`§ Monte Carlo · ${sim.iterations.toLocaleString()} iterations`}
              title="Simulation result"
              sub={`${sim.label ?? "Uncalibrated estimate"}${
                typeof sim.seed === "number" ? ` · seed ${sim.seed}` : ""
              }${
                sim.input_snapshot_id
                  ? ` · snapshot ${sim.input_snapshot_id}`
                  : ""
              }`}
              right={
                <span style={{ display: "flex", gap: 6 }}>
                  <StatusChip tone={sim.calibrated ? "ok" : "warn"}>
                    {sim.calibrated ? "Calibrated" : "Uncalibrated"}
                  </StatusChip>
                  {sim.bottleneck_department && (
                    <StatusChip tone="bad">
                      Bottleneck: {sim.bottleneck_department}
                    </StatusChip>
                  )}
                </span>
              }
            />
            {(sim.data_quality_notes ?? []).length > 0 && (
              <div
                style={{
                  background: "var(--amber-bg)",
                  border: "1px solid #E7D3A0",
                  borderRadius: 9,
                  padding: "10px 14px",
                  marginBottom: 12,
                }}
              >
                <p
                  className="pv-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    color: "var(--amber)",
                    margin: "0 0 4px",
                  }}
                >
                  DATA QUALITY
                </p>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {(sim.data_quality_notes ?? []).map((note, i) => (
                    <li
                      key={i}
                      style={{ fontSize: 11.5, color: "var(--amber)" }}
                    >
                      {note}
                    </li>
                  ))}
                </ul>
                {typeof sim.data_completeness === "number" && (
                  <p
                    style={{
                      fontSize: 11.5,
                      color: "var(--amber)",
                      margin: "4px 0 0",
                    }}
                  >
                    Data completeness:{" "}
                    {(sim.data_completeness * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {[
                {
                  label: "Median completion",
                  value: `${sim.median_completion_days}d`,
                },
                {
                  label: "P90 scenario (estimate)",
                  value: `${sim.p90_completion_days}d`,
                },
                {
                  label: "Optimistic",
                  value: `${sim.optimistic_completion_days}d`,
                },
                {
                  label: "Pessimistic",
                  value: `${sim.pessimistic_completion_days}d`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "var(--paper)",
                    borderRadius: 9,
                    padding: 14,
                    border: "1px solid var(--line-soft)",
                  }}
                >
                  <p
                    className="pv-numeral"
                    style={{ fontSize: 22, fontWeight: 600, margin: 0 }}
                  >
                    {item.value}
                  </p>
                  <p
                    style={{
                      fontSize: 10.5,
                      color: "var(--slate)",
                      margin: "2px 0 0",
                    }}
                  >
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <SectionHead
            eyebrow="§ 8-week trajectory"
            title="Scenario trajectory"
            sub="Advisory signal · not a calibrated forecast"
            right={
              <span
                className="pv-numeral"
                style={{ fontSize: 22, fontWeight: 600 }}
              >
                +7.2%
              </span>
            }
          />
          <svg
            width={PW}
            height={PH}
            style={{ overflow: "visible", maxWidth: "100%" }}
            viewBox={`0 0 ${PW} ${PH}`}
          >
            <defs>
              <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9A7B2E" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#9A7B2E" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[85, 90, 95, 100].map((v) => (
              <line
                key={v}
                x1={pPL}
                y1={py(v)}
                x2={PW - pPR}
                y2={py(v)}
                stroke="var(--line-soft)"
                strokeWidth={1}
              />
            ))}
            <path
              d={
                pPath +
                ` L ${px(predictions.length - 1)} ${pPT + pCH} L ${px(0)} ${pPT + pCH} Z`
              }
              fill="url(#predGrad)"
            />
            <path
              d={pPath}
              fill="none"
              stroke="#0C1B2D"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {predictions.map((d, i) => (
              <g key={i}>
                <circle
                  cx={px(i)}
                  cy={py(d.score)}
                  r={3}
                  fill="#9A7B2E"
                  stroke="#0C1B2D"
                  strokeWidth={1.5}
                />
                <text
                  x={px(i)}
                  y={PH - 4}
                  textAnchor="middle"
                  fontSize={8}
                  fill="#8A94A1"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {d.week}
                </text>
              </g>
            ))}
          </svg>
        </Card>

        <Card>
          <SectionHead eyebrow="§ Compare" title="Scenario comparison" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(Object.keys(scenarios) as Scenario[]).map((s) => {
              const avg = Math.round(
                scenarios[s].data.reduce((a, b) => a + b, 0) /
                  scenarios[s].data.length,
              )
              const active = activeScenario === s
              return (
                <div
                  key={s}
                  onClick={() => setActiveScenario(s)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: 9,
                    border: `1px solid ${
                      active ? scenarios[s].color : "var(--line-soft)"
                    }`,
                    background: active ? "var(--paper)" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: scenarios[s].color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>
                    {scenarios[s].label}
                  </span>
                  <span
                    className="pv-numeral"
                    style={{ fontSize: 17, fontWeight: 600 }}
                  >
                    {avg}%
                  </span>
                  <span
                    className="pv-mono"
                    style={{ fontSize: 10, color: "var(--faint)" }}
                  >
                    AVG
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
