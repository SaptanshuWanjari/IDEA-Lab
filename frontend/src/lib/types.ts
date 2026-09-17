export interface UserOut {
  id: string
  email: string
  role: string
}

export interface RegulationOut {
  id: string
  title: string | null
  source_pdf_url: string
  status: string
  summary: string | null
  created_at: string
}

export interface MAPOut {
  id: string
  regulation_id: string
  owner_department_id: string | null
  description: string
  deadline: string | null
  status: string
  approval_state: string | null
  confidence: number | null
  reasoning: string | null
  source_clauses: string[] | null
  evidence_required: string[] | null
  estimated_days: number | null
  created_at: string
}

export interface GraphNode {
  id: string
  label: string
  status: string
  department: string | null
}

export interface GraphEdge {
  source: string
  target: string
}

export interface GraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
  critical_path: string[]
  topological_order: string[]
}

export interface SimulationResponse {
  median_completion_days: number
  p90_completion_days: number
  optimistic_completion_days: number
  pessimistic_completion_days: number
  iterations: number
  bottleneck_department: string | null
  bottleneck_frequency_pct: number | null
  department_workloads: Record<string, number>
}

export interface ReportOut {
  regulation_id: string
  title: string
  status: string
  summary: string | null
  effective_date: string | null
  maps: MAPOut[]
  completed_count: number
  total_count: number
  generated_at: string
}

export interface MAPReviewAction {
  action: 'approve' | 'edit' | 'reject'
  description?: string
  owner_department_id?: string
  deadline?: string
}

export interface IngestResponse {
  status: string
  document_class: string
  clause_count: number
}

export interface CompletenessResult {
  map: MAPOut
  completeness_check: Record<string, unknown>
  functional_coverage: Record<string, unknown>
  integrity_checks: Record<string, unknown>
}
