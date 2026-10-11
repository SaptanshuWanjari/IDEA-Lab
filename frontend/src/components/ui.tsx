import type { CSSProperties, ReactNode } from "react"
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Inbox,
} from "lucide-react"

export function Card({
  children,
  style,
  pad = true,
  className = "",
}: {
  children: ReactNode
  style?: CSSProperties
  pad?: boolean
  className?: string
}) {
  return (
    <section
      className={`pv-card bg-white rounded-xl border border-[#E2EAF2] shadow-sm min-w-0 ${
        pad ? "p-5 sm:p-6 pv-card-pad" : ""
      } ${className}`}
      style={style}
    >
      {children}
    </section>
  )
}

export function SectionHead({
  eyebrow,
  icon,
  title,
  sub,
  badge,
  right,
  className = "",
}: {
  eyebrow?: ReactNode
  icon?: ReactNode
  title: ReactNode
  sub?: ReactNode
  badge?: ReactNode
  right?: ReactNode
  className?: string
}) {
  const cleanEyebrow =
    typeof eyebrow === "string" ? eyebrow.replace(/^§\s*/, "").trim() : eyebrow

  return (
    <div
      className={`pv-section-head flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5 sm:mb-6 ${className}`}
    >
      {/* Left group: eyebrow, title with optional badge, and description */}
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center shrink-0 mt-0.5 border border-teal-100">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {cleanEyebrow && (
            <div className="pv-eyebrow text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {cleanEyebrow}
            </div>
          )}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="pv-h2 text-[18px] sm:text-[20px] font-semibold text-[#102A43] tracking-tight leading-tight m-0">
              {title}
            </h2>
            {badge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                {badge}
              </span>
            )}
          </div>
          {sub && (
            <div className="pv-sub text-[13px] text-slate-500 mt-1.5 leading-normal">
              {sub}
            </div>
          )}
        </div>
      </div>

      {/* Right group: controls and primary actions */}
      {right && (
        <div className="shrink-0 flex items-center gap-2.5 flex-wrap self-start sm:self-center">
          {right}
        </div>
      )}
    </div>
  )
}

// Legacy compat — redirects to SectionHead
export function Eyebrow({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      className="pv-eyebrow text-[11px] font-semibold uppercase tracking-wider text-slate-500"
      style={style}
    >
      {children}
    </div>
  )
}

export type ChipTone = "ok" | "bad" | "warn" | "navy" | "brass" | "neutral" | "info" | "teal"

interface ToneStyle {
  wrap: string
  dot: string
}

export function StatusChip({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: ChipTone
  children: ReactNode
  className?: string
}) {
  const toneClasses: Record<ChipTone, ToneStyle> = {
    ok: {
      wrap: "bg-teal-50 text-teal-700 border-teal-200",
      dot: "bg-teal-500",
    },
    bad: { wrap: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
    warn: {
      wrap: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    },
    info: {
      wrap: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
    },
    teal: {
      wrap: "bg-teal-50 text-teal-700 border-teal-200",
      dot: "bg-teal-500",
    },
    brass: {
      wrap: "bg-teal-50 text-teal-700 border-teal-200",
      dot: "bg-teal-500",
    },
    navy: {
      wrap: "bg-slate-100 text-[#102A43] border-slate-200",
      dot: "bg-[#102A43]",
    },
    neutral: {
      wrap: "bg-slate-100 text-slate-600 border-slate-200",
      dot: "bg-slate-400",
    },
  }

  const { wrap, dot } = toneClasses[tone] ?? toneClasses.neutral

  return (
    <span
      className={`pv-chip inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium border ${wrap} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span>{children}</span>
    </span>
  )
}

export function statusToneFor(status: string): ChipTone {
  const s = (status || "").toLowerCase()
  if (
    s.includes("complet") ||
    s.includes("approv") ||
    s === "active" ||
    s.includes("reviewed")
  )
    return "ok"
  if (
    s.includes("overdue") ||
    s.includes("reject") ||
    s.includes("breach") ||
    s.includes("suspend")
  )
    return "bad"
  if (
    s.includes("review") ||
    s.includes("progress") ||
    s.includes("due") ||
    s === "pending"
  )
    return "warn"
  if (s.includes("draft") || s === "inactive") return "neutral"
  return "info"
}

/** KPI Card matching spec: icon, label, value, trend, progress bar, target/total, chevron */
export function KPICard({
  icon,
  label,
  value,
  trend,
  progressPct,
  progressVariant,
  target,
  onClick,
}: {
  icon: ReactNode
  label: string
  value: string
  trend?: {
    text: string
    positive: boolean
  }
  progressPct: number
  progressVariant?: "teal" | "critical"
  target?: string
  onClick?: () => void
}) {
  const [targetLabel, targetVal] = target ? target.split(" ") : ["", ""]

  return (
    <section
      className="pv-card pv-kpi-card bg-white rounded-xl border border-[#E2EAF2] p-5 shadow-sm hover:border-slate-300 transition-colors"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter") onClick()
            }
          : undefined
      }
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              progressVariant === "critical"
                ? "bg-red-50 text-red-600"
                : "bg-teal-50 text-[#0D9488]"
            }`}
          >
            {icon}
          </div>
          <span className="text-[13px] font-medium text-slate-600">
            {label}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
      </div>

      <div className="text-[26px] font-bold text-[#102A43] my-2 leading-tight tabular-nums">
        {value}
      </div>

      <div className="flex items-end justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          {trend && (
            <div
              className={`text-[11px] font-semibold flex items-center gap-1 mb-1.5 whitespace-nowrap ${
                trend.positive ? "text-[#0D9488]" : "text-red-600"
              }`}
            >
              {trend.positive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trend.text}</span>
            </div>
          )}
          <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[120px] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progressVariant === "critical" ? "bg-red-500" : "bg-[#0D9488]"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
            />
          </div>
        </div>

        {target && (
          <div className="text-right shrink-0">
            <div className="text-[10px] text-slate-400 leading-tight">
              {targetLabel}
            </div>
            <div className="text-[11.5px] font-semibold text-slate-600 leading-tight">
              {targetVal}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// Legacy StatCard — redirect to KPICard-like rendering
export function StatCard({
  eyebrow,
  value,
  caption,
  delta,
  icon,
  onClick,
}: {
  eyebrow: string
  value: string
  caption: string
  delta?: {
    text: string
    good: boolean
  }
  icon?: ReactNode
  onClick?: () => void
}) {
  return (
    <KPICard
      icon={icon || <BarChart3 className="w-4 h-4" />}
      label={eyebrow}
      value={value}
      trend={delta ? { text: delta.text, positive: delta.good } : undefined}
      progressPct={parseInt(value) || 50}
      target={caption}
      onClick={onClick}
    />
  )
}

export function EmptyState({
  title,
  hint,
  icon,
  action,
  className = "",
}: {
  title: string
  hint?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`py-12 px-6 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3.5">
        {icon || <Inbox className="w-5 h-5 stroke-[1.75]" />}
      </div>
      <h3 className="text-[16px] font-semibold text-[#102A43] m-0 mb-1">
        {title}
      </h3>
      {hint && (
        <p className="text-[13px] text-slate-500 max-w-sm m-0 leading-normal">
          {hint}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
