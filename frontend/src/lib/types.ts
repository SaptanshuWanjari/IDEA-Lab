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
  // Task 12: scenario-estimate safeguards (present on /simulate).
  label?: string | null
  calibrated?: boolean | null
  seed?: number | null
  input_snapshot_id?: string | null
  data_completeness?: number | null
  data_quality_notes?: string[] | null
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

// --- Single-bank pilot review workflows (Tasks 7-10 backends) ---

export interface ObligationOut {
  id: string
  regulation_version_id: string
  clause_id: string
  quote: string
  page: number | null
  obligation_text: string
  deadline_kind: string | null
  deadline_value: number | null
  deadline_unit: string | null
  deadline_anchor: string | null
  owner_hint: string | null
  status: string
  reviewer_rationale: string | null
}

export interface ObligationValidation {
  valid: boolean
  errors: string[]
  quality: 'high' | 'medium' | 'low'
}

export interface MAPPlanOut {
  id: string
  regulation_version_id: string
  version_number: number
  status: string
  bank_id: string | null
  legal_entity_id: string | null
  created_by: string | null
  approved_by: string | null
  rationale: string | null
  owner_department_id: string | null
  due_date_basis: string | null
}

export interface PlanDiffOut {
  previous_id: string
  candidate_id: string
  added: string[]
  removed: string[]
  unchanged: string[]
}

export type EvidenceReviewState =
  | 'file-submitted'
  | 'needs-review'
  | 'approved'
  | 'rejected'
  | 'exception-active'
  | 'completed'

export interface AssessmentDraftOut {
  evidence_id: string
  decision: string
  checklist_results: Record<string, { key: string; passed: boolean; required: boolean; support?: string | null; missing_terms: string[] }>
  missing_elements: string[]
  advisory_only: boolean
  note: string | null
}

export interface AssessmentOut {
  id: string
  evidence_id: string
  map_id: string | null
  decision: string
  assessor_id: string | null
  submitter_id: string | null
  rationale: string | null
  bank_id: string | null
  legal_entity_id: string | null
  created_at: string
}

export interface ReportSnapshotOut {
  id: string
  regulation_version_id: string
  plan_id: string
  data_cutoff: string | null
  created_by: string
  created_at: string | null
  payload: Record<string, unknown>
}

/** Roles permitted to take reviewer/approver actions in the pilot UI. */
export const REVIEWER_ROLES = ['admin', 'compliance_officer', 'reviewer']

export function canReviewRole(role: string | null | undefined): boolean {
  if (!role) return false
  return REVIEWER_ROLES.includes(role)
}
