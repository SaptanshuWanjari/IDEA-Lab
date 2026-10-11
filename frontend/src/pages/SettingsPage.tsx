import { useState, useMemo } from "react"
import {
  User,
  Bell,
  Shield,
  Link2,
  Users,
  Building2,
  Copy,
  Check,
  Calendar,
  Lock,
  AlertTriangle,
  X,
  Loader2,
  ArrowRight,
  Monitor,
  Globe,
  Radio,
  FileText,
  KeyRound,
  ShieldAlert,
} from "lucide-react"
import { useApp } from "../App"
import { Card, SectionHead, StatusChip } from "../components/ui"

type SettingsTab = "Profile" | "Notifications" | "Security" | "Integrations" | "Team"

const tabs: {
  id: SettingsTab
  label: string
  icon: typeof User
}[] = [
  { id: "Profile", label: "Profile", icon: User },
  { id: "Notifications", label: "Notifications", icon: Bell },
  { id: "Security", label: "Security", icon: Shield },
  { id: "Integrations", label: "Integrations", icon: Link2 },
  { id: "Team", label: "Team", icon: Users },
]

export default function SettingsPage() {
  const { toast, user, navigate } = useApp()
  const [activeTab, setActiveTab] = useState<SettingsTab>("Profile")

  // User form states
  const initialName = useMemo(() => {
    if (!user?.email) return "Compliance Administrator"
    const prefix = user.email.split("@")[0]
    return prefix.toLowerCase() === "admin"
      ? "Administrator"
      : prefix.charAt(0).toUpperCase() + prefix.slice(1)
  }, [user])

  const initialEmail = user?.email ?? "admin@pravah.in"

  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [copiedLicence, setCopiedLicence] = useState(false)

  // Notification states
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSlack, setNotifSlack] = useState(true)
  const [notifOverdue, setNotifOverdue] = useState(true)
  const [notifUpload, setNotifUpload] = useState(true)
  const [notifCirculars, setNotifCirculars] = useState(true)
  const [notifReview, setNotifReview] = useState(true)

  // Danger zone state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deactivateConfirmationInput, setDeactivateConfirmationInput] =
    useState("")

  // Validation & change tracking
  const hasProfileChanges =
    name.trim() !== initialName || email.trim() !== initialEmail
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const handleSaveProfile = () => {
    if (!isEmailValid) {
      toast(
        "bad" as any,
        "Invalid Email",
        "Please enter a valid work email address.",
      )
      return
    }
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      setIsSaved(true)
      toast(
        "success",
        "Changes saved",
        "Your profile details have been updated in the local registry.",
      )
      setTimeout(() => setIsSaved(false), 2500)
    }, 450)
  }

  const handleResetProfile = () => {
    setName(initialName)
    setEmail(initialEmail)
  }

  const handleCopyLicence = () => {
    const licenceId = "BANK-RBI-2019-0042"
    navigator.clipboard?.writeText(licenceId)
    setCopiedLicence(true)
    toast("info", "Licence copied", `${licenceId} copied to clipboard.`)
    setTimeout(() => setCopiedLicence(false), 2000)
  }

  const handleConfirmDeactivate = () => {
    setShowDeactivateModal(false)
    setDeactivateConfirmationInput("")
    toast(
      "warning",
      "Deactivation requested",
      "Account flagged for deactivation. Submitted for administrator countersign.",
    )
  }

  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase() || "AD"
  }, [name])

  return (
    <div className="w-full max-w-[1440px] mx-auto flex flex-col">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-slate-500 mb-2"
      >
        <button
          onClick={() => navigate("dashboard")}
          className="text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
        >
          Command Desk
        </button>
        <span className="text-slate-400">/</span>
        <span className="text-ink font-semibold">Settings</span>
      </nav>

      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Settings
          </h1>
          <p className="text-[13.5px] text-slate-500 mt-1">
            Manage your account, security, notifications, and organization
            preferences.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="pv-chip pv-chip--teal">
            <span className="dot" />
            Active session
          </span>
          <span className="pv-chip text-xs">RBI Q3 Cycle</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        className="flex items-center gap-1 border-b border-line pb-0 mb-6 overflow-x-auto"
        role="tablist"
        aria-label="Settings categories"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-t-lg border border-transparent border-b-2 text-[13px] font-medium transition-all whitespace-nowrap -mb-[1px] cursor-pointer ${
                isActive
                  ? "bg-teal-50/80 text-teal-700 border-teal-200 border-b-teal-600 font-semibold"
                  : "text-slate-500 hover:bg-slate-100 hover:text-ink"
              }`}
            >
              <TabIcon
                className={`w-4 h-4 ${
                  isActive ? "text-teal-600" : "text-slate-400"
                }`}
              />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: PROFILE */}
      {activeTab === "Profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-6 items-start">
          {/* Left Column: Personal Information Card */}
          <Card>
            <SectionHead
              eyebrow={
                <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                  <User className="w-3.5 h-3.5" />
                  Account Profile
                </span>
              }
              title="Personal information"
              sub="Profile identity, contact information, and account settings."
            />

            {/* Account Identity Block */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-line mb-6">
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-ink to-teal-700 flex items-center justify-center text-xl font-bold text-white shadow-sm shrink-0">
                {initials}
                <div
                  title="Active"
                  className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-200"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-ink tracking-tight">
                    {name || "Admin Account"}
                  </h3>
                  <StatusChip tone="ok">Active</StatusChip>
                </div>

                <p className="text-[12.5px] text-slate-500 mt-0.5 mb-1.5 truncate">
                  {email}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="pv-chip pv-chip--teal">
                    <span className="dot" />
                    Compliance Officer
                  </span>
                  <span className="pv-chip text-[10.5px]">
                    Legal & Compliance Desk
                  </span>
                </div>
              </div>
            </div>

            {/* Editable Profile Fields */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (hasProfileChanges && isEmailValid && !isSaving)
                  handleSaveProfile()
              }}
              className="flex flex-col gap-4.5"
            >
              {/* Full Name */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label
                    htmlFor="pv-field-fullname"
                    className="text-[12.5px] font-semibold text-ink"
                  >
                    Full name
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Displayed on signed reviews
                  </span>
                </div>
                <input
                  id="pv-field-fullname"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Officer name"
                  className="w-full h-9.5 px-3 rounded-lg border border-line bg-slate-50 text-[13px] text-ink focus:border-teal-600 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 transition-all"
                />
                <p className="text-[11.5px] text-slate-500 mt-1.5">
                  Your name as it appears across audit packages and signed MAP
                  reviews.
                </p>
              </div>

              {/* Work Email */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label
                    htmlFor="pv-field-email"
                    className="text-[12.5px] font-semibold text-ink"
                  >
                    Work email
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Corporate ID
                  </span>
                </div>
                <input
                  id="pv-field-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@pravah.in"
                  className={`w-full h-9.5 px-3 rounded-lg border text-[13px] text-ink focus:outline-hidden focus:ring-2 transition-all ${
                    !isEmailValid && email
                      ? "border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-line bg-slate-50 focus:border-teal-600 focus:bg-white focus:ring-teal-500/20"
                  }`}
                />
                {!isEmailValid && email ? (
                  <p className="text-[11.5px] text-rose-600 font-medium mt-1.5">
                    Please enter a valid corporate email address.
                  </p>
                ) : (
                  <p className="text-[11.5px] text-slate-500 mt-1.5">
                    Email changes may require verification before taking effect.
                  </p>
                )}
              </div>

              {/* Role & Permissions (Read-only / Access Controlled) */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-[12.5px] font-semibold text-ink">
                    Role & permissions
                  </label>
                  <span className="pv-chip text-[10px]">Assigned</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-line">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-slate-200/80 flex items-center justify-center text-ink shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-ink leading-tight">
                        {user?.role
                          ? user.role.toUpperCase()
                          : "COMPLIANCE OFFICER"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Maker–checker signatory · Policy oversight
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("users")}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-teal-700 hover:text-teal-800 p-1 cursor-pointer transition-colors"
                    title="View role matrix in Users directory"
                  >
                    <span>View matrix</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-[11.5px] text-slate-500 mt-1.5">
                  Managed by an administrator. Profile editing and access
                  control are separate responsibilities.
                </p>
              </div>

              {/* Form Action & Feedback Bar */}
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 gap-3 flex-wrap">
                <div>
                  {hasProfileChanges ? (
                    <span className="text-xs text-amber-600 inline-flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Unsaved changes
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      All changes saved to audit ledger
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {hasProfileChanges && (
                    <button
                      type="button"
                      onClick={handleResetProfile}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-line rounded-lg hover:bg-slate-50 hover:text-ink transition-colors cursor-pointer"
                    >
                      Discard
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={!hasProfileChanges || !isEmailValid || isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 active:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving…</span>
                      </>
                    ) : isSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <span>Save changes</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </Card>

          {/* Right Column: Organisation details + Danger zone */}
          <div className="flex flex-col gap-5">
            {/* Organisation Details Card */}
            <Card>
              <SectionHead
                eyebrow={
                  <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                    <Building2 className="w-3.5 h-3.5" />
                    Institution Profile
                  </span>
                }
                title="Organisation details"
                sub="Institution, licence, and active compliance cycle."
              />

              {/* Institution Identity Header */}
              <div className="flex items-center gap-3 p-3 bg-teal-50/70 border border-teal-200/60 rounded-lg mb-4">
                <div className="w-9 h-9 rounded-lg bg-white border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13.5px] font-bold text-ink truncate">
                      Pravah Private Bank Ltd.
                    </p>
                    <StatusChip tone="ok">Authorized</StatusChip>
                  </div>
                  <p className="text-[11.5px] text-slate-500 mt-0.5 truncate">
                    Scheduled Commercial Bank (Private Sector)
                  </p>
                </div>
              </div>

              {/* Read-only Structured Fields */}
              <div className="flex flex-col">
                {/* Institution Name */}
                <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-[12.5px]">Institution name</span>
                  </div>
                  <span className="text-[13px] font-semibold text-ink">
                    Pravah Private Bank Ltd.
                  </span>
                </div>

                {/* RBI Licence Identifier with Copy Action */}
                <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-[12.5px]">
                      RBI licence identifier
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="pv-mono text-[12.5px] font-semibold text-ink">
                      BANK-RBI-2019-0042
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLicence}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                        copiedLicence
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : "bg-white text-slate-600 border-line hover:bg-slate-50"
                      }`}
                      title="Copy licence identifier"
                      aria-label="Copy licence identifier"
                    >
                      {copiedLicence ? (
                        <>
                          <Check className="w-3 h-3 text-teal-600 stroke-[2.5]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <Copy className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Compliance Cycle */}
                <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[12.5px]">
                      Active compliance cycle
                    </span>
                  </div>
                  <span className="pv-mono text-[12.5px] font-semibold text-teal-700">
                    Q3 2026 (1 Jul – 30 Sep 2026)
                  </span>
                </div>

                {/* Primary Supervisor */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Shield className="w-3.5 h-3.5" />
                    <span className="text-[12.5px]">Regulatory supervisor</span>
                  </div>
                  <span className="text-[12.5px] font-medium text-ink">
                    Reserve Bank of India (DoBS)
                  </span>
                </div>
              </div>

              {/* Informative governance note */}
              <div className="mt-3.5 p-3 bg-slate-50 rounded-lg border border-line text-[11.5px] text-slate-500 flex items-start gap-2 leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  Centrally configured institutional profile. Organisational
                  licence and entity records are governed by the RBI Master
                  Direction on Governance. Contact your Organisation
                  Administrator to update.
                </span>
              </div>
            </Card>

            {/* Danger Zone Card */}
            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-5">
              <div className="flex items-center gap-1.5 text-rose-700 text-xs font-semibold mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Access Control</span>
              </div>

              <h3 className="text-base font-bold text-rose-900 tracking-tight mb-1">
                Danger zone
              </h3>
              <p className="text-xs text-rose-800 mb-3.5">
                Actions that affect account access and require careful
                confirmation.
              </p>

              <div className="bg-white border border-rose-200 rounded-lg p-4">
                <h4 className="text-[13.5px] font-bold text-ink mb-1">
                  Deactivate account
                </h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  Prevent this account from accessing PravahOS. Explain what
                  happens to assigned tasks, audit records, and existing
                  sessions before proceeding.
                </p>

                <ul className="mb-4 pl-4 text-[11.5px] text-slate-600 space-y-1 list-disc">
                  <li>
                    Assigned MAP obligations will be flagged for departmental
                    re-assignment.
                  </li>
                  <li>
                    Audit trail signatures and historical records remain
                    preserved under RBI regulations.
                  </li>
                  <li>
                    Active sessions will be immediately terminated across all
                    devices.
                  </li>
                  <li>Reinstatement requires an administrator countersign.</li>
                </ul>

                <button
                  type="button"
                  onClick={() => setShowDeactivateModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Deactivate account</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NOTIFICATIONS */}
      {activeTab === "Notifications" && (
        <div className="max-w-3xl">
          <Card>
            <SectionHead
              eyebrow={
                <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                  <Bell className="w-3.5 h-3.5" />
                  Alert Routing
                </span>
              }
              title="Notification preferences"
              sub="Control how the desk reaches you across compliance alerts and regulatory updates."
            />

            <div className="flex flex-col gap-1">
              <div className="pv-mono text-[11px] font-bold tracking-wider text-slate-400 py-2.5 uppercase">
                Compliance & Regulatory Escalations
              </div>

              {[
                {
                  label: "Overdue MAP alerts",
                  desc: "Escalate automatically when a MAP passes its regulatory due date",
                  val: notifOverdue,
                  set: setNotifOverdue,
                },
                {
                  label: "RBI circular intake notifications",
                  desc: "Notify immediately when new RBI circulars are ingested into the folio",
                  val: notifCirculars,
                  set: setNotifCirculars,
                },
                {
                  label: "Evidence filing notifications",
                  desc: "Notify on new evidence uploads in your assigned department folios",
                  val: notifUpload,
                  set: setNotifUpload,
                },
                {
                  label: "Maker–checker queue alerts",
                  desc: "Alert when an obligation requires your countersign or compliance sign-off",
                  val: notifReview,
                  set: setNotifReview,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-3 border-b border-slate-100 gap-4"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-ink">
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => item.set(!item.val)}
                    type="button"
                    role="switch"
                    aria-checked={item.val}
                    aria-label={item.label}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                      item.val ? "bg-teal-600" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        item.val ? "translate-x-5.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}

              <div className="pv-mono text-[11px] font-bold tracking-wider text-slate-400 pt-5 pb-2 uppercase">
                Delivery Channels
              </div>

              {[
                {
                  label: "Work email notifications",
                  desc: `Send compliance digests and critical reminders to ${email}`,
                  val: notifEmail,
                  set: setNotifEmail,
                },
                {
                  label: "Slack workspace integration",
                  desc: "Push MAP task dispatch to assigned department Slack channels",
                  val: notifSlack,
                  set: setNotifSlack,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-3 border-b border-slate-100 gap-4"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-ink">
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => item.set(!item.val)}
                    type="button"
                    role="switch"
                    aria-checked={item.val}
                    aria-label={item.label}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                      item.val ? "bg-teal-600" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        item.val ? "translate-x-5.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  toast(
                    "success",
                    "Preferences updated",
                    "Notification routing rules saved.",
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors cursor-pointer shadow-xs"
              >
                Save notification preferences
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: SECURITY */}
      {activeTab === "Security" && (
        <div className="max-w-3xl flex flex-col gap-5">
          <Card>
            <SectionHead
              eyebrow={
                <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  Authentication Security
                </span>
              }
              title="Security & credentials"
              sub="Multi-factor authentication, session management, and authentication policies."
            />

            <div className="flex flex-col gap-4">
              {/* 2FA Status */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-line gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13.5px] font-bold text-ink">
                      Two-factor authentication (2FA)
                    </p>
                    <StatusChip tone="ok">Enforced</StatusChip>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hardware token or TOTP authenticator required for RBI
                    compliance sign-offs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    toast(
                      "info",
                      "2FA Active",
                      "Configured via corporate authenticator.",
                    )
                  }
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-line rounded-lg hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
                >
                  Manage 2FA
                </button>
              </div>

              {/* Password & Session Policy */}
              <div className="flex items-center justify-between py-3 border-b border-slate-100 gap-4">
                <div>
                  <p className="text-[13px] font-semibold text-ink">
                    Password expiration
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Last rotated 24 days ago · 90-day banking compliance policy
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    toast(
                      "info",
                      "Password Policy",
                      "Password change link sent to corporate email.",
                    )
                  }
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-line rounded-lg hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
                >
                  Update password
                </button>
              </div>

              {/* Idle Session Timeout */}
              <div className="flex items-center justify-between py-3 border-b border-slate-100 gap-4">
                <div>
                  <p className="text-[13px] font-semibold text-ink">
                    Session inactivity timeout
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    15 minutes per RBI Cyber Security Framework (CSITE)
                    requirement
                  </p>
                </div>
                <span className="pv-mono text-[12.5px] font-semibold text-ink">
                  15 min (Locked)
                </span>
              </div>
            </div>
          </Card>

          {/* Active Sessions */}
          <Card>
            <SectionHead
              eyebrow="Active Sessions"
              title="Workstation sessions"
              sub="Devices currently authenticated under this officer profile."
              right={
                <button
                  type="button"
                  onClick={() =>
                    toast(
                      "warning",
                      "Sessions invalidated",
                      "All other active sessions have been terminated.",
                    )
                  }
                  className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Terminate other sessions
                </button>
              }
            />

            <div className="flex flex-col">
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8.5 h-8.5 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <Monitor className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-ink">
                        PravahOS Electron Desktop Client
                      </p>
                      <StatusChip tone="ok">Current Workstation</StatusChip>
                    </div>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">
                      Linux 6.8 · IP: 127.0.0.1 · Active now
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8.5 h-8.5 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <Globe className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">
                      Chrome Browser · Mumbai HQ
                    </p>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">
                      macOS · IP: 10.20.4.12 · Last active 3 hours ago
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: INTEGRATIONS */}
      {activeTab === "Integrations" && (
        <div className="max-w-3xl">
          <Card>
            <SectionHead
              eyebrow={
                <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                  <Link2 className="w-3.5 h-3.5" />
                  System Connectors
                </span>
              }
              title="Enterprise integrations"
              sub="Connected regulatory supervisory gateways, core banking APIs, and evidence vaults."
            />

            <div className="flex flex-col gap-3.5">
              {[
                {
                  name: "RBI DAKSH Reporting Gateway",
                  desc: "Automated intake of RBI circulars and regulatory return submission API.",
                  status: "Connected",
                  tone: "ok" as const,
                  latency: "142ms",
                },
                {
                  name: "Core Banking System (Finacle CBS API)",
                  desc: "Real-time department accounts and maker-checker validation bridge.",
                  status: "Connected",
                  tone: "ok" as const,
                  latency: "48ms",
                },
                {
                  name: "Slack Enterprise Grid",
                  desc: "Dispatch critical MAP deadlines and maker-checker alerts to compliance channels.",
                  status: "Configured",
                  tone: "ok" as const,
                  latency: "95ms",
                },
                {
                  name: "Evidence Vault (Encrypted S3 / MinIO)",
                  desc: "Immutable, audit-ready storage for evidentiary proof and policy documents.",
                  status: "Connected",
                  tone: "ok" as const,
                  latency: "32ms",
                },
              ].map((conn) => (
                <div
                  key={conn.name}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-line bg-slate-50 gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13.5px] font-bold text-ink">
                        {conn.name}
                      </p>
                      <StatusChip tone={conn.tone}>{conn.status}</StatusChip>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {conn.desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="pv-mono text-[11px] text-slate-400">
                      {conn.latency}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        toast(
                          "info",
                          "Connection Tested",
                          `${conn.name} heartbeat OK.`,
                        )
                      }
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-line rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: TEAM */}
      {activeTab === "Team" && (
        <div className="max-w-3xl">
          <Card>
            <SectionHead
              eyebrow={
                <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                  <Users className="w-3.5 h-3.5" />
                  Department Matrix
                </span>
              }
              title="Team & department assignments"
              sub="Compliance desk coverage, policy owners, and departmental oversight."
              right={
                <button
                  type="button"
                  onClick={() => navigate("users")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Manage officers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="p-3 bg-slate-50 rounded-lg border border-line">
                <span className="pv-mono text-[10.5px] text-slate-400 uppercase tracking-wide">
                  Departments
                </span>
                <p className="text-xl font-bold text-ink mt-1">6</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-line">
                <span className="pv-mono text-[10.5px] text-slate-400 uppercase tracking-wide">
                  Registered Officers
                </span>
                <p className="text-xl font-bold text-ink mt-1">14</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-line">
                <span className="pv-mono text-[10.5px] text-slate-400 uppercase tracking-wide">
                  Coverage Ratio
                </span>
                <p className="text-xl font-bold text-teal-700 mt-1">100%</p>
              </div>
            </div>

            <div className="flex flex-col">
              {[
                {
                  dept: "Information Technology",
                  lead: "Priya Sharma",
                  maps: 14,
                  risk: "High",
                },
                {
                  dept: "Risk Management",
                  lead: "Vikram Rao",
                  maps: 11,
                  risk: "Medium",
                },
                {
                  dept: "Legal & Compliance",
                  lead: "Aisha Khan",
                  maps: 5,
                  risk: "Low",
                },
                {
                  dept: "Operations Desk",
                  lead: "Sunil Mehta",
                  maps: 9,
                  risk: "Medium",
                },
                {
                  dept: "Branch Banking",
                  lead: "Ananya Deshmukh",
                  maps: 7,
                  risk: "Low",
                },
                {
                  dept: "Human Resources",
                  lead: "Rohan Gupta",
                  maps: 4,
                  risk: "Medium",
                },
              ].map((row) => (
                <div
                  key={row.dept}
                  className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-ink">
                      {row.dept}
                    </p>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">
                      Lead: {row.lead}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="pv-mono text-xs text-slate-500">
                      {row.maps} MAPs
                    </span>
                    <span
                      className={`pv-risk pv-risk--${row.risk.toLowerCase()}`}
                    >
                      <span className="dot" />
                      {row.risk}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog for Deactivation */}
      {showDeactivateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pv-deactivate-title"
          className="fixed inset-0 bg-ink/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeactivateModal(false)
              setDeactivateConfirmationInput("")
            }
          }}
        >
          <div className="bg-white rounded-xl border border-rose-200 shadow-xl max-w-lg w-full p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-700 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>CONFIRM DEACTIVATION</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeactivateModal(false)
                  setDeactivateConfirmationInput("")
                }}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <h2
              id="pv-deactivate-title"
              className="text-lg font-bold text-ink mb-2"
            >
              Deactivate Officer Account
            </h2>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 text-[12.5px] text-rose-900 mb-4 leading-relaxed">
              You are requesting deactivation of <strong>{email}</strong>. This
              will revoke immediate platform access, invalidate active tokens,
              and initiate administrative countersign workflow.
            </div>

            <div className="mb-5">
              <label
                htmlFor="pv-deactivate-verify"
                className="text-xs font-semibold text-ink block mb-1.5"
              >
                Type{" "}
                <span className="pv-mono text-rose-700 font-bold">
                  DEACTIVATE
                </span>{" "}
                to confirm:
              </label>
              <input
                id="pv-deactivate-verify"
                type="text"
                value={deactivateConfirmationInput}
                onChange={(e) => setDeactivateConfirmationInput(e.target.value)}
                placeholder="DEACTIVATE"
                className="w-full h-10 px-3 rounded-lg border border-line bg-slate-50 text-sm font-mono tracking-wider focus:border-rose-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                autoFocus
              />
            </div>

            <div className="flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeactivateModal(false)
                  setDeactivateConfirmationInput("")
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-line rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={deactivateConfirmationInput !== "DEACTIVATE"}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer"
              >
                Confirm deactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
