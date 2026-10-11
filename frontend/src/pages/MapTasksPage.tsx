import { useState, useMemo, useRef, useEffect } from 'react'
import {
  LayoutList,
  Kanban as KanbanIcon,
  Search,
  X,
  AlertCircle,
  Clock,
  ArrowRight,
  MoreVertical,
  Calendar,
  FileText,
  RotateCcw,
  UploadCloud,
  CheckCircle2,
  ListTodo,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import type { MAPOut } from '../lib/types'
import { Card, SectionHead, StatusChip } from '../components/ui'
import {
  DEMO_MAPS,
  DEPARTMENTS,
  OFFICERS,
  CIRCULARS,
  enrichBackendMap,
  type KanbanTask,
  type PriorityLevel,
  type WorkflowStatus,
  type Officer,
} from '../data/mapDemoData'

// Column workflow metadata
interface ColumnMeta {
  id: WorkflowStatus
  label: string
  sub: string
  dotColor: string
  borderColor: string
  bgWash: string
}

const COLUMNS: ColumnMeta[] = [
  {
    id: 'Pending',
    label: 'Pending',
    sub: 'Intake & awaiting assignment',
    dotColor: '#94A3B8',
    borderColor: '#94A3B8',
    bgWash: '#F8FAFC',
  },
  {
    id: 'InProgress',
    label: 'In Progress',
    sub: 'Active remediation underway',
    dotColor: '#3B82F6',
    borderColor: '#3B82F6',
    bgWash: '#F8FAFC',
  },
  {
    id: 'Completed',
    label: 'Completed',
    sub: 'Evidence verified & sign-off',
    dotColor: '#0D9488',
    borderColor: '#0D9488',
    bgWash: '#F8FAFC',
  },
  {
    id: 'Rejected',
    label: 'Rejected',
    sub: 'Returned for revision / rejected',
    dotColor: '#EF4444',
    borderColor: '#EF4444',
    bgWash: '#F8FAFC',
  },
]

// Priority badge rendering
function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  switch (priority) {
    case 'Critical':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
          Critical
        </span>
      )
    case 'High':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-red-50 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          High
        </span>
      )
    case 'Medium':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          Medium
        </span>
      )
    case 'Low':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
          Low
        </span>
      )
  }
}

// Error banner component
function ErrorBanner({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs font-medium text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{msg}</span>
      </div>
      <button
        onClick={onRetry}
        className="px-3 py-1 rounded-md border border-red-300 bg-white hover:bg-red-100/50 text-red-700 text-xs font-semibold transition-colors cursor-pointer"
      >
        Retry
      </button>
    </div>
  )
}

// Task Detail Drawer
function TaskDetailDrawer({
  task,
  onClose,
  onTransition,
  onReassign,
  onOpenReview,
  onOpenEvidence,
}: {
  task: KanbanTask | null
  onClose: () => void
  onTransition: (taskId: string, targetStatus: WorkflowStatus, reason?: string) => void
  onReassign: (taskId: string, officer: Officer) => void
  onOpenReview: (taskId: string) => void
  onOpenEvidence: (taskId: string) => void
}) {
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectBox, setShowRejectBox] = useState(false)

  if (!task) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-[#E2EAF2] z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4.5 border-b border-[#E2EAF2] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {task.id}
            </span>
            <PriorityBadge priority={task.priority} />
            <StatusChip tone={task.status === 'Completed' ? 'ok' : task.status === 'Rejected' ? 'bad' : task.status === 'InProgress' ? 'info' : 'neutral'}>
              {task.status === 'InProgress' ? 'In Progress' : task.status}
            </StatusChip>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 pv-kanban-scroll">
          {/* Title & Circular */}
          <div>
            <div className="text-xs font-semibold text-[#0D9488] mb-1.5 flex items-center gap-1.5">
              <span>{task.circular_title}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500 font-normal">{task.department} Department</span>
            </div>
            <h2 className="text-[17px] font-bold text-[#102A43] leading-snug m-0">
              {task.description}
            </h2>
          </div>

          {/* Quick Metadata Grid */}
          <div className="grid grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2EAF2]">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Owner
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: task.owner.color }}
                >
                  {task.owner.avatar}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 m-0 leading-tight">
                    {task.owner.name}
                  </p>
                  <p className="text-[10.5px] text-slate-500 m-0">
                    {task.owner.role}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Deadline & Effort
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium">{task.due_label}</span>
                {task.is_overdue && (
                  <span className="text-[10.5px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 rounded">
                    +{task.overdue_days}d overdue
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                {task.estimated_days} days estimated effort
              </div>
            </div>
          </div>

          {/* Source Clauses */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0D9488]" />
              Regulatory Clauses
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {task.source_clauses.map((clause, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {clause}
                </span>
              ))}
            </div>
          </div>

          {/* Evidence Required */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider m-0 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488]" />
                Required Evidence
              </h4>
              <button
                onClick={() => onOpenEvidence(task.id)}
                className="text-xs font-semibold text-[#0D9488] hover:text-[#0b7e73] inline-flex items-center gap-1 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload in Vault
              </button>
            </div>
            <div className="p-3 rounded-lg bg-teal-50/40 border border-teal-100 text-xs text-slate-700 leading-relaxed">
              {task.evidence_required}
            </div>
          </div>

          {/* Quick Reassign Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Reassign Officer
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {OFFICERS.slice(0, 4).map(officer => (
                <button
                  key={officer.id}
                  onClick={() => onReassign(task.id, officer)}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    task.owner.id === officer.id
                      ? 'border-[#0D9488] bg-teal-50/50 ring-1 ring-[#0D9488]'
                      : 'border-[#E2EAF2] hover:bg-slate-50'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: officer.color }}
                  >
                    {officer.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 m-0 truncate">
                      {officer.name}
                    </p>
                    <p className="text-[10px] text-slate-400 m-0 truncate">
                      {officer.dept}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Workflow Action Buttons */}
          <div className="pt-2 border-t border-[#E2EAF2]">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Workflow Status Actions
            </h4>

            <div className="flex flex-wrap gap-2">
              {task.status !== 'InProgress' && (
                <button
                  onClick={() => onTransition(task.id, 'InProgress')}
                  className="px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Move to In Progress</span>
                </button>
              )}

              {task.status !== 'Completed' && (
                <button
                  onClick={() => onTransition(task.id, 'Completed')}
                  className="px-3.5 py-2 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark as Completed</span>
                </button>
              )}

              {task.status !== 'Pending' && (
                <button
                  onClick={() => onTransition(task.id, 'Pending')}
                  className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Return to Pending</span>
                </button>
              )}

              {task.status !== 'Rejected' && (
                <button
                  onClick={() => setShowRejectBox(!showRejectBox)}
                  className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Return for Revision / Reject</span>
                </button>
              )}
            </div>

            {/* Rejection justification prompt */}
            {showRejectBox && (
              <div className="mt-3 p-3 rounded-lg bg-red-50/70 border border-red-200">
                <label className="block text-[11px] font-semibold text-red-800 mb-1">
                  Reason for Revision / Rejection (Maker-Checker Audit)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain required corrections or missing compliance evidence..."
                  rows={2}
                  className="w-full text-xs p-2 rounded border border-red-300 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-red-400"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setShowRejectBox(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onTransition(task.id, 'Rejected', rejectReason || 'Returned for revision')
                      setShowRejectBox(false)
                      setRejectReason('')
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded cursor-pointer transition-colors"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Audit History */}
          <div className="pt-2 border-t border-[#E2EAF2]">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Activity & Audit Trail
            </h4>
            <div className="space-y-2.5">
              {task.history?.map((event, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0D9488] mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 m-0">
                      {event.action}
                    </p>
                    {event.notes && (
                      <p className="text-slate-500 text-[11.5px] m-0 mt-0.5">
                        {event.notes}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 font-mono m-0 mt-0.5">
                      {event.actor} · {event.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-3.5 border-t border-[#E2EAF2] bg-[#F8FAFC] flex items-center justify-between shrink-0">
          <button
            onClick={() => onOpenReview(task.id)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D9488] hover:text-[#0b7e73] transition-colors cursor-pointer"
          >
            <span>Open Full Maker-Checker Review</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#E2EAF2] bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Rejection / Confirmation Modal for Drag-and-Drop
function ReasonModal({
  isOpen,
  title,
  subtitle,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  title: string
  subtitle: string
  confirmLabel: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#E2EAF2] p-5 z-10 animate-in zoom-in-95 duration-150">
        <h3 className="text-sm font-bold text-[#102A43] m-0 mb-1">{title}</h3>
        <p className="text-xs text-slate-500 m-0 mb-3.5">{subtitle}</p>

        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="State reason or rationale for audit trail..."
          rows={3}
          className="w-full text-xs p-2.5 rounded-lg border border-[#CBD5E1] bg-slate-50 focus:bg-white focus:border-[#0D9488] outline-none transition-colors"
          autoFocus
        />

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg border border-[#E2EAF2] text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(reason)
              setReason('')
            }}
            className="px-4 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-xs font-semibold cursor-pointer shadow-xs"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// Kanban Card Component
function KanbanCard({
  task,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
  onQuickTransition,
  onOpenReview,
}: {
  task: KanbanTask
  isDragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: (e: React.DragEvent) => void
  onClick: () => void
  onQuickTransition: (status: WorkflowStatus) => void
  onOpenReview: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`pv-kanban-card group relative bg-white rounded-lg border border-[#E2EAF2] p-3 cursor-pointer shadow-xs select-none ${
        isDragging ? 'is-dragging' : ''
      }`}
    >
      {/* Top row: Task ID + Priority Badge + Ellipsis Menu */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[11px] font-semibold text-slate-500 tracking-tight">
          {task.id}
        </span>
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={task.priority} />

          {/* Ellipsis Action Menu */}
          <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Card actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-6 w-44 bg-white rounded-lg shadow-lg border border-[#E2EAF2] py-1 z-30 text-xs font-medium text-slate-700 animate-in fade-in-50 zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onClick()
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>View Details</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenReview()
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-[#0D9488] cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Review Queue</span>
                </button>

                <div className="my-1 border-t border-slate-100" />
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400">
                  Move to
                </div>

                {task.status !== 'Pending' && (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onQuickTransition('Pending')
                    }}
                    className="w-full px-3 py-1 text-left hover:bg-slate-50 text-slate-600 cursor-pointer"
                  >
                    Pending
                  </button>
                )}
                {task.status !== 'InProgress' && (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onQuickTransition('InProgress')
                    }}
                    className="w-full px-3 py-1 text-left hover:bg-slate-50 text-blue-600 cursor-pointer"
                  >
                    In Progress
                  </button>
                )}
                {task.status !== 'Completed' && (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onQuickTransition('Completed')
                    }}
                    className="w-full px-3 py-1 text-left hover:bg-slate-50 text-[#0D9488] cursor-pointer"
                  >
                    Completed
                  </button>
                )}
                {task.status !== 'Rejected' && (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onQuickTransition('Rejected')
                    }}
                    className="w-full px-3 py-1 text-left hover:bg-slate-50 text-red-600 cursor-pointer"
                  >
                    Rejected / Revision
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Title (strongest visual weight) */}
      <h3 className="text-[13px] font-semibold text-[#102A43] m-0 mb-1 leading-snug line-clamp-2 group-hover:text-[#0D9488] transition-colors">
        {task.description}
      </h3>

      {/* Associated Circular / Department (secondary text) */}
      <p className="text-[11px] text-slate-500 m-0 mb-2 truncate">
        {task.circular_title}
      </p>

      {/* Owner & Deadline Row */}
      <div className="flex items-center justify-between text-xs pt-1">
        {/* Owner with avatar and short name */}
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 shadow-2xs"
            style={{ backgroundColor: task.owner.color }}
            title={`${task.owner.name} (${task.owner.role})`}
          >
            {task.owner.avatar}
          </div>
          <span className="text-[11.5px] font-medium text-slate-700 truncate max-w-[85px]">
            {task.owner.name}
          </span>
        </div>

        {/* Deadline and Overdue status */}
        <div className="flex items-center gap-1 shrink-0">
          {task.is_overdue ? (
            <span
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded"
              title={`Due ${task.due_label} — Overdue by ${task.overdue_days} days`}
            >
              <Clock className="w-3 h-3 text-red-500 shrink-0" />
              <span>Overdue {task.overdue_days}d</span>
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{task.due_label}</span>
            </span>
          )}
        </div>
      </div>

      {/* Quiet Footer: Estimated Effort */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 mt-2 border-t border-slate-100">
        <span>{task.estimated_days} days estimated effort</span>
        <span className="text-slate-300 group-hover:text-[#0D9488] transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  )
}

// Main Page Component
export default function MapTasksPage() {
  const { navigate, selectedId } = useApp()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOwner, setSelectedOwner] = useState<string>('All')
  const [selectedPriority, setSelectedPriority] = useState<string>('All')
  const [selectedDept, setSelectedDept] = useState<string>('All')
  const [selectedDeadline, setSelectedDeadline] = useState<'All' | 'Overdue' | 'DueSoon'>('All')
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'effort' | 'id'>('deadline')

  // Interactive Drag & Drop / Selection State
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<WorkflowStatus | null>(null)
  const [activeDrawerTask, setActiveDrawerTask] = useState<KanbanTask | null>(null)

  // Reason modal state (for drag into Rejected)
  const [reasonModal, setReasonModal] = useState<{
    isOpen: boolean
    taskId: string
    targetStatus: WorkflowStatus
  }>({ isOpen: false, taskId: '', targetStatus: 'Pending' })

  // Backend API query
  const { data: apiMaps, loading, error, refetch } = useApi<MAPOut[]>(
    () => {
      const qs = selectedId ? `?regulation_id=${selectedId}` : ''
      return api.get<MAPOut[]>(`/maps/${qs}`)
    },
    [selectedId],
  )

  // Initialize and synchronize task dataset
  useEffect(() => {
    if (apiMaps && apiMaps.length > 0) {
      // Enrich backend MAP records
      const enriched = apiMaps.map((m, idx) => enrichBackendMap(m, idx, OFFICERS))
      setTasks(enriched)
    } else {
      // Fallback to rich 150-task demo dataset
      let initial = DEMO_MAPS
      if (selectedId) {
        // Scope to selected circular if applicable
        initial = DEMO_MAPS.filter(t => t.regulation_id === selectedId || t.circular_title.toLowerCase().includes(selectedId.toLowerCase()))
        if (initial.length === 0) initial = DEMO_MAPS.slice(0, 30)
      }
      setTasks(initial)
    }
  }, [apiMaps, selectedId])

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Text search: matches ID, title, circular, or owner
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          task.id.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q) ||
          task.circular_title.toLowerCase().includes(q) ||
          task.owner.name.toLowerCase().includes(q) ||
          task.department.toLowerCase().includes(q)
        if (!match) return false
      }

      // Owner filter
      if (selectedOwner !== 'All' && task.owner.name !== selectedOwner) {
        return false
      }

      // Priority filter
      if (selectedPriority !== 'All' && task.priority !== selectedPriority) {
        return false
      }

      // Department filter
      if (selectedDept !== 'All' && task.department !== selectedDept) {
        return false
      }

      // Deadline filter
      if (selectedDeadline === 'Overdue' && !task.is_overdue) {
        return false
      }
      if (selectedDeadline === 'DueSoon' && !(task.due_in_days != null && task.due_in_days <= 7)) {
        return false
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'deadline') {
        if (a.is_overdue && !b.is_overdue) return -1
        if (!a.is_overdue && b.is_overdue) return 1
        return (b.overdue_days || 0) - (a.overdue_days || 0)
      }
      if (sortBy === 'priority') {
        const pOrder: Record<PriorityLevel, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
        return pOrder[b.priority] - pOrder[a.priority]
      }
      if (sortBy === 'effort') {
        return b.estimated_days - a.estimated_days
      }
      return a.id.localeCompare(b.id)
    })
  }, [tasks, searchQuery, selectedOwner, selectedPriority, selectedDept, selectedDeadline, sortBy])

  // Clear filters
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedOwner !== 'All' ||
    selectedPriority !== 'All' ||
    selectedDept !== 'All' ||
    selectedDeadline !== 'All'

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedOwner('All')
    setSelectedPriority('All')
    setSelectedDept('All')
    setSelectedDeadline('All')
  }

  // Handle Drag & Drop status transition
  const handleDragStart = (taskId: string, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', taskId)
    setDraggingTaskId(taskId)
  }

  const handleDragEnd = () => {
    setDraggingTaskId(null)
    setDragOverCol(null)
  }

  const handleDrop = (targetCol: WorkflowStatus) => {
    if (!draggingTaskId) return

    const task = tasks.find(t => t.id === draggingTaskId)
    if (!task || task.status === targetCol) {
      setDraggingTaskId(null)
      setDragOverCol(null)
      return
    }

    // If moving to Rejected: Prompt for maker-checker justification
    if (targetCol === 'Rejected') {
      setReasonModal({
        isOpen: true,
        taskId: draggingTaskId,
        targetStatus: 'Rejected',
      })
      setDraggingTaskId(null)
      setDragOverCol(null)
      return
    }

    // Direct transition for other statuses
    updateTaskStatus(draggingTaskId, targetCol)
    setDraggingTaskId(null)
    setDragOverCol(null)
  }

  // Update task status in local state
  const updateTaskStatus = (taskId: string, targetStatus: WorkflowStatus, reason?: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          const updatedHistory = [
            ...(t.history || []),
            {
              action: `Transitioned to ${targetStatus === 'InProgress' ? 'In Progress' : targetStatus}`,
              actor: 'Compliance Officer (You)',
              timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              notes: reason || undefined,
            },
          ]
          return {
            ...t,
            status: targetStatus,
            is_overdue: targetStatus === 'Completed' ? false : t.is_overdue,
            history: updatedHistory,
          }
        }
        return t
      }),
    )

    // Also update active drawer if open
    if (activeDrawerTask && activeDrawerTask.id === taskId) {
      setActiveDrawerTask(prev => prev ? { ...prev, status: targetStatus } : null)
    }
  }

  // Reassign task owner
  const handleReassign = (taskId: string, newOfficer: Officer) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          const updatedHistory = [
            ...(t.history || []),
            {
              action: `Reassigned to ${newOfficer.name}`,
              actor: 'Compliance Officer (You)',
              timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            },
          ]
          return {
            ...t,
            owner: newOfficer,
            department: newOfficer.dept,
            history: updatedHistory,
          }
        }
        return t
      }),
    )

    if (activeDrawerTask && activeDrawerTask.id === taskId) {
      setActiveDrawerTask(prev =>
        prev
          ? {
              ...prev,
              owner: newOfficer,
              department: newOfficer.dept,
            }
          : null,
      )
    }
  }

  // Badge count calculation: accurately reflects filtered vs total
  const badgeLabel = hasActiveFilters
    ? `Showing ${filteredTasks.length} of ${tasks.length} MAPs`
    : `${tasks.length} MAPs`

  return (
    <div className="w-full">
      <Card pad={true}>
        {/* Section Header */}
        <SectionHead
          eyebrow="ACTION REGISTER"
          title="MAP tasks"
          badge={badgeLabel}
          sub={
            selectedId
              ? `Scoped to circular folio ${selectedId.slice(0, 12)}… · Owners and due dates`
              : 'Measurable Action Points · Owners, due dates, and maker–checker workflow.'
          }
          right={
            <div className="inline-flex items-center gap-1 bg-[#F1F5F9] border border-[#E2EAF2] rounded-lg p-1">
              <button
                type="button"
                onClick={() => setView('kanban')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  view === 'kanban'
                    ? 'bg-[#0D9488] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KanbanIcon className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  view === 'list'
                    ? 'bg-[#0D9488] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>
          }
        />

        {error && <ErrorBanner msg={error} onRetry={refetch} />}

        {/* Task Filtering Toolbar */}
        <div className="bg-[#F8FAFC] border border-[#E2EAF2] rounded-xl p-3 mb-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter tasks, ID, circular..."
              className="pv-input w-full pl-8.5 pr-7 h-8.5 text-xs bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="h-8.5 px-2.5 bg-white border border-[#E2EAF2] rounded-lg text-slate-700 text-xs font-medium outline-none focus:border-[#0D9488] cursor-pointer"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="h-8.5 px-2.5 bg-white border border-[#E2EAF2] rounded-lg text-slate-700 text-xs font-medium outline-none focus:border-[#0D9488] cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Owner Filter */}
            <select
              value={selectedOwner}
              onChange={e => setSelectedOwner(e.target.value)}
              className="h-8.5 px-2.5 bg-white border border-[#E2EAF2] rounded-lg text-slate-700 text-xs font-medium outline-none focus:border-[#0D9488] cursor-pointer"
            >
              <option value="All">All Owners</option>
              {OFFICERS.map(o => (
                <option key={o.id} value={o.name}>
                  {o.name} ({o.avatar})
                </option>
              ))}
            </select>

            {/* Deadline / Overdue Filter */}
            <select
              value={selectedDeadline}
              onChange={e => setSelectedDeadline(e.target.value as 'All' | 'Overdue' | 'DueSoon')}
              className="h-8.5 px-2.5 bg-white border border-[#E2EAF2] rounded-lg text-slate-700 text-xs font-medium outline-none focus:border-[#0D9488] cursor-pointer"
            >
              <option value="All">All Deadlines</option>
              <option value="Overdue">Overdue Only</option>
              <option value="DueSoon">Due Within 7 Days</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'deadline' | 'priority' | 'effort' | 'id')}
              className="h-8.5 px-2.5 bg-white border border-[#E2EAF2] rounded-lg text-slate-700 text-xs font-medium outline-none focus:border-[#0D9488] cursor-pointer"
            >
              <option value="deadline">Sort: Deadline</option>
              <option value="priority">Sort: Priority</option>
              <option value="effort">Sort: Est. Days</option>
              <option value="id">Sort: Task ID</option>
            </select>

            {/* Clear Filters Action */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="h-8.5 px-2.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2.5 py-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 bg-[#F1F5F9] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : view === 'kanban' ? (
          /* Kanban Board Layout with Defined Vertical Workspace */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {COLUMNS.map(col => {
              const colTasks = filteredTasks.filter(t => t.status === col.id)
              const totalColTasks = tasks.filter(t => t.status === col.id).length
              const isOver = dragOverCol === col.id

              return (
                <div
                  key={col.id}
                  onDragOver={e => {
                    e.preventDefault()
                    if (dragOverCol !== col.id) setDragOverCol(col.id)
                  }}
                  onDragLeave={() => {
                    if (dragOverCol === col.id) setDragOverCol(null)
                  }}
                  onDrop={() => handleDrop(col.id)}
                  className={`pv-kanban-column bg-[#F8FAFC] rounded-xl border border-[#E2EAF2] flex flex-col h-[calc(100vh-270px)] min-h-[480px] ${
                    isOver ? 'is-drag-over' : ''
                  }`}
                  style={{
                    borderTop: `3px solid ${col.borderColor}`,
                  }}
                >
                  {/* Column Header */}
                  <div className="p-3 pb-2.5 border-b border-[#E2EAF2] bg-white rounded-t-[9px] shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: col.dotColor }}
                        />
                        <h3 className="text-[13.5px] font-bold text-[#102A43] m-0">
                          {col.label}
                        </h3>
                      </div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {hasActiveFilters ? `${colTasks.length}/${totalColTasks}` : colTasks.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 m-0 leading-tight">
                      {col.sub}
                    </p>
                  </div>

                  {/* Independent Scrollable Task Cards Container */}
                  <div className="pv-kanban-scroll flex-1 overflow-y-auto p-2.5 space-y-2.5">
                    {colTasks.map(task => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        isDragging={draggingTaskId === task.id}
                        onDragStart={e => handleDragStart(task.id, e)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setActiveDrawerTask(task)}
                        onQuickTransition={target => updateTaskStatus(task.id, target)}
                        onOpenReview={() => navigate('map-review', task.id)}
                      />
                    ))}

                    {colTasks.length === 0 && (
                      <div className="h-36 border-2 border-dashed border-[#E2EAF2] rounded-lg flex flex-col items-center justify-center p-4 text-center">
                        <p className="text-xs font-semibold text-slate-400 m-0">
                          No tasks in {col.label}
                        </p>
                        <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                          Drag cards here to update status
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* List View (Table Layout with Full Metadata) */
          filteredTasks.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<ListTodo className="w-6 h-6 text-slate-400" />}
                title="No MAP tasks match your filters"
                hint="Try resetting your search query or department filters."
              />
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2EAF2] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-3">MAP ID</th>
                    <th className="pb-3 pr-4">Task Description & Folio</th>
                    <th className="pb-3 pr-4">Owner</th>
                    <th className="pb-3 pr-3">Department</th>
                    <th className="pb-3 pr-3">Priority</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3 pr-3">Deadline</th>
                    <th className="pb-3 pr-3">Est. Days</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map(task => (
                    <tr
                      key={task.id}
                      onClick={() => setActiveDrawerTask(task)}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 pr-3 text-[12px] font-mono font-semibold text-slate-600 whitespace-nowrap">
                        {task.id}
                      </td>
                      <td className="py-3.5 pr-4 max-w-sm">
                        <p className="text-[13.5px] font-semibold text-[#102A43] m-0 leading-snug group-hover:text-[#0D9488] transition-colors line-clamp-1">
                          {task.description}
                        </p>
                        <p className="text-[11px] text-slate-500 m-0 mt-0.5 truncate">
                          {task.circular_title}
                        </p>
                      </td>
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                            style={{ backgroundColor: task.owner.color }}
                          >
                            {task.owner.avatar}
                          </div>
                          <span className="text-xs font-medium text-slate-700">
                            {task.owner.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-3 text-xs text-slate-600 font-medium whitespace-nowrap">
                        {task.department}
                      </td>
                      <td className="py-3.5 pr-3 whitespace-nowrap">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="py-3.5 pr-3 whitespace-nowrap">
                        <StatusChip
                          tone={
                            task.status === 'Completed'
                              ? 'ok'
                              : task.status === 'Rejected'
                              ? 'bad'
                              : task.status === 'InProgress'
                              ? 'info'
                              : 'neutral'
                          }
                        >
                          {task.status === 'InProgress' ? 'In Progress' : task.status}
                        </StatusChip>
                      </td>
                      <td className="py-3.5 pr-3 whitespace-nowrap">
                        {task.is_overdue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                            <Clock className="w-3 h-3" />
                            Overdue {task.overdue_days}d
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-slate-600">
                            {task.due_label}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pr-3 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {task.estimated_days}d
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            navigate('map-review', task.id)
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:text-[#0b7e73] hover:bg-teal-50 px-2.5 py-1 rounded transition-colors cursor-pointer"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>

      {/* Slide-out Task Detail Drawer */}
      <TaskDetailDrawer
        task={activeDrawerTask}
        onClose={() => setActiveDrawerTask(null)}
        onTransition={(id, status, reason) => updateTaskStatus(id, status, reason)}
        onReassign={(id, officer) => handleReassign(id, officer)}
        onOpenReview={id => {
          setActiveDrawerTask(null)
          navigate('map-review', id)
        }}
        onOpenEvidence={id => {
          setActiveDrawerTask(null)
          navigate('evidence')
        }}
      />

      {/* Confirmation / Reason Modal for sensitive state changes */}
      <ReasonModal
        isOpen={reasonModal.isOpen}
        title="Maker–Checker Rejection Justification"
        subtitle="Moving this MAP to Rejected/Revision returns it to the assignee. Provide an audit reason for the register."
        confirmLabel="Confirm Rejection"
        onConfirm={reason => {
          updateTaskStatus(reasonModal.taskId, 'Rejected', reason || 'Returned for revision')
          setReasonModal({ isOpen: false, taskId: '', targetStatus: 'Pending' })
        }}
        onCancel={() =>
          setReasonModal({ isOpen: false, taskId: '', targetStatus: 'Pending' })
        }
      />
    </div>
  )
}
