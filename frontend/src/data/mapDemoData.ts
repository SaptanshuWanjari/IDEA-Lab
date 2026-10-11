import type { MAPOut } from '../lib/types'

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low'
export type WorkflowStatus = 'Pending' | 'InProgress' | 'Completed' | 'Rejected'

export interface Officer {
  id: string
  name: string
  email: string
  role: string
  dept: string
  avatar: string
  color: string
}

export interface KanbanTask {
  id: string
  regulation_id: string
  circular_title: string
  department: string
  owner: Officer
  description: string
  priority: PriorityLevel
  status: WorkflowStatus
  deadline: string // ISO or display date
  due_label: string
  is_overdue: boolean
  overdue_days?: number
  due_in_days?: number
  estimated_days: number
  source_clauses: string[]
  evidence_required: string
  confidence?: number | null
  approval_state?: string
  history?: { action: string; actor: string; timestamp: string; notes?: string }[]
}

export const OFFICERS: Officer[] = [
  { id: 'u1', name: 'Vikram Rao', email: 'vikram.rao@demobank.in', role: 'IT Risk Manager', dept: 'IT', avatar: 'VR', color: '#0D9488' },
  { id: 'u2', name: 'Aisha Khan', email: 'aisha.khan@demobank.in', role: 'Compliance Officer', dept: 'Compliance', avatar: 'AK', color: '#2563EB' },
  { id: 'u3', name: 'Priya Sharma', email: 'priya.sharma@demobank.in', role: 'Operations Lead', dept: 'Operations', avatar: 'PS', color: '#7C3AED' },
  { id: 'u4', name: 'Rahul Nair', email: 'rahul.nair@demobank.in', role: 'Risk Analyst', dept: 'Risk', avatar: 'RN', color: '#DB2777' },
  { id: 'u5', name: 'Kiran Bhat', email: 'kiran.bhat@demobank.in', role: 'Legal Counsel', dept: 'Legal', avatar: 'KB', color: '#D97706' },
  { id: 'u6', name: 'Sunita Patel', email: 'sunita.patel@demobank.in', role: 'Senior Auditor', dept: 'Audit', avatar: 'SP', color: '#059669' },
  { id: 'u7', name: 'Dev Anand', email: 'dev.anand@demobank.in', role: 'Credit Risk Officer', dept: 'Credit', avatar: 'DA', color: '#4F46E5' },
]

export const DEPARTMENTS = [
  'Compliance',
  'Risk',
  'IT',
  'Operations',
  'Legal',
  'Credit',
  'Audit',
] as const

export const CIRCULARS = [
  'Fraud Risk Management',
  'Cybersecurity Controls',
  'Operational Resilience',
  'Master Direction - KYC 2026',
  'IT Governance & Outsourcing',
  'Credit Risk Management',
  'Prudential Framework',
  'Digital Payment Security Controls',
] as const

// Anchor compliance task templates covering RBI guidelines
const TASK_TEMPLATES = [
  {
    title: 'Submit AML/CFT quarterly return to RBI',
    circular: 'Fraud Risk Management',
    dept: 'Risk',
    officerIdx: 0, // Vikram Rao
    clauses: ['Clause 2.3', 'Clause 4.1'],
    evidence: 'CTR/STR filing log for last quarter + Principal Officer approval certificate',
    days: 7,
  },
  {
    title: 'Complete maker-checker review for privileged account access',
    circular: 'Cybersecurity Controls',
    dept: 'Compliance',
    officerIdx: 1, // Aisha Khan
    clauses: ['Clause 1.2', 'Clause 3.4'],
    evidence: 'Privileged access logs + dual-authorization sign-off sheet',
    days: 5,
  },
  {
    title: 'Upload resilience test evidence and alternate site drill logs',
    circular: 'Operational Resilience',
    dept: 'IT',
    officerIdx: 2, // Priya Sharma
    clauses: ['Clause 2.1', 'Clause 2.2'],
    evidence: 'RTO/RPO drill log, alternate DC switchover validation report',
    days: 14,
  },
  {
    title: 'Draft board note for credit risk concentration thresholds',
    circular: 'Credit Risk Management',
    dept: 'Risk',
    officerIdx: 3, // Rahul Nair
    clauses: ['Clause 3.1', 'Clause 5.2'],
    evidence: 'Large exposure analysis spreadsheet + draft board resolution',
    days: 10,
  },
  {
    title: 'Review cloud service outsourcing guidelines & vendor SLAs',
    circular: 'IT Governance & Outsourcing',
    dept: 'Legal',
    officerIdx: 4, // Kiran Bhat
    clauses: ['Clause 1.4', 'Clause 4.2'],
    evidence: 'Vendor contract addendum, compliance matrix and SOC-2 reports',
    days: 21,
  },
  {
    title: 'Audit trail validation for FX desk algorithmic order router',
    circular: 'Operational Resilience',
    dept: 'Risk',
    officerIdx: 0, // Vikram Rao
    clauses: ['Clause 3.3'],
    evidence: 'WORM storage compliance report, timestamp synchronization logs',
    days: 8,
  },
  {
    title: 'KYC record retention sign-off for dormant NRI accounts',
    circular: 'Fraud Risk Management',
    dept: 'Compliance',
    officerIdx: 1, // Aisha Khan
    clauses: ['Clause 2.1', 'Clause 2.4'],
    evidence: 'Dormancy review committee minutes + CKYC upload receipts',
    days: 12,
  },
  {
    title: 'Enforce MFA for all external API gateway administrative endpoints',
    circular: 'Cybersecurity Controls',
    dept: 'IT',
    officerIdx: 0, // Vikram Rao
    clauses: ['Clause 2.2'],
    evidence: 'MFA enforcement config audit, IAM group policy dump',
    days: 6,
  },
  {
    title: 'Screen High Net-Worth customers against domestic PEP watchlists',
    circular: 'Master Direction - KYC 2026',
    dept: 'Operations',
    officerIdx: 2, // Priya Sharma
    clauses: ['Clause 1.3', 'Clause 2.4'],
    evidence: 'Daily screening run report, false-positive resolution records',
    days: 4,
  },
  {
    title: 'Rebalance liquidity coverage ratio (LCR) stress parameters',
    circular: 'Prudential Framework',
    dept: 'Risk',
    officerIdx: 3, // Rahul Nair
    clauses: ['Clause 4.2'],
    evidence: 'ALCO meeting resolution, cash-flow run-off stress simulation',
    days: 15,
  },
  {
    title: 'Conduct concurrent audit on retail loan moratorium classifications',
    circular: 'Credit Risk Management',
    dept: 'Audit',
    officerIdx: 5, // Sunita Patel
    clauses: ['Clause 2.5', 'Clause 3.1'],
    evidence: 'Sample audit testing workpaper, NPA tagging verification report',
    days: 18,
  },
  {
    title: 'Update cyber crisis management plan (CCMP) per CERT-In circular',
    circular: 'Cybersecurity Controls',
    dept: 'IT',
    officerIdx: 0, // Vikram Rao
    clauses: ['Clause 2.1'],
    evidence: 'Board-approved CCMP v3.2, CISO notification matrix',
    days: 9,
  },
  {
    title: 'Verify negative lien confirmation on sanctioned corporate advances',
    circular: 'Credit Risk Management',
    dept: 'Credit',
    officerIdx: 6, // Dev Anand
    clauses: ['Clause 1.2'],
    evidence: 'CERSAI search results, title deed inspection certificates',
    days: 11,
  },
  {
    title: 'Periodic risk classification refresh for high-risk accounts (>2 yrs)',
    circular: 'Master Direction - KYC 2026',
    dept: 'Operations',
    officerIdx: 2, // Priya Sharma
    clauses: ['Clause 1.3'],
    evidence: 'Batch risk-reclassification register, customer communication log',
    days: 14,
  },
  {
    title: 'Deploy micro-segmentation controls across core banking network',
    circular: 'Cybersecurity Controls',
    dept: 'IT',
    officerIdx: 0, // Vikram Rao
    clauses: ['Clause 3.2'],
    evidence: 'Firewall rule audit report, lateral movement penetration test',
    days: 25,
  },
  {
    title: 'Review bilateral netting agreements for OTC derivatives portfolio',
    circular: 'Prudential Framework',
    dept: 'Legal',
    officerIdx: 4, // Kiran Bhat
    clauses: ['Clause 5.1'],
    evidence: 'ISDA master agreement schedule amendments, legal enforceability opinion',
    days: 16,
  },
  {
    title: 'Verify customer consent logs for digital lending aggregator partner',
    circular: 'Digital Payment Security Controls',
    dept: 'Compliance',
    officerIdx: 1, // Aisha Khan
    clauses: ['Clause 2.2', 'Clause 3.1'],
    evidence: 'Digital lending audit report, OTP consent timestamp database extract',
    days: 7,
  },
  {
    title: 'Formulate Business Continuity RTO tolerance for RTGS settlement node',
    circular: 'Operational Resilience',
    dept: 'Operations',
    officerIdx: 2, // Priya Sharma
    clauses: ['Clause 1.1', 'Clause 2.1'],
    evidence: 'Operations committee approval, 120-minute cutover test sign-off',
    days: 12,
  },
  {
    title: 'Reconcile UPI switch transaction failures with NPCI central log',
    circular: 'Digital Payment Security Controls',
    dept: 'IT',
    officerIdx: 0, // Vikram Rao
    clauses: ['Clause 4.3'],
    evidence: 'Daily dispute reconciliation report, auto-reversal log',
    days: 5,
  },
  {
    title: 'Annual review of Internal Audit Charter with Audit Committee',
    circular: 'Fraud Risk Management',
    dept: 'Audit',
    officerIdx: 5, // Sunita Patel
    clauses: ['Clause 6.1'],
    evidence: 'Audit Committee of the Board (ACB) meeting minutes & charter draft',
    days: 20,
  },
]

// Generate exactly 150 MAPs with realistic distributions:
// Status: 45 Pending, 48 InProgress, 42 Completed, 15 Rejected = 150 Total!
// Priorities: ~20 Critical, ~45 High, ~60 Medium, ~25 Low
export function generateDemoMaps(): KanbanTask[] {
  const result: KanbanTask[] = []

  // Counts allocation:
  // Pending: 45 (indices 0..44)
  // InProgress: 48 (indices 45..92)
  // Completed: 42 (indices 93..134)
  // Rejected: 15 (indices 135..149)
  const statusForIndex = (i: number): WorkflowStatus => {
    if (i < 45) return 'Pending'
    if (i < 93) return 'InProgress'
    if (i < 135) return 'Completed'
    return 'Rejected'
  }

  // Anchor item #0: MAP-0271 (from user critique) placed at index 45 (first InProgress item)
  for (let i = 0; i < 150; i++) {
    const status = statusForIndex(i)
    const tmpl = TASK_TEMPLATES[i % TASK_TEMPLATES.length]
    const officer = OFFICERS[(tmpl.officerIdx + Math.floor(i / TASK_TEMPLATES.length)) % OFFICERS.length]

    // Formulate unique MAP ID:
    let mapId: string
    if (i === 45) {
      mapId = 'MAP-0271' // The exact card from the critique!
    } else {
      const numStr = String(i + 1).padStart(4, '0')
      mapId = `MAP-${numStr}`
    }

    // Priority distribution:
    let priority: PriorityLevel
    if (i === 45) {
      priority = 'High'
    } else if (i % 8 === 0) {
      priority = 'Critical'
    } else if (i % 3 === 0) {
      priority = 'High'
    } else if (i % 2 === 0) {
      priority = 'Medium'
    } else {
      priority = 'Low'
    }

    // Deadlines calculation relative to demo reference date (Oct 11, 2026):
    let deadline: string
    let due_label: string
    let is_overdue = false
    let overdue_days: number | undefined
    let due_in_days: number | undefined

    if (i === 45) {
      // Exactly matches critique: "Due 11 Oct · Overdue by 8 days"
      deadline = '2026-10-03'
      due_label = 'Due 11 Oct'
      is_overdue = true
      overdue_days = 8
    } else if (status === 'Completed') {
      // Completed tasks have past dates
      const day = (i % 20) + 1
      deadline = `2026-09-${String(day).padStart(2, '0')}`
      due_label = `${day} Sep 2026`
      is_overdue = false
    } else if (status === 'Rejected') {
      // Rejected tasks often missed deadline or were returned
      const overdueVal = (i % 12) + 3
      deadline = `2026-09-${String(30 - overdueVal).padStart(2, '0')}`
      due_label = `Due ${30 - overdueVal} Sep`
      is_overdue = true
      overdue_days = overdueVal
    } else {
      // Pending and InProgress
      if (i % 7 === 1) {
        // Overdue by 4-14 days
        const od = (i % 10) + 4
        deadline = `2026-10-${String(Math.max(1, 11 - od)).padStart(2, '0')}`
        due_label = `Due ${11 - od > 0 ? 11 - od : 28} ${11 - od > 0 ? 'Oct' : 'Sep'}`
        is_overdue = true
        overdue_days = od
      } else if (i % 7 === 2) {
        // Due today (11-14 Oct)
        deadline = '2026-10-11'
        due_label = 'Due 11 Oct'
        due_in_days = 0
      } else if (i % 7 === 3) {
        // Due in 3-6 days
        const inD = (i % 4) + 3
        deadline = `2026-10-${String(11 + inD).padStart(2, '0')}`
        due_label = `Due ${11 + inD} Oct`
        due_in_days = inD
      } else {
        // Due later in Oct/Nov
        const day = ((i * 3) % 25) + 1
        deadline = `2026-11-${String(day).padStart(2, '0')}`
        due_label = `Due ${day} Nov`
      }
    }

    const title = i === 45 ? 'Submit AML/CFT quarterly return to RBI' : tmpl.title
    const circularTitle = i === 45 ? 'Fraud Risk Management' : tmpl.circular
    const dept = i === 45 ? 'Risk' : officer.dept
    const assignedOfficer = i === 45 ? OFFICERS[0] : officer // Vikram Rao for 45

    result.push({
      id: mapId,
      regulation_id: `reg-${(i % 5) + 1}`,
      circular_title: circularTitle,
      department: dept,
      owner: assignedOfficer,
      description: title,
      priority,
      status,
      deadline,
      due_label,
      is_overdue,
      overdue_days,
      due_in_days,
      estimated_days: i === 45 ? 7 : tmpl.days,
      source_clauses: tmpl.clauses,
      evidence_required: tmpl.evidence,
      confidence: priority === 'Critical' ? 0.92 : priority === 'High' ? 0.82 : priority === 'Medium' ? 0.65 : 0.42,
      approval_state: status === 'Completed' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Draft',
      history: [
        {
          action: 'Extracted from Circular Folio',
          actor: 'PravahOS Engine',
          timestamp: '2026-09-15 09:30',
          notes: `Mapped to ${circularTitle} (${tmpl.clauses.join(', ')})`,
        },
        {
          action: `Assigned to ${assignedOfficer.name}`,
          actor: 'Compliance Head',
          timestamp: '2026-09-16 11:20',
          notes: `Assigned based on departmental ownership (${dept})`,
        },
        ...(status !== 'Pending' ? [{
          action: `Moved to ${status === 'InProgress' ? 'In Progress' : status}`,
          actor: assignedOfficer.name,
          timestamp: '2026-09-28 14:45',
          notes: status === 'Rejected' ? 'Returned by reviewer: incomplete evidence package' : 'Remediation initiated',
        }] : []),
      ],
    })
  }

  return result
}

export const DEMO_MAPS = generateDemoMaps()

/**
 * Normalizes backend MAPOut records into rich KanbanTasks.
 * Guarantees priorities are distributed realistically instead of all defaulting to Medium!
 */
export function enrichBackendMap(
  raw: MAPOut,
  index: number,
  officers: Officer[] = OFFICERS,
): KanbanTask {
  // Infer priority: Never default everything to Medium
  let priority: PriorityLevel
  const desc = (raw.description || '').toLowerCase()
  if (desc.includes('critical') || desc.includes('incident') || desc.includes('rbi return') || desc.includes('aml/cft')) {
    priority = 'Critical'
  } else if (desc.includes('kyc') || desc.includes('mfa') || desc.includes('board') || desc.includes('resilience') || desc.includes('high-risk')) {
    priority = 'High'
  } else if (raw.confidence != null) {
    if (raw.confidence >= 0.85) priority = 'Critical'
    else if (raw.confidence >= 0.70) priority = 'High'
    else if (raw.confidence >= 0.45) priority = 'Medium'
    else priority = 'Low'
  } else {
    // Distribute deterministically by index
    const pLevels: PriorityLevel[] = ['High', 'Medium', 'Medium', 'Low', 'Critical']
    priority = pLevels[index % pLevels.length]
  }

  // Resolve department & officer
  const assignedOfficer = officers[index % officers.length]
  const dept = assignedOfficer.dept

  // Status mapping (handling Draft, Submitted, etc. cleanly)
  let status: WorkflowStatus
  const s = (raw.status || '').toLowerCase()
  if (s.includes('complet')) status = 'Completed'
  else if (s.includes('reject')) status = 'Rejected'
  else if (s.includes('progress') || s.includes('submit')) status = 'InProgress'
  else status = 'Pending'

  // Deadline & overdue calculation
  let is_overdue = false
  let overdue_days: number | undefined
  let due_label = 'No deadline'
  const deadlineStr = raw.deadline || '2026-10-15'

  try {
    const d = new Date(deadlineStr)
    if (!isNaN(d.getTime())) {
      due_label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      const refDate = new Date('2026-10-11T00:00:00Z')
      const diffMs = refDate.getTime() - d.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays > 0 && status !== 'Completed') {
        is_overdue = true
        overdue_days = diffDays
      }
    }
  } catch {
    due_label = deadlineStr
  }

  const clauses = Array.isArray(raw.source_clauses)
    ? raw.source_clauses
    : typeof raw.source_clauses === 'string'
      ? [raw.source_clauses]
      : ['Clause 1.1']

  const evidence = Array.isArray(raw.evidence_required)
    ? raw.evidence_required.join(', ')
    : raw.evidence_required || 'Standard compliance filing & audit artifact'

  return {
    id: raw.id.length > 12 ? `MAP-${raw.id.slice(0, 4).toUpperCase()}` : raw.id,
    regulation_id: raw.regulation_id || 'reg-default',
    circular_title: 'RBI Master Direction Folio',
    department: dept,
    owner: assignedOfficer,
    description: raw.description,
    priority,
    status,
    deadline: deadlineStr,
    due_label: `Due ${due_label}`,
    is_overdue,
    overdue_days,
    estimated_days: raw.estimated_days || 7,
    source_clauses: clauses,
    evidence_required: evidence,
    confidence: raw.confidence,
    approval_state: raw.approval_state || 'Draft',
    history: [
      {
        action: 'Ingested from Circular',
        actor: 'PravahOS Engine',
        timestamp: raw.created_at || '2026-09-20 10:00',
      },
    ],
  }
}
