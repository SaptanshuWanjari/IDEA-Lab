import { useState, useMemo } from "react"
import { useApp } from "../App"
import {
  Card,
  SectionHead,
  StatusChip,
  KPICard,
  statusToneFor,
  EmptyState,
} from "../components/ui"
import { useApi } from "../hooks/useApi"
import { api } from "../lib/api"
import type { MAPOut, RegulationOut, SimulationResponse } from "../lib/types"

// ---------- Static fallback data matching spec exactly ----------

const AVATAR_COLORS = [
  "#0D9488",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#D97706",
  "#059669",
]

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++)
    h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface DeadlineTask {
  id: string
  task: string
  circular: string
  owner: string
  department: string
  dueDate: string
  status: "overdue" | "due-today" | "due-this-week" | "due-next-week"
  statusLabel: string
  overdueDays?: number
}

const staticDeadlines: DeadlineTask[] = [
  {
    id: "d1",
    task: "Submit AML/CFT Q2 return to RBI",
    circular: "Fraud Risk Management",
    owner: "Vikram Rao",
    department: "Risk",
    dueDate: "3 Oct 2026",
    status: "overdue",
    statusLabel: "Overdue",
    overdueDays: 8,
  },
  {
    id: "d2",
    task: "Complete maker-checker review",
    circular: "Cybersecurity Controls",
    owner: "Aisha Khan",
    department: "Compliance",
    dueDate: "14 Oct 2026",
    status: "due-today",
    statusLabel: "Due today",
  },
  {
    id: "d3",
    task: "Upload resilience test evidence",
    circular: "Operational Resilience",
    owner: "Priya Sharma",
    department: "IT",
    dueDate: "17 Oct 2026",
    status: "due-this-week",
    statusLabel: "Due in 3 days",
  },
  {
    id: "d4",
    task: "Draft board note for credit risk",
    circular: "Credit Risk Management",
    owner: "Rahul Nair",
    department: "Risk",
    dueDate: "20 Oct 2026",
    status: "due-this-week",
    statusLabel: "Due in 6 days",
  },
  {
    id: "d5",
    task: "Review outsourcing guidelines",
    circular: "IT Governance",
    owner: "Kiran Bhat",
    department: "IT",
    dueDate: "22 Oct 2026",
    status: "due-next-week",
    statusLabel: "Due in 11 days",
  },
  {
    id: "d6",
    task: "Audit trail validation for FX desk",
    circular: "Operational Resilience",
    owner: "Vikram Rao",
    department: "Risk",
    dueDate: "1 Oct 2026",
    status: "overdue",
    statusLabel: "Overdue",
    overdueDays: 10,
  },
  {
    id: "d7",
    task: "KYC record retention sign-off",
    circular: "Fraud Risk Management",
    owner: "Aisha Khan",
    department: "Compliance",
    dueDate: "28 Sep 2026",
    status: "overdue",
    statusLabel: "Overdue",
    overdueDays: 13,
  },
]

interface DeptProgress {
  department: string
  openMaps: number
  predicted: number
  target: number
  variance: number
  risk: "High" | "Medium" | "Low"
}

const staticDeptProgress: DeptProgress[] = [
  {
    department: "Information Technology",
    openMaps: 14,
    predicted: 88,
    target: 100,
    variance: -12,
    risk: "High",
  },
  {
    department: "Risk Management",
    openMaps: 11,
    predicted: 74,
    target: 100,
    variance: -26,
    risk: "Medium",
  },
  {
    department: "Operations",
    openMaps: 9,
    predicted: 65,
    target: 100,
    variance: -35,
    risk: "Medium",
  },
  {
    department: "Branch Banking",
    openMaps: 7,
    predicted: 72,
    target: 100,
    variance: -28,
    risk: "Low",
  },
  {
    department: "Legal & Compliance",
    openMaps: 5,
    predicted: 92,
    target: 100,
    variance: -8,
    risk: "Low",
  },
  {
    department: "HR",
    openMaps: 4,
    predicted: 76,
    target: 100,
    variance: -24,
    risk: "Medium",
  },
]

interface CircularRecord {
  id: string
  title: string
  type: string
  maps: number
  status: string
  uploaded: string
}

const staticCirculars: CircularRecord[] = [
  {
    id: "c1",
    title: "Master Direction — Operational Resilience",
    type: "RBI Circular",
    maps: 24,
    status: "Reviewed",
    uploaded: "28 Aug 2026",
  },
  {
    id: "c2",
    title: "Master Direction — Cybersecurity Framework",
    type: "RBI Circular",
    maps: 18,
    status: "In Progress",
    uploaded: "08 Sept 2026",
  },
  {
    id: "c3",
    title: "Guidelines on Fraud Risk Management",
    type: "Guideline",
    maps: 12,
    status: "Draft",
    uploaded: "15 Sept 2026",
  },
  {
    id: "c4",
    title: "Master Direction — Credit Risk Management",
    type: "RBI Circular",
    maps: 31,
    status: "Completed",
    uploaded: "10 Aug 2026",
  },
  {
    id: "c5",
    title: "Guidelines on MSME Lending",
    type: "Guideline",
    maps: 16,
    status: "In Progress",
    uploaded: "22 Aug 2026",
  },
]

const predictedDelays = [
  {
    item: "IT infrastructure changes",
    delay: "+18 days",
    impact: "High" as const,
  },
  {
    item: "Branch process rollout",
    delay: "+12 days",
    impact: "Medium" as const,
  },
  { item: "Regulatory reporting", delay: "+9 days", impact: "Medium" as const },
]

type DeadlineFilter = "all" | "overdue" | "due-today" | "due-this-week" | "due-next-week"
type DeptRiskFilter = "all" | "high" | "medium" | "low"

// ---------- Icons ----------
const ICONS = {
  health: (
    <svg
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  maps: (
    <svg
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  overdue: (
    <svg
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  evidence: (
    <svg
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  ),
  calendar: (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  analytics: (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  doc: (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  ),
  twin: (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" />
      <path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
    </svg>
  ),
  arrow: (
    <svg
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
}

export default function DashboardPage() {
  const { navigate } = useApp()
  const [activeFilter, setActiveFilter] = useState<DeadlineFilter>("all")
  const [activeDeptFilter, setActiveDeptFilter] =
    useState<DeptRiskFilter>("all")

  // API data
  const { data: regulations, loading } = useApi<RegulationOut[]>(
    () => api.get<RegulationOut[]>("/regulations/"),
    [],
  )
  const circulars = (regulations ?? []).slice(0, 5)
  const regIdsKey = circulars.map((r) => r.id).join(",")

  const { data: extras, loading: extrasLoading } = useApi<{
    mapsByReg: Record<string, MAPOut[]>
    simByReg: Record<string, SimulationResponse>
  }>(async () => {
    const mapsByReg: Record<string, MAPOut[]> = {}
    const simByReg: Record<string, SimulationResponse> = {}
    await Promise.all(
      circulars.map(async (reg) => {
        try {
          mapsByReg[reg.id] = await api.get<MAPOut[]>(
            `/maps/?regulation_id=${reg.id}`,
          )
        } catch {
          mapsByReg[reg.id] = []
        }
        try {
          simByReg[reg.id] = await api.get<SimulationResponse>(
            `/regulations/${reg.id}/simulate`,
          )
        } catch {
          /* no data */
        }
      }),
    )
    return { mapsByReg, simByReg }
  }, [regIdsKey])

  const mapsByReg = extras?.mapsByReg ?? {}
  const totalMaps = useMemo(
    () => Object.values(mapsByReg).reduce((n, arr) => n + arr.length, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [extras],
  )

  const stillLoading = loading || extrasLoading
  const usingDemoData = !stillLoading && circulars.length === 0

  // Deadline filtering
  const filterCounts = useMemo(
    () => ({
      all: staticDeadlines.length,
      overdue: staticDeadlines.filter((d) => d.status === "overdue").length,
      "due-today": staticDeadlines.filter((d) => d.status === "due-today")
        .length,
      "due-this-week": staticDeadlines.filter(
        (d) => d.status === "due-this-week",
      ).length,
      "due-next-week": staticDeadlines.filter(
        (d) => d.status === "due-next-week",
      ).length,
    }),
    [],
  )

  const filteredDeadlines = useMemo(() => {
    if (activeFilter === "all") return staticDeadlines.slice(0, 5)
    return staticDeadlines.filter((d) => d.status === activeFilter)
  }, [activeFilter])

  // Department progress filtering
  const deptFilterCounts = useMemo(
    () => ({
      all: staticDeptProgress.length,
      high: staticDeptProgress.filter((d) => d.risk === "High").length,
      medium: staticDeptProgress.filter((d) => d.risk === "Medium").length,
      low: staticDeptProgress.filter((d) => d.risk === "Low").length,
    }),
    [],
  )

  const filteredDepts = useMemo(() => {
    if (activeDeptFilter === "all") return staticDeptProgress
    return staticDeptProgress.filter(
      (d) => d.risk.toLowerCase() === activeDeptFilter,
    )
  }, [activeDeptFilter])

  const deptFilters: {
    key: DeptRiskFilter
    label: string
    className?: string
  }[] = [
    { key: "all", label: "All" },
    { key: "high", label: "High risk", className: "pv-filter--overdue" },
    { key: "medium", label: "Medium risk", className: "pv-filter--due-today" },
    { key: "low", label: "Low risk", className: "pv-filter--low-risk" },
  ]

  // Circular data — use live if available, else static
  const circularTableData: CircularRecord[] =
    !usingDemoData && circulars.length > 0
      ? circulars.map((r) => ({
          id: r.id,
          title: r.title ?? "(untitled)",
          type: "RBI Circular",
          maps: (mapsByReg[r.id] ?? []).length,
          status: r.status,
          uploaded: new Date(r.created_at).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        }))
      : staticCirculars

  const filters: {
    key: DeadlineFilter
    label: string
    className?: string
  }[] = [
    { key: "all", label: "All" },
    { key: "overdue", label: "Overdue", className: "pv-filter--overdue" },
    { key: "due-today", label: "Due today", className: "pv-filter--due-today" },
    { key: "due-this-week", label: "Due this week" },
    { key: "due-next-week", label: "Due next week" },
  ]

  return (
    <div className="pv-grid-dashboard" style={{ paddingBottom: 8 }}>
      {/* ===== KPI ROW ===== */}
      <div className="pv-span-3">
        <KPICard
          icon={ICONS.health}
          label="Compliance health"
          value="94%"
          trend={{ text: "+2.4 pp vs Q2 2026", positive: true }}
          progressPct={94}
          target="Target 100%"
        />
      </div>
      <div className="pv-span-3">
        <KPICard
          icon={ICONS.maps}
          label="Open MAPs"
          value="23"
          trend={{ text: "+6 vs last month", positive: false }}
          progressPct={(23 / 40) * 100}
          target="Total 40"
          onClick={() => navigate("map-tasks")}
        />
      </div>
      <div className="pv-span-3">
        <KPICard
          icon={ICONS.overdue}
          label="Overdue MAPs"
          value="14"
          trend={{ text: "+3 vs last month", positive: false }}
          progressPct={(14 / 40) * 100}
          progressVariant="critical"
          target="Total 40"
          onClick={() => navigate("map-tasks")}
        />
      </div>
      <div className="pv-span-3">
        <KPICard
          icon={ICONS.evidence}
          label="Evidence coverage"
          value="82%"
          trend={{ text: "+6 pp vs last month", positive: true }}
          progressPct={82}
          target="Target 100%"
          onClick={() => navigate("evidence")}
        />
      </div>

      {/* ===== UPCOMING DEADLINES (7 col) ===== */}
      <Card
        style={{
          gridColumn: "span 7",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SectionHead
          icon={ICONS.calendar}
          title="Upcoming deadlines"
          sub="Owner-confirmed dates across all departments."
          right={
            <button
              className="pv-btn-ghost"
              onClick={() => navigate("map-tasks")}
            >
              View all {ICONS.arrow}
            </button>
          }
        />

        {/* Filter chips */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          {filters.map((f) => (
            <button
              key={f.key}
              className={`pv-filter ${f.className || ""}`}
              data-active={activeFilter === f.key ? "true" : undefined}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
              <span className="pv-filter-count">{filterCounts[f.key]}</span>
            </button>
          ))}
        </div>

        {/* Deadline table with wrapper to guarantee no overflow */}
        <div className="pv-table-wrap" style={{ flex: 1 }}>
          <table className="pv-table">
            <thead>
              <tr>
                <th style={{ width: 28 }}>
                  <input type="checkbox" className="pv-checkbox" />
                </th>
                <th style={{ minWidth: 160 }}>Task</th>
                <th>Circular</th>
                <th>Owner</th>
                <th>Department</th>
                <th>Due date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeadlines.map((row) => (
                <tr
                  key={row.id}
                  className={
                    row.status === "overdue" ? "pv-table-row--overdue" : ""
                  }
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("map-tasks")}
                >
                  <td style={{ width: 28 }}>
                    <input
                      type="checkbox"
                      className="pv-checkbox"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 7,
                        maxWidth: 175,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--slate)",
                          display: "flex",
                          marginTop: 2,
                          flexShrink: 0,
                        }}
                      >
                        {ICONS.doc}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          lineHeight: 1.35,
                          color: "var(--ink)",
                        }}
                      >
                        {row.task}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      color: "var(--slate)",
                      fontSize: 11.5,
                      maxWidth: 130,
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.circular}
                    </span>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div
                        className="pv-avatar"
                        style={{ background: avatarColor(row.owner) }}
                      >
                        {initials(row.owner)}
                      </div>
                      <span style={{ fontSize: 11.5, color: "var(--ink)" }}>
                        {row.owner}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      fontSize: 11.5,
                      color: "var(--slate)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.department}
                  </td>
                  <td style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>
                    <div>{row.dueDate}</div>
                    {row.overdueDays ? (
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--critical)",
                          fontWeight: 700,
                          marginTop: 1,
                        }}
                      >
                        + {row.overdueDays} days
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <StatusChip
                      tone={
                        row.status === "overdue"
                          ? "bad"
                          : row.status === "due-today" ||
                              row.statusLabel.includes("3 days")
                            ? "warn"
                            : "info"
                      }
                    >
                      {row.statusLabel}
                    </StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredDeadlines.length === 0 && (
          <EmptyState
            title="No deadlines in this category"
            hint="Try a different filter."
          />
        )}
      </Card>

      {/* ===== DEPARTMENT PROGRESS & RISK (5 col) ===== */}
      <Card
        style={{
          gridColumn: "span 5",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SectionHead
          icon={ICONS.analytics}
          title="Department progress & risk"
          sub="Open MAPs, predicted completion and risk level."
          right={
            <button
              className="pv-btn-ghost"
              onClick={() => navigate("settings")}
            >
              View details {ICONS.arrow}
            </button>
          }
        />

        {/* Filter chips matching upcoming deadlines */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          {deptFilters.map((f) => (
            <button
              key={f.key}
              className={`pv-filter ${f.className || ""}`}
              data-active={activeDeptFilter === f.key ? "true" : undefined}
              onClick={() => setActiveDeptFilter(f.key)}
            >
              {f.label}
              <span className="pv-filter-count">{deptFilterCounts[f.key]}</span>
            </button>
          ))}
        </div>

        {/* Department table with matching wrapper and padding */}
        <div className="pv-table-wrap" style={{ flex: 1 }}>
          <table className="pv-table pv-table--dept">
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>Department</th>
                <th style={{ textAlign: "center" }}>Open MAPs</th>
                <th>Predicted completion</th>
                <th style={{ textAlign: "right" }}>Target</th>
                <th style={{ textAlign: "right" }}>Variance</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepts.map((dept) => (
                <tr
                  key={dept.department}
                  className={
                    dept.risk === "High" ? "pv-table-row--high-risk" : ""
                  }
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("settings")}
                >
                  <td style={{ fontWeight: 500 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        className="pv-avatar"
                        style={{
                          background: avatarColor(dept.department),
                          fontSize: 9.5,
                          width: 24,
                          height: 24,
                        }}
                      >
                        {initials(dept.department)}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--ink)",
                            lineHeight: 1.3,
                          }}
                        >
                          {dept.department}
                        </div>
                        <div
                          style={{
                            fontSize: 10.5,
                            color: "var(--slate)",
                            lineHeight: 1.2,
                          }}
                        >
                          {dept.openMaps} active tasks
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      className="pv-numeral"
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--ink)",
                      }}
                    >
                      {dept.openMaps}
                    </span>
                  </td>
                  <td>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        className="pv-progress"
                        style={{
                          width: 52,
                          height: 6,
                          borderRadius: 3,
                          flexShrink: 0,
                        }}
                      >
                        <div
                          className={`pv-progress-fill${
                            dept.risk === "High"
                              ? " pv-progress-fill--critical"
                              : dept.risk === "Medium"
                                ? " pv-progress-fill--warning"
                                : ""
                          }`}
                          style={{ width: `${dept.predicted}%` }}
                        />
                      </div>
                      <span
                        className="pv-numeral"
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: "var(--ink)",
                          minWidth: 28,
                        }}
                      >
                        {dept.predicted}%
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontSize: 11.5,
                      color: "var(--slate)",
                    }}
                  >
                    {dept.target}%
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color:
                        dept.variance < 0 ? "var(--critical)" : "var(--teal)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dept.variance} pp
                  </td>
                  <td>
                    <StatusChip
                      tone={
                        dept.risk === "High"
                          ? "bad"
                          : dept.risk === "Medium"
                            ? "warn"
                            : "ok"
                      }
                    >
                      {dept.risk}
                    </StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredDepts.length === 0 && (
          <EmptyState
            title="No departments in this risk tier"
            hint="Select another risk filter."
          />
        )}
      </Card>

      {/* ===== RECENT CIRCULARS (7 col) ===== */}
      <Card style={{ gridColumn: "span 7" }}>
        <SectionHead
          icon={ICONS.doc}
          title="Recent circulars"
          sub="Latest uploaded regulations and their progress."
          right={
            <button
              className="pv-btn-ghost"
              onClick={() => navigate("regulations")}
            >
              View all {ICONS.arrow}
            </button>
          }
        />

        <div className="pv-table-wrap">
          <table className="pv-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>MAPs</th>
                <th>Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {circularTableData.map((row) => (
                <tr
                  key={row.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("regulation-detail", row.id)}
                >
                  <td style={{ fontWeight: 500 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        maxWidth: 220,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--teal)",
                          display: "flex",
                          flexShrink: 0,
                        }}
                      >
                        {ICONS.doc}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.title}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="pv-type-pill">{row.type}</span>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {row.maps}
                  </td>
                  <td>
                    <StatusChip tone={statusToneFor(row.status)}>
                      {row.status}
                    </StatusChip>
                  </td>
                  <td
                    style={{
                      fontSize: 11.5,
                      color: "var(--slate)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.uploaded}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ===== DIGITAL COMPLIANCE TWIN (5 col) ===== */}
      <div className="pv-span-5" style={{ gridColumn: "span 5" }}>
        <div className="pv-twin-card">
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(13, 148, 136, 0.2)",
                  color: "#14B8A6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 12px rgba(13, 148, 136, 0.25)",
                }}
              >
                {ICONS.twin}
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    margin: 0,
                    color: "#fff",
                  }}
                >
                  Digital compliance twin
                </h3>
                <p
                  style={{
                    fontSize: 11.5,
                    color: "#94A3B8",
                    margin: "2px 0 0",
                  }}
                >
                  Predicts bottlenecks and estimated completion across all MAPs.
                </p>
              </div>
            </div>
            <span
              className="pv-chip pv-chip--teal"
              style={{
                background: "rgba(13, 148, 136, 0.2)",
                border: "1px solid rgba(20, 184, 166, 0.4)",
                color: "#14B8A6",
                fontSize: 10.5,
              }}
            >
              <span className="dot" style={{ background: "#14B8A6" }} />
              Live model
            </span>
          </div>

          {/* Model confidence & Horizon chips */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              <span
                className="pv-numeral"
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: "#fff",
                }}
              >
                91%
              </span>
              <div style={{ paddingBottom: 2 }}>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#CBD5E1",
                    fontWeight: 500,
                    lineHeight: 1.2,
                  }}
                >
                  Historical forecast accuracy
                </div>
                <div
                  style={{ fontSize: 10.5, color: "#64748B", lineHeight: 1.2 }}
                >
                  (last 6 months)
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 7,
                  padding: "5px 9px",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <span style={{ color: "#64748B" }}>{ICONS.calendar}</span>
                <div>
                  <div
                    style={{
                      fontSize: 9.5,
                      color: "#94A3B8",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Forecast horizon
                  </div>
                  <div
                    style={{ fontSize: 12, color: "#F1F5F9", fontWeight: 600 }}
                  >
                    8 weeks
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 7,
                  padding: "5px 9px",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <span style={{ color: "#64748B" }}>{ICONS.overdue}</span>
                <div>
                  <div
                    style={{
                      fontSize: 9.5,
                      color: "#94A3B8",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    To 8 weeks
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "#F1F5F9",
                      fontWeight: 600,
                    }}
                  >
                    11 Oct 2026, 09:30
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Path Flow Strip */}
          <div className="pv-twin-inset" style={{ marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Critical Dependency Path (Zero Slack)
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "IBM Plex Mono, monospace",
                  color: "#14B8A6",
                  fontWeight: 600,
                }}
              >
                47d Total
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                overflowX: "auto",
                padding: "2px 0",
              }}
            >
              {[
                { name: "RBI Scope", days: "5d" },
                { name: "IT Infra", days: "18d", alert: true },
                { name: "Legal", days: "14d" },
                { name: "Audit Rpt", days: "10d" },
              ].map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: "3px 7px",
                      borderRadius: 6,
                      background: step.alert
                        ? "rgba(220, 38, 38, 0.25)"
                        : "rgba(255, 255, 255, 0.08)",
                      border: step.alert
                        ? "1px solid rgba(239, 68, 68, 0.5)"
                        : "1px solid rgba(255, 255, 255, 0.12)",
                      color: step.alert ? "#FCA5A5" : "#E2E8F0",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>{step.name}</span>
                    <span style={{ fontSize: 9.5, opacity: 0.7 }}>
                      {step.days}
                    </span>
                  </span>
                  {idx < 3 && (
                    <span
                      style={{
                        color: "rgba(20, 184, 166, 0.6)",
                        fontSize: 10,
                      }}
                    >
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Top predicted delays */}
          <div className="pv-twin-inset">
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "#94A3B8",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Top predicted delays
            </div>
            {predictedDelays.map((d, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 0",
                  borderTop: i ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background:
                      d.impact === "High"
                        ? "var(--critical)"
                        : "var(--warning)",
                  }}
                />
                <span style={{ flex: 1, fontSize: 12, color: "#E2E8F0" }}>
                  {d.item}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff",
                    minWidth: 60,
                    textAlign: "right",
                  }}
                >
                  {d.delay}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 4,
                    background:
                      d.impact === "High"
                        ? "rgba(220, 38, 38, 0.18)"
                        : "rgba(217, 119, 6, 0.18)",
                    color: d.impact === "High" ? "#FCA5A5" : "#FCD34D",
                  }}
                >
                  {d.impact} impact
                </span>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 10,
              }}
            >
              <button
                className="pv-btn-primary"
                style={{
                  fontSize: 11.5,
                  padding: "5px 12px",
                  background: "rgba(13, 148, 136, 0.2)",
                  border: "1px solid rgba(20, 184, 166, 0.4)",
                  color: "#14B8A6",
                }}
                onClick={() => navigate("digital-twin")}
              >
                Open Dependency Graph & Twin {ICONS.arrow}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
