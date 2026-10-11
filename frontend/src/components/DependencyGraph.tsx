import { useState } from "react"

const nodes = [
  { id: "rbi", label: "RBI Mandate", x: 120, y: 50, critical: true },
  { id: "it", label: "IT Infra", x: 60, y: 130, critical: true },
  { id: "risk", label: "Risk Mgmt", x: 180, y: 130, critical: false },
  { id: "ops", label: "Operations", x: 30, y: 210, critical: false },
  { id: "legal", label: "Legal", x: 120, y: 210, critical: true },
  { id: "hr", label: "HR Policies", x: 210, y: 210, critical: false },
  { id: "audit", label: "Audit Rpt", x: 120, y: 290, critical: true },
]

const edges = [
  ["rbi", "it"],
  ["rbi", "risk"],
  ["it", "ops"],
  ["it", "legal"],
  ["risk", "legal"],
  ["risk", "hr"],
  ["legal", "audit"],
  ["ops", "audit"],
]

const criticalPath = new Set(["rbi", "it", "legal", "audit"])

export default function DependencyGraph() {
  const [hovered, setHovered] = useState<string | null>(null)
  const getNode = (id: string) => nodes.find((n) => n.id === id)!

  return (
    <svg width={260} height={320} style={{ overflow: "visible" }}>
      {edges.map(([a, b]) => {
        const na = getNode(a),
          nb = getNode(b)
        const isCritical = criticalPath.has(a) && criticalPath.has(b)
        return (
          <line
            key={`${a}-${b}`}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke={isCritical ? "#9A7B2E" : "#E4E1D8"}
            strokeWidth={isCritical ? 2 : 1}
            opacity={hovered && ![a, b].includes(hovered) ? 0.3 : 1}
            style={{ transition: "opacity 0.15s ease" }}
          />
        )
      })}
      {nodes.map((node) => {
        const isCritical = criticalPath.has(node.id)
        const isHovered = hovered === node.id
        return (
          <g
            key={node.id}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={isHovered ? 22 : 18}
              fill={isCritical ? "#0C1B2D" : "#FFFFFF"}
              stroke={isCritical ? "#C5A254" : "#E4E1D8"}
              strokeWidth={isCritical ? 1.5 : 1}
              style={{
                transition: "all 0.15s ease",
                filter: isHovered
                  ? "drop-shadow(0 4px 8px rgba(12,27,45,0.2))"
                  : "none",
              }}
            />
            <text
              x={node.x}
              y={node.y - 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={7.5}
              fontFamily="Inter, sans-serif"
              fontWeight={600}
              fill={isCritical ? "#E8D9AC" : "#8A94A1"}
            >
              {node.label.split(" ")[0]}
            </text>
            <text
              x={node.x}
              y={node.y + 8}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={6.5}
              fontFamily="Inter, sans-serif"
              fill={isCritical ? "#E8D9AC" : "#8A94A1"}
            >
              {node.label.split(" ")[1] || ""}
            </text>
          </g>
        )
      })}
      <g transform="translate(0, 308)">
        <circle
          cx={8}
          cy={6}
          r={5}
          fill="#0C1B2D"
          stroke="#C5A254"
          strokeWidth={1.5}
        />
        <text
          x={18}
          y={10}
          fontSize={9}
          fontFamily="Inter, sans-serif"
          fill="#8A94A1"
        >
          Critical Path
        </text>
        <circle
          cx={90}
          cy={6}
          r={5}
          fill="#FFF"
          stroke="#E4E1D8"
          strokeWidth={1}
        />
        <text
          x={100}
          y={10}
          fontSize={9}
          fontFamily="Inter, sans-serif"
          fill="#8A94A1"
        >
          Standard
        </text>
      </g>
    </svg>
  )
}
