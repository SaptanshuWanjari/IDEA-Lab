import { useState } from 'react'

const nodes = [
  { id: 'rbi', label: 'RBI Mandate', x: 120, y: 50, critical: true },
  { id: 'it', label: 'IT Infra', x: 60, y: 130, critical: true },
  { id: 'risk', label: 'Risk Mgmt', x: 180, y: 130, critical: false },
  { id: 'ops', label: 'Operations', x: 30, y: 210, critical: false },
  { id: 'legal', label: 'Legal', x: 120, y: 210, critical: true },
  { id: 'hr', label: 'HR Policies', x: 210, y: 210, critical: false },
  { id: 'audit', label: 'Audit Rpt', x: 120, y: 290, critical: true },
]

const edges = [
  ['rbi', 'it'], ['rbi', 'risk'],
  ['it', 'ops'], ['it', 'legal'],
  ['risk', 'legal'], ['risk', 'hr'],
  ['legal', 'audit'], ['ops', 'audit'],
]

const criticalPath = new Set(['rbi', 'it', 'legal', 'audit'])

export default function DependencyGraph() {
  const [hovered, setHovered] = useState<string | null>(null)

  const getNode = (id: string) => nodes.find(n => n.id === id)!

  return (
    <svg width={260} height={320} style={{ overflow: 'visible' }}>
      {/* Edges */}
      {edges.map(([a, b]) => {
        const na = getNode(a), nb = getNode(b)
        const isCritical = criticalPath.has(a) && criticalPath.has(b)
        return (
          <line
            key={`${a}-${b}`}
            x1={na.x} y1={na.y}
            x2={nb.x} y2={nb.y}
            stroke={isCritical ? '#8ad8ff' : '#E8E8E3'}
            strokeWidth={isCritical ? 2 : 1}
            opacity={hovered && !([a, b].includes(hovered)) ? 0.3 : 1}
            style={{ transition: 'opacity 0.15s ease' }}
          />
        )
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const isCritical = criticalPath.has(node.id)
        const isHovered = hovered === node.id
        return (
          <g
            key={node.id}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={isHovered ? 22 : 18}
              fill={isCritical ? '#8ad8ff' : '#FFFFFF'}
              stroke={isCritical ? '#111' : '#E8E8E3'}
              strokeWidth={isCritical ? 2 : 1}
              style={{ transition: 'all 0.15s ease', filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'none' }}
            />
            <text
              x={node.x}
              y={node.y - 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={7.5}
              fontFamily="Inter, sans-serif"
              fontWeight={600}
              fill={isCritical ? '#111111' : '#888880'}
            >
              {node.label.split(' ')[0]}
            </text>
            <text
              x={node.x}
              y={node.y + 8}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={6.5}
              fontFamily="Inter, sans-serif"
              fill={isCritical ? '#111111' : '#888880'}
            >
              {node.label.split(' ')[1] || ''}
            </text>
          </g>
        )
      })}

      {/* Legend */}
      <g transform="translate(0, 308)">
        <circle cx={8} cy={6} r={5} fill="#8ad8ff" stroke="#111" strokeWidth={1.5} />
        <text x={18} y={10} fontSize={9} fontFamily="Inter, sans-serif" fill="#888880">Critical Path</text>
        <circle cx={90} cy={6} r={5} fill="#FFF" stroke="#E8E8E3" strokeWidth={1} />
        <text x={100} y={10} fontSize={9} fontFamily="Inter, sans-serif" fill="#888880">Standard</text>
      </g>
    </svg>
  )
}
