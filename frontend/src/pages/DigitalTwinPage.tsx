import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import type { SimulationResponse } from '../lib/types'
import DependencyGraph, {
  DEFAULT_NODES,
  DEFAULT_EDGES,
  DEFAULT_CRITICAL_PATH,
  type DependencyNode,
} from '../components/DependencyGraph'
import {
  Network,
  GitFork,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  ChevronRight,
  Sliders,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'

const axes = ['Operations', 'Risk', 'IT', 'Compliance', 'Legal', 'HR']

type Scenario = 'current' | 'optimistic' | 'stressed'

const scenarios: Record<Scenario, {
  label: string
  color: string
  data: number[]
}> = {
  current: {
    label: 'Current State',
    color: '#0D9488',
    data: [88, 72, 91, 95, 78, 84],
  },
  optimistic: {
    label: 'Optimistic (+30d)',
    color: '#059669',
    data: [94, 85, 96, 98, 89, 91],
  },
  stressed: {
    label: 'Stressed Scenario',
    color: '#DC2626',
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
        (p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      )
      .join(' ') + ' Z'
  )
}

const W = 360,
  H = 340,
  cx = 180,
  cy = 170,
  maxR = 115

export default function DigitalTwinPage() {
  const { selectedId, navigate } = useApp()
  const [activeTab, setActiveTab] = useState<'graph' | 'simulation'>('graph')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('it')
  const [showCriticalOnly, setShowCriticalOnly] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [simulatedDelayDays, setSimulatedDelayDays] = useState(0)

  // Simulation state
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
      setLiveScore((prev) => {
        const delta = (Math.random() - 0.5) * 0.4
        return parseFloat(Math.min(99, Math.max(85, prev + delta)).toFixed(1))
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  const { data: sim } = useApi<SimulationResponse>(() => {
    if (!selectedId)
      return Promise.resolve(null as unknown as SimulationResponse)
    return api.get<SimulationResponse>(`/regulations/${selectedId}/simulate`)
  }, [selectedId])

  const selectedNode: DependencyNode | undefined =
    DEFAULT_NODES.find((n) => n.id === selectedNodeId) || DEFAULT_NODES[1]

  // Predecessors and successors for selected node
  const predecessors = DEFAULT_EDGES.filter(([, b]) => b === selectedNode?.id)
    .map(([a]) => DEFAULT_NODES.find((n) => n.id === a))
    .filter(Boolean) as DependencyNode[]

  const successors = DEFAULT_EDGES.filter(([a]) => a === selectedNode?.id)
    .map(([, b]) => DEFAULT_NODES.find((n) => n.id === b))
    .filter(Boolean) as DependencyNode[]

  const levels = [0.25, 0.5, 0.75, 1]

  const predictions = [
    { week: 'W1', score: 91 },
    { week: 'W2', score: 89 },
    { week: 'W3', score: 93 },
    { week: 'W4', score: 95 },
    { week: 'W5', score: 94 },
    { week: 'W6', score: 97 },
    { week: 'W7', score: 96 },
    { week: 'W8', score: 98 },
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
        `${i === 0 ? 'M' : 'L'} ${px(i).toFixed(1)} ${py(d.score).toFixed(1)}`,
    )
    .join(' ')

  const departments = [
    'all',
    'Compliance',
    'IT Infra',
    'Risk Mgmt',
    'Operations',
    'Legal',
    'Human Resources',
    'Internal Audit',
  ]

  return (
    <div className="w-full space-y-5 pb-10">
      {/* Top Header Card */}
      <div className="bg-white border border-[#E2EAF2] rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              <Network className="w-3.5 h-3.5" />
              Digital Compliance Twin
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-500">PERT / CPM Critical Path Engine</span>
          </div>
          <h1 className="text-xl font-bold text-[#102A43] tracking-tight m-0">
            Dependency Path Graph & Critical Sequence
          </h1>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Model inter-departmental task dependencies, identify critical bottleneck sequences, and analyze delay propagation.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-[#F2F7FB] p-1 rounded-lg border border-[#E2EAF2] self-start md:self-auto">
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'graph'
                ? 'bg-white text-[#102A43] shadow-xs border border-[#E2EAF2]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-teal-600" />
            Dependency Path Graph
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'simulation'
                ? 'bg-white text-[#102A43] shadow-xs border border-[#E2EAF2]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            Monte Carlo Simulator
          </button>
        </div>
      </div>

      {activeTab === 'graph' ? (
        <>
          {/* Top Metric Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white border border-[#E2EAF2] rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Critical Path Duration</span>
                <Clock className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-2xl font-bold text-[#102A43]">
                {47 + simulatedDelayDays} <span className="text-xs font-normal text-slate-500">Days</span>
              </div>
              <p className="text-[11px] text-rose-600 font-medium m-0 mt-0.5">
                {simulatedDelayDays > 0 ? `+${simulatedDelayDays}d delay active • 0d slack` : '0d float buffer • Zero tolerance'}
              </p>
            </div>

            <div className="bg-white border border-[#E2EAF2] rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Primary Bottleneck</span>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-lg font-bold text-[#102A43] truncate">
                IT Architecture
              </div>
              <p className="text-[11px] text-amber-700 font-medium m-0 mt-0.5">
                18 days • High downstream impact
              </p>
            </div>

            <div className="bg-white border border-[#E2EAF2] rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Available Float Buffer</span>
                <Layers className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <div className="text-2xl font-bold text-[#102A43]">
                24 <span className="text-xs font-normal text-slate-500">Days</span>
              </div>
              <p className="text-[11px] text-teal-700 font-medium m-0 mt-0.5">
                Across 3 non-critical paths
              </p>
            </div>

            <div className="bg-white border border-[#E2EAF2] rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>On-Track Assurance</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-[#102A43]">
                {liveScore.toFixed(1)}%
              </div>
              <p className="text-[11px] text-emerald-700 font-medium m-0 mt-0.5">
                Trending positive • 7 active MAPs
              </p>
            </div>
          </div>

          {/* Main Workspace: Graph Canvas + Inspector Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 8 Cols: Dependency Graph Canvas */}
            <div className="lg:col-span-8 bg-white border border-[#E2EAF2] rounded-xl p-4 shadow-xs flex flex-col justify-between">
              <div>
                {/* Graph Controls Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-[#E2EAF2]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCriticalOnly(false)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                        !showCriticalOnly
                          ? 'bg-[#102A43] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All Dependencies (8)
                    </button>
                    <button
                      onClick={() => setShowCriticalOnly(true)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        showCriticalOnly
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      Critical Path Only (4)
                    </button>
                  </div>

                  {/* Department Filter */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Dept:</span>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="text-xs bg-[#F2F7FB] border border-[#E2EAF2] rounded px-2 py-1 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d === 'all' ? 'All Departments' : d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Graph Description Banner */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span>
                      Interactive DAG: Click any node to inspect upstream blockers and downstream dependencies.
                    </span>
                  </div>
                  {selectedNodeId && (
                    <button
                      onClick={() => setSelectedNodeId(null)}
                      className="text-[11px] text-teal-700 hover:underline font-semibold"
                    >
                      Reset selection
                    </button>
                  )}
                </div>

                {/* SVG Graph Component */}
                <DependencyGraph
                  selectedNodeId={selectedNodeId}
                  onSelectNode={(id) => setSelectedNodeId(id)}
                  showCriticalOnly={showCriticalOnly}
                  departmentFilter={departmentFilter}
                />
              </div>

              {/* Bottom Path Stepper Strip */}
              <div className="mt-4 pt-3 border-t border-[#E2EAF2]">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-rose-500" />
                  Sequential Critical Path Flow (Zero Slack)
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {DEFAULT_CRITICAL_PATH.map((id, index) => {
                    const node = DEFAULT_NODES.find((n) => n.id === id)
                    const isNodeSelected = selectedNodeId === id
                    return (
                      <div key={id} className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedNodeId(id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                            isNodeSelected
                              ? 'bg-[#102A43] text-white border-[#102A43] shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <span
                            className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isNodeSelected
                                ? 'bg-teal-500 text-white'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="font-medium">{node?.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {node?.durationDays}d
                          </span>
                        </button>
                        {index < DEFAULT_CRITICAL_PATH.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Dedicated Node Inspector & Details */}
            <div className="lg:col-span-4 space-y-4">
              {selectedNode ? (
                <div className="bg-white border border-[#E2EAF2] rounded-xl p-4 shadow-xs space-y-4">
                  {/* Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                        {selectedNode.code}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                          selectedNode.critical
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {selectedNode.critical ? 'Critical Path' : 'Float Path'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#102A43] m-0 leading-snug">
                      {selectedNode.label}
                    </h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                      {selectedNode.department} • {selectedNode.phase}
                    </p>
                  </div>

                  {/* Critical Status Alert */}
                  <div
                    className={`p-3 rounded-lg border text-xs leading-relaxed ${
                      selectedNode.critical
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {selectedNode.critical ? (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-semibold">Zero Slack Bottleneck</strong>
                          Any delay on this task propagates 1:1 into the final regulatory completion deadline.
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-semibold">Buffer Available</strong>
                          {selectedNode.slackDays} days of float buffer exist before impacting the critical path.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#F2F7FB] p-2.5 rounded-lg border border-[#E2EAF2]">
                      <span className="text-slate-500 block text-[11px]">Duration SLA</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {selectedNode.durationDays + (selectedNode.id === 'it' ? simulatedDelayDays : 0)} Days
                      </span>
                    </div>
                    <div className="bg-[#F2F7FB] p-2.5 rounded-lg border border-[#E2EAF2]">
                      <span className="text-slate-500 block text-[11px]">Float / Slack</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {selectedNode.slackDays} Days
                      </span>
                    </div>
                    <div className="bg-[#F2F7FB] p-2.5 rounded-lg border border-[#E2EAF2]">
                      <span className="text-slate-500 block text-[11px]">Delay Risk</span>
                      <span
                        className={`font-bold text-sm ${
                          selectedNode.risk === 'High'
                            ? 'text-rose-600'
                            : selectedNode.risk === 'Medium'
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {selectedNode.risk} Impact
                      </span>
                    </div>
                    <div className="bg-[#F2F7FB] p-2.5 rounded-lg border border-[#E2EAF2]">
                      <span className="text-slate-500 block text-[11px]">Task Status</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {selectedNode.status}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700 block mb-0.5">Description:</span>
                    {selectedNode.description}
                  </div>

                  {/* Lead Assignee */}
                  <div className="text-xs text-slate-600">
                    <span className="text-slate-500">Lead Responsible: </span>
                    <strong className="text-slate-800">{selectedNode.owner}</strong>
                  </div>

                  {/* Predecessors (Blocked by) */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Blocked By (Predecessors)</span>
                      <span className="font-mono text-slate-400">{predecessors.length}</span>
                    </div>
                    {predecessors.length === 0 ? (
                      <div className="text-xs text-slate-400 italic bg-slate-50 p-2 rounded">
                        No predecessors (Root trigger task)
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {predecessors.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedNodeId(p.id)}
                            className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-teal-400 bg-white hover:bg-teal-50/40 text-xs flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="font-semibold text-[#102A43]">{p.label}</div>
                              <div className="text-[11px] text-slate-500">{p.department} • {p.durationDays}d</div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Successors (Blocks downstream) */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Blocking Downstream (Successors)</span>
                      <span className="font-mono text-slate-400">{successors.length}</span>
                    </div>
                    {successors.length === 0 ? (
                      <div className="text-xs text-slate-400 italic bg-slate-50 p-2 rounded">
                        Terminal task (Final milestone sign-off)
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {successors.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedNodeId(s.id)}
                            className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-teal-400 bg-white hover:bg-teal-50/40 text-xs flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="font-semibold text-[#102A43]">{s.label}</div>
                              <div className="text-[11px] text-slate-500">{s.department} • {s.durationDays}d</div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* What-If Simulation Trigger */}
                  <div className="pt-2 border-t border-[#E2EAF2] space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      What-If Scenario Stress Testing
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSimulatedDelayDays((prev) => (prev === 0 ? 5 : 0))}
                        className={`flex-1 text-xs py-1.5 px-3 rounded-lg font-semibold transition-all border ${
                          simulatedDelayDays > 0
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {simulatedDelayDays > 0 ? 'Clear +5d Delay' : 'Simulate +5d Delay'}
                      </button>
                      <button
                        onClick={() => navigate('map-tasks')}
                        className="text-xs py-1.5 px-3 rounded-lg font-semibold bg-[#F2F7FB] hover:bg-slate-200 text-[#102A43] border border-[#E2EAF2] flex items-center gap-1"
                      >
                        View MAPs
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#E2EAF2] rounded-xl p-6 text-center text-slate-500">
                  <Network className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No node selected</p>
                  <p className="text-xs text-slate-400">Click any node on the graph to view dedicated details.</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Table: Dependency Matrix & Blocking Ledger */}
          <div className="bg-white border border-[#E2EAF2] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#102A43] m-0">
                  Dependency Linkage Matrix & Blocking Ledger
                </h3>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Precedence relationships between obligations, departments, and critical milestones.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded text-slate-700">
                8 Active Linkages
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2EAF2] text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Predecessor (Source)</th>
                    <th className="py-2.5 px-3">Dep Type</th>
                    <th className="py-2.5 px-3">Successor (Target)</th>
                    <th className="py-2.5 px-3">Target Dept</th>
                    <th className="py-2.5 px-3">Path Type</th>
                    <th className="py-2.5 px-3">Float Slack</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEFAULT_EDGES.map(([a, b]) => {
                    const na = DEFAULT_NODES.find((n) => n.id === a)
                    const nb = DEFAULT_NODES.find((n) => n.id === b)
                    const isCritical =
                      DEFAULT_CRITICAL_PATH.includes(a) &&
                      DEFAULT_CRITICAL_PATH.includes(b)
                    return (
                      <tr key={`${a}-${b}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#102A43]">
                          {na?.code} • {na?.label}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">
                          Finish-to-Start
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#102A43]">
                          {nb?.code} • {nb?.label}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {nb?.department}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isCritical
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isCritical ? 'Critical Path' : 'Float Path'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {isCritical ? (
                            <span className="text-rose-600 font-semibold">0d (Zero)</span>
                          ) : (
                            <span className="text-teal-700 font-semibold">+{nb?.slackDays}d buffer</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedNodeId(nb?.id || null)
                              window.scrollTo({ top: 120, behavior: 'smooth' })
                            }}
                            className="text-teal-700 hover:text-teal-900 font-semibold hover:underline"
                          >
                            Inspect Node →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Monte Carlo Simulator View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Radar Chart Card (6 col) */}
          <div className="lg:col-span-6 bg-white border border-[#E2EAF2] rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Scenario Estimates • Uncalibrated
                </span>
                <h3 className="text-base font-bold text-[#102A43] m-0">
                  Department Implementation Estimate
                </h3>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Advisory model • Refreshes every 15 minutes
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>

            {/* Scenario Buttons */}
            <div className="inline-flex gap-1 bg-[#F2F7FB] border border-[#E2EAF2] rounded-lg p-1 mb-4">
              {(Object.keys(scenarios) as Scenario[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveScenario(s)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    activeScenario === s
                      ? 'bg-white text-[#102A43] shadow-xs border border-[#E2EAF2]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {scenarios[s].label}
                </button>
              ))}
            </div>

            {/* Radar Diagram */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <svg
                width={W}
                height={H}
                viewBox={`0 0 ${W} ${H}`}
                className="w-full max-w-[320px] h-auto overflow-visible"
              >
                {levels.map((level, li) => {
                  const pts = axes.map((_, i) =>
                    polarToCartesian(cx, cy, maxR * level, i, axes.length),
                  )
                  return (
                    <polygon
                      key={li}
                      points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#E2EAF2"
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
                      stroke="#E2EAF2"
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
                      stroke="#CBD5E1"
                      strokeWidth={1}
                      strokeDasharray="4 3"
                    />
                  ))}
                <path
                  d={dataToPath(scenarios[activeScenario].data, cx, cy, maxR)}
                  fill="rgba(13, 148, 136, 0.15)"
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
                      className="cursor-pointer"
                    >
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHov ? 7 : 4.5}
                        fill={scenarios[activeScenario].color}
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    </g>
                  )
                })}
                {axes.map((label, i) => {
                  const pos = polarToCartesian(cx, cy, maxR + 18, i, axes.length)
                  return (
                    <text
                      key={i}
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={10.5}
                      fontFamily="Inter, sans-serif"
                      fill={hovAxis === i ? '#102A43' : '#64748B'}
                      fontWeight={hovAxis === i ? 700 : 500}
                    >
                      {label}
                    </text>
                  )
                })}
              </svg>

              {/* Department Bars */}
              <div className="flex-1 w-full space-y-2">
                <div className="bg-[#102A43] text-white p-3 rounded-lg text-center mb-3">
                  <div className="text-[10px] tracking-widest uppercase text-teal-400 font-mono">
                    LIVE SCORE
                  </div>
                  <div className="text-3xl font-extrabold">{liveScore.toFixed(1)}</div>
                  <div className="text-[11px] text-emerald-400 font-semibold">▲ trending up</div>
                </div>

                {axes.map((label, i) => (
                  <div
                    key={label}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-600 font-medium">{label}</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {scenarios[activeScenario].data[i]}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all duration-500"
                        style={{ width: `${scenarios[activeScenario].data[i]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 6 Cols: Simulation Results & Trajectory */}
          <div className="lg:col-span-6 space-y-4">
            {sim && (
              <div className="bg-white border border-[#E2EAF2] rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Monte Carlo • {sim.iterations.toLocaleString()} Iterations
                    </span>
                    <h3 className="text-base font-bold text-[#102A43] m-0">
                      Simulation Result
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {sim.calibrated ? 'Calibrated' : 'Uncalibrated'}
                    </span>
                    {sim.bottleneck_department && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Bottleneck: {sim.bottleneck_department}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#F2F7FB] p-3 rounded-lg border border-[#E2EAF2]">
                    <span className="text-2xl font-bold text-[#102A43] block">
                      {sim.median_completion_days}d
                    </span>
                    <span className="text-slate-500">Median Completion</span>
                  </div>
                  <div className="bg-[#F2F7FB] p-3 rounded-lg border border-[#E2EAF2]">
                    <span className="text-2xl font-bold text-[#102A43] block">
                      {sim.p90_completion_days}d
                    </span>
                    <span className="text-slate-500">P90 Risk Scenario</span>
                  </div>
                  <div className="bg-[#F2F7FB] p-3 rounded-lg border border-[#E2EAF2]">
                    <span className="text-2xl font-bold text-[#102A43] block">
                      {sim.optimistic_completion_days}d
                    </span>
                    <span className="text-slate-500">Optimistic Estimate</span>
                  </div>
                  <div className="bg-[#F2F7FB] p-3 rounded-lg border border-[#E2EAF2]">
                    <span className="text-2xl font-bold text-[#102A43] block">
                      {sim.pessimistic_completion_days}d
                    </span>
                    <span className="text-slate-500">Pessimistic Scenario</span>
                  </div>
                </div>
              </div>
            )}

            {/* Trajectory Card */}
            <div className="bg-white border border-[#E2EAF2] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    8-Week Trajectory
                  </span>
                  <h3 className="text-base font-bold text-[#102A43] m-0">
                    Scenario Trajectory Forecast
                  </h3>
                </div>
                <span className="text-lg font-bold text-emerald-600 font-mono">
                  +7.2%
                </span>
              </div>

              <svg
                width={PW}
                height={PH}
                viewBox={`0 0 ${PW} ${PH}`}
                className="w-full h-auto overflow-visible"
              >
                <defs>
                  <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D9488" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0D9488" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {[85, 90, 95, 100].map((v) => (
                  <line
                    key={v}
                    x1={pPL}
                    y1={py(v)}
                    x2={PW - pPR}
                    y2={py(v)}
                    stroke="#E2EAF2"
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
                  stroke="#102A43"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {predictions.map((d, i) => (
                  <g key={i}>
                    <circle
                      cx={px(i)}
                      cy={py(d.score)}
                      r={3.5}
                      fill="#0D9488"
                      stroke="#102A43"
                      strokeWidth={1.5}
                    />
                    <text
                      x={px(i)}
                      y={PH - 4}
                      textAnchor="middle"
                      fontSize={8}
                      fill="#64748B"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      {d.week}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Scenario Comparison Card */}
            <div className="bg-white border border-[#E2EAF2] rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-[#102A43] m-0 mb-3">
                Scenario Comparison
              </h3>
              <div className="space-y-2">
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
                      className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        active
                          ? 'border-teal-500 bg-teal-50/40'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: scenarios[s].color }}
                      />
                      <span className="flex-1 font-semibold text-slate-800">
                        {scenarios[s].label}
                      </span>
                      <span className="font-bold text-sm text-[#102A43] font-mono">
                        {avg}%
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">AVG</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
