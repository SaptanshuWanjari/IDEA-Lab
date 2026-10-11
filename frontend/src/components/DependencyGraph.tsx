import { useState } from 'react'
import type { GraphNode, GraphEdge } from '../lib/types'
import {
  Layers,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react'

export interface DependencyNode {
  id: string
  code: string
  label: string
  department: string
  phase: string
  status: 'Completed' | 'In Progress' | 'Pending Review' | 'Planned'
  durationDays: number
  slackDays: number
  critical: boolean
  risk: 'High' | 'Medium' | 'Low'
  owner: string
  description: string
  x: number
  y: number
}

export const DEFAULT_NODES: DependencyNode[] = [
  {
    id: 'rbi',
    code: 'MAP-101',
    label: 'RBI Circular Scope',
    department: 'Compliance',
    phase: 'Phase 1: Ingestion',
    status: 'Completed',
    durationDays: 5,
    slackDays: 0,
    critical: true,
    risk: 'Low',
    owner: 'Chief Compliance Officer',
    description: 'Decompose regulatory circular, extract obligations, and map departmental mandates.',
    x: 75,
    y: 180,
  },
  {
    id: 'it',
    code: 'MAP-102',
    label: 'IT Architecture & Infra',
    department: 'IT Infra',
    phase: 'Phase 2: Technical',
    status: 'In Progress',
    durationDays: 18,
    slackDays: 0,
    critical: true,
    risk: 'High',
    owner: 'Head of Core Banking Tech',
    description: 'Implement multi-region failover, encryption key rotation, and API logging pipelines.',
    x: 260,
    y: 95,
  },
  {
    id: 'risk',
    code: 'MAP-103',
    label: 'Risk Appetite Model',
    department: 'Risk Mgmt',
    phase: 'Phase 2: Assessment',
    status: 'In Progress',
    durationDays: 10,
    slackDays: 6,
    critical: false,
    risk: 'Medium',
    owner: 'Chief Risk Officer',
    description: 'Update risk tolerance parameters, credit exposure boundaries, and third-party scoring.',
    x: 260,
    y: 265,
  },
  {
    id: 'ops',
    code: 'MAP-104',
    label: 'Branch SOP Rollout',
    department: 'Operations',
    phase: 'Phase 3: Rollout',
    status: 'Planned',
    durationDays: 12,
    slackDays: 8,
    critical: false,
    risk: 'Medium',
    owner: 'Head of Retail Operations',
    description: 'Distribute revised standard operating procedures across 420 retail banking branches.',
    x: 465,
    y: 70,
  },
  {
    id: 'legal',
    code: 'MAP-105',
    label: 'Legal Covenant Review',
    department: 'Legal',
    phase: 'Phase 3: Validation',
    status: 'In Progress',
    durationDays: 14,
    slackDays: 0,
    critical: true,
    risk: 'High',
    owner: 'General Counsel',
    description: 'Validate borrower agreement clauses and verify vendor SLAs against statutory standards.',
    x: 465,
    y: 195,
  },
  {
    id: 'hr',
    code: 'MAP-106',
    label: 'Staff Mandatory Training',
    department: 'Human Resources',
    phase: 'Phase 3: Training',
    status: 'Planned',
    durationDays: 8,
    slackDays: 10,
    critical: false,
    risk: 'Low',
    owner: 'Chief People Officer',
    description: 'Conduct mandatory compliance certification modules for 1,200 frontline operations staff.',
    x: 465,
    y: 320,
  },
  {
    id: 'audit',
    code: 'MAP-107',
    label: 'Audit Sign-off & Dossier',
    department: 'Internal Audit',
    phase: 'Phase 4: Sign-off',
    status: 'Planned',
    durationDays: 10,
    slackDays: 0,
    critical: true,
    risk: 'Medium',
    owner: 'Head of Internal Audit',
    description: 'Verify remediation evidence, validate sampling checks, and file executive sign-off pack.',
    x: 650,
    y: 180,
  },
]

export const DEFAULT_EDGES: [string, string][] = [
  ['rbi', 'it'],
  ['rbi', 'risk'],
  ['it', 'ops'],
  ['it', 'legal'],
  ['risk', 'legal'],
  ['risk', 'hr'],
  ['legal', 'audit'],
  ['ops', 'audit'],
]

export const DEFAULT_CRITICAL_PATH = ['rbi', 'it', 'legal', 'audit']

export interface DependencyGraphProps {
  selectedNodeId?: string | null
  onSelectNode?: (nodeId: string | null) => void
  showCriticalOnly?: boolean
  departmentFilter?: string
  compact?: boolean
  customNodes?: GraphNode[]
  customEdges?: GraphEdge[]
  customCriticalPath?: string[]
}

export default function DependencyGraph({
  selectedNodeId,
  onSelectNode,
  showCriticalOnly = false,
  departmentFilter = 'all',
  compact = false,
  customNodes,
  customEdges,
  customCriticalPath,
}: DependencyGraphProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  // Use custom or default
  const nodes: DependencyNode[] = customNodes && customNodes.length > 0
    ? customNodes.map((n, i) => {
        const angle = (i / customNodes.length) * 2 * Math.PI
        const cx = 360, cy = 180, rx = 240, ry = 120
        const isCrit = (customCriticalPath || []).includes(n.id)
        return {
          id: n.id,
          code: `MAP-${(i + 1).toString().padStart(3, '0')}`,
          label: n.label || n.id.slice(0, 16),
          department: n.department || 'Operations',
          phase: `Step ${i + 1}`,
          status: (n.status as DependencyNode['status']) || 'In Progress',
          durationDays: 7,
          slackDays: isCrit ? 0 : 5,
          critical: isCrit,
          risk: isCrit ? 'High' : 'Low',
          owner: n.department || 'Team Lead',
          description: n.label || '',
          x: Math.round(cx + rx * Math.cos(angle)),
          y: Math.round(cy + ry * Math.sin(angle)),
        }
      })
    : DEFAULT_NODES

  const edges: [string, string][] = customEdges && customEdges.length > 0
    ? customEdges.map(e => [e.source, e.target])
    : DEFAULT_EDGES

  const criticalSet = new Set(customCriticalPath || DEFAULT_CRITICAL_PATH)

  const activeId = selectedNodeId || hoveredNodeId

  // Connected edges for active node
  const activeIncoming = new Set<string>()
  const activeOutgoing = new Set<string>()
  if (activeId) {
    edges.forEach(([u, v]) => {
      if (v === activeId) activeIncoming.add(u)
      if (u === activeId) activeOutgoing.add(v)
    })
  }

  const getNode = (id: string) => nodes.find(n => n.id === id)

  // Filter visible edges
  const visibleEdges = edges.filter(([a, b]) => {
    if (showCriticalOnly) {
      return criticalSet.has(a) && criticalSet.has(b)
    }
    if (departmentFilter !== 'all') {
      const na = getNode(a), nb = getNode(b)
      return na?.department.toLowerCase() === departmentFilter.toLowerCase() ||
             nb?.department.toLowerCase() === departmentFilter.toLowerCase()
    }
    return true
  })

  // Filter visible nodes
  const visibleNodes = nodes.filter(n => {
    if (showCriticalOnly && !criticalSet.has(n.id)) return false
    if (departmentFilter !== 'all' && n.department.toLowerCase() !== departmentFilter.toLowerCase()) {
      return false
    }
    return true
  })

  const W = 720
  const H = 360

  return (
    <div className="relative w-full overflow-hidden select-none">
      {/* SVG Container */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto max-h-[380px] overflow-visible"
        style={{ minHeight: compact ? 220 : 300 }}
      >
        <defs>
          {/* Arrow markers */}
          <marker
            id="pv-arrow-default"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#94A3B8" />
          </marker>
          <marker
            id="pv-arrow-critical"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0.5 L 10 5 L 0 9.5 z" fill="#0D9488" />
          </marker>
          <marker
            id="pv-arrow-active"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0.5 L 10 5 L 0 9.5 z" fill="#2563EB" />
          </marker>

          {/* Gradients */}
          <linearGradient id="pv-crit-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
          <linearGradient id="pv-node-crit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#102A43" />
            <stop offset="100%" stopColor="#1E3A5F" />
          </linearGradient>
        </defs>

        {/* Phase background swimlanes / guides */}
        {!compact && (
          <g className="opacity-40">
            <line x1="170" y1="20" x2="170" y2="340" stroke="#E2EAF2" strokeDasharray="4 4" />
            <line x1="365" y1="20" x2="365" y2="340" stroke="#E2EAF2" strokeDasharray="4 4" />
            <line x1="560" y1="20" x2="560" y2="340" stroke="#E2EAF2" strokeDasharray="4 4" />
            <text x="80" y="24" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="600" letterSpacing="0.05em">
              PHASE 1: SCOPE
            </text>
            <text x="260" y="24" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="600" letterSpacing="0.05em">
              PHASE 2: BUILD
            </text>
            <text x="465" y="24" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="600" letterSpacing="0.05em">
              PHASE 3: OPERATE
            </text>
            <text x="650" y="24" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="600" letterSpacing="0.05em">
              PHASE 4: AUDIT
            </text>
          </g>
        )}

        {/* Edges */}
        {visibleEdges.map(([a, b]) => {
          const na = getNode(a)
          const nb = getNode(b)
          if (!na || !nb) return null

          const isCriticalEdge = criticalSet.has(a) && criticalSet.has(b)
          const isEdgeActive = activeId && (
            (activeId === a && activeOutgoing.has(b)) ||
            (activeId === b && activeIncoming.has(a))
          )
          const isDimmed = activeId && !isEdgeActive && activeId !== a && activeId !== b

          // Smooth bezier curve
          const dx = (nb.x - na.x) * 0.45
          const pathD = `M ${na.x} ${na.y} C ${na.x + dx} ${na.y}, ${nb.x - dx} ${nb.y}, ${nb.x} ${nb.y}`

          return (
            <g key={`${a}->${b}`}>
              {/* Thicker shadow/hover hit target */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                className="cursor-pointer"
              />
              {/* Visual line */}
              <path
                d={pathD}
                fill="none"
                stroke={
                  isEdgeActive
                    ? '#2563EB'
                    : isCriticalEdge
                    ? 'url(#pv-crit-line)'
                    : '#CBD5E1'
                }
                strokeWidth={isEdgeActive ? 2.5 : isCriticalEdge ? 2.2 : 1.4}
                strokeDasharray={isCriticalEdge && !isEdgeActive ? '5 3' : undefined}
                markerEnd={
                  isEdgeActive
                    ? 'url(#pv-arrow-active)'
                    : isCriticalEdge
                    ? 'url(#pv-arrow-critical)'
                    : 'url(#pv-arrow-default)'
                }
                opacity={isDimmed ? 0.2 : 1}
                className="transition-all duration-200"
              />
            </g>
          )
        })}

        {/* Nodes */}
        {visibleNodes.map((node) => {
          const isSelected = selectedNodeId === node.id
          const isHovered = hoveredNodeId === node.id
          const isCritical = criticalSet.has(node.id)
          const isRelated = activeId && (activeIncoming.has(node.id) || activeOutgoing.has(node.id))
          const isDimmed = activeId && activeId !== node.id && !isRelated

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer transition-transform duration-200"
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onClick={() => onSelectNode?.(isSelected ? null : node.id)}
              opacity={isDimmed ? 0.35 : 1}
            >
              {/* Outer Glow / Halo if selected or critical */}
              {(isSelected || isHovered) && (
                <circle
                  r={32}
                  fill={isCritical ? 'rgba(13, 148, 136, 0.15)' : 'rgba(37, 99, 235, 0.15)'}
                  className="animate-pulse"
                />
              )}

              {/* Node Card Container */}
              <circle
                r={24}
                fill={isCritical ? 'url(#pv-node-crit)' : '#FFFFFF'}
                stroke={
                  isSelected
                    ? '#2563EB'
                    : isCritical
                    ? '#0D9488'
                    : '#CBD5E1'
                }
                strokeWidth={isSelected ? 2.5 : isCritical ? 2 : 1.5}
                filter="drop-shadow(0 2px 4px rgba(16,42,67,0.08))"
              />

              {/* Department indicator ring */}
              <circle
                r={19}
                fill="none"
                stroke={
                  node.status === 'Completed'
                    ? '#10B981'
                    : node.status === 'In Progress'
                    ? isCritical ? '#14B8A6' : '#3B82F6'
                    : '#94A3B8'
                }
                strokeWidth={1}
                strokeDasharray={node.status === 'In Progress' ? '3 2' : undefined}
                opacity={0.8}
              />

              {/* Center icon / initials */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9.5}
                fontWeight={700}
                fontFamily="Inter, system-ui, sans-serif"
                fill={isCritical ? '#FFFFFF' : '#102A43'}
              >
                {node.id.toUpperCase().slice(0, 3)}
              </text>

              {/* Node Labels Pill (Below node) */}
              <g transform="translate(0, 32)">
                <rect
                  x={-58}
                  y={0}
                  width={116}
                  height={22}
                  rx={6}
                  fill="#FFFFFF"
                  stroke={isSelected ? '#2563EB' : isCritical ? '#CCFBF1' : '#E2EAF2'}
                  strokeWidth={1}
                  filter="drop-shadow(0 1px 2px rgba(0,0,0,0.04))"
                />
                <text
                  x={0}
                  y={14}
                  textAnchor="middle"
                  fontSize={8.5}
                  fontWeight={600}
                  fill="#102A43"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {node.label.length > 17 ? `${node.label.slice(0, 15)}…` : node.label}
                </text>
              </g>

              {/* Duration / Critical Path Tag (Above node) */}
              <g transform="translate(0, -28)">
                <rect
                  x={-28}
                  y={-12}
                  width={56}
                  height={14}
                  rx={4}
                  fill={isCritical ? '#FEF2F2' : '#F1F5F9'}
                  stroke={isCritical ? '#FECACA' : '#E2EAF2'}
                  strokeWidth={0.8}
                />
                <text
                  x={0}
                  y={-2}
                  textAnchor="middle"
                  fontSize={7.5}
                  fontWeight={700}
                  fill={isCritical ? '#DC2626' : '#64748B'}
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {node.durationDays}d {isCritical ? '• CP' : ''}
                </text>
              </g>

              {/* Critical pulse beacon on critical nodes */}
              {isCritical && (
                <circle
                  cx={18}
                  cy={-18}
                  r={4}
                  fill="#DC2626"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend & Summary Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-2 border-t border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#102A43] border border-teal-500 inline-block" />
            <span className="font-medium text-slate-800">Critical Path Task (0d Float)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-white border border-slate-300 inline-block" />
            <span>Standard Obligation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-teal-600 inline-block" />
            <span className="text-teal-700 font-medium">Critical Path Sequence</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Nodes:</span>
          <span className="font-semibold text-slate-800">{visibleNodes.length}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">Dependencies:</span>
          <span className="font-semibold text-slate-800">{visibleEdges.length}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">Critical Duration:</span>
          <span className="font-semibold text-rose-600">47 Days</span>
        </div>
      </div>
    </div>
  )
}
