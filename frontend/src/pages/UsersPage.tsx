import { useState } from "react"
import {
  Users,
  UserCheck,
  Clock,
  Building2,
  Search,
  UserPlus,
  X,
  Send,
} from "lucide-react"
import { useApp } from "../App"
import {
  Card,
  SectionHead,
  StatusChip,
  StatCard,
  EmptyState,
} from "../components/ui"

const users = [
  {
    id: "U-001",
    name: "Aisha Khan",
    email: "aisha.khan@pvtbank.com",
    role: "Compliance Officer",
    dept: "Compliance",
    status: "Active",
    lastActive: "2m ago",
    mapsOwned: 12,
    avatar: "AK",
  },
  {
    id: "U-002",
    name: "Vikram Rao",
    email: "vikram.rao@pvtbank.com",
    role: "IT Risk Manager",
    dept: "IT",
    status: "Active",
    lastActive: "1h ago",
    mapsOwned: 8,
    avatar: "VR",
  },
  {
    id: "U-003",
    name: "Priya Sharma",
    email: "priya.sharma@pvtbank.com",
    role: "Operations Lead",
    dept: "Operations",
    status: "Active",
    lastActive: "3h ago",
    mapsOwned: 5,
    avatar: "PS",
  },
  {
    id: "U-004",
    name: "Rahul Nair",
    email: "rahul.nair@pvtbank.com",
    role: "Risk Analyst",
    dept: "Risk",
    status: "Active",
    lastActive: "5h ago",
    mapsOwned: 11,
    avatar: "RN",
  },
  {
    id: "U-005",
    name: "Meera Iyer",
    email: "meera.iyer@pvtbank.com",
    role: "Legal Counsel",
    dept: "Legal",
    status: "Inactive",
    lastActive: "2d ago",
    mapsOwned: 3,
    avatar: "MI",
  },
  {
    id: "U-006",
    name: "Kiran Bhat",
    email: "kiran.bhat@pvtbank.com",
    role: "Compliance Analyst",
    dept: "Compliance",
    status: "Active",
    lastActive: "30m ago",
    mapsOwned: 4,
    avatar: "KB",
  },
  {
    id: "U-007",
    name: "Anjali Desai",
    email: "anjali.desai@pvtbank.com",
    role: "Auditor",
    dept: "Compliance",
    status: "Pending",
    lastActive: "Never",
    mapsOwned: 0,
    avatar: "AD",
  },
]

const roles = [
  "Compliance Officer",
  "IT Risk Manager",
  "Operations Lead",
  "Risk Analyst",
  "Legal Counsel",
  "Compliance Analyst",
  "Auditor",
  "Viewer",
]

const statusTone = (s: string): "ok" | "neutral" | "warn" | "bad" =>
  s === "Active"
    ? "ok"
    : s === "Pending"
      ? "warn"
      : s === "Suspended"
        ? "bad"
        : "neutral"

function InviteModal({
  onClose,
  onSent,
}: {
  onClose: () => void
  onSent: (email: string) => void
}) {
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState("")

  return (
    <div
      className="fixed inset-0 bg-[#0C1B2D]/50 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-xl border border-[#E2EAF2] p-7 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            NEW OFFICER
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg border border-[#E2EAF2] bg-[#F1F5F9] hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-xl font-semibold text-[#102A43] m-0 mb-4">
          Invite officer
        </h2>
        {sent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 text-[#0D9488] flex items-center justify-center mx-auto mb-3">
              <UserCheck className="w-6 h-6" />
            </div>
            <p className="text-[15px] font-bold text-[#102A43] m-0">
              Invitation sent
            </p>
            <p className="text-[13px] text-slate-500 mt-1.5 mb-0">
              Invite issued to {email} — pending acceptance.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-[#102A43] block mb-1.5">
                Work email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@pvtbank.com"
                className="w-full h-10 px-3 text-[13px] bg-[#F1F5F9] border border-[#E2EAF2] rounded-lg text-[#102A43] placeholder-slate-400 focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/15 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#102A43] block mb-1.5">
                Role
              </label>
              <select className="w-full h-10 px-3 text-[13px] bg-[#F1F5F9] border border-[#E2EAF2] rounded-lg text-[#102A43] focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/15 transition-all">
                {roles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#102A43] block mb-1.5">
                Department
              </label>
              <select className="w-full h-10 px-3 text-[13px] bg-[#F1F5F9] border border-[#E2EAF2] rounded-lg text-[#102A43] focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/15 transition-all">
                {["Compliance", "IT", "Risk", "Operations", "Legal", "HR"].map(
                  (d) => (
                    <option key={d}>{d}</option>
                  ),
                )}
              </select>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  setSent(true)
                  onSent(email)
                  setTimeout(onClose, 2400)
                }}
                className="flex-1 h-10 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send invitation</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 h-10 rounded-lg border border-[#E2EAF2] hover:bg-slate-100 text-slate-700 text-[13px] font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { toast } = useApp()
  const [showInvite, setShowInvite] = useState(false)
  const [search, setSearch] = useState("")
  const [userStatuses, setUserStatuses] = useState<Record<string, string>>({})

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.dept.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSent={(email) =>
            toast("success", "Invitation sent", `Invite sent to ${email}`)
          }
        />
      )}

      <div className="w-full flex flex-col gap-6">
        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-4 h-4 text-[#0D9488]" />}
            eyebrow="Officers"
            value={String(users.length)}
            caption="Registered members"
          />
          <StatCard
            icon={<UserCheck className="w-4 h-4 text-[#0D9488]" />}
            eyebrow="Active"
            value={String(users.filter((u) => u.status === "Active").length)}
            caption="Currently enabled"
          />
          <StatCard
            icon={<Clock className="w-4 h-4 text-[#0D9488]" />}
            eyebrow="Pending invites"
            value={String(users.filter((u) => u.status === "Pending").length)}
            caption="Awaiting acceptance"
          />
          <StatCard
            icon={<Building2 className="w-4 h-4 text-[#0D9488]" />}
            eyebrow="Departments"
            value="6"
            caption="Covered functions"
          />
        </div>

        {/* Main Table Card */}
        <Card pad={true}>
          <SectionHead
            eyebrow="ACCESS CONTROL"
            title="Officers"
            sub="Manage officer accounts, roles, and access permissions."
            right={
              <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search officers..."
                    className="w-full h-9.5 pl-9 pr-3 text-[13px] bg-[#F1F5F9] border border-[#E2EAF2] rounded-lg text-[#102A43] placeholder-slate-400 focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/15 transition-all"
                    aria-label="Search officers"
                  />
                </div>
                <button
                  onClick={() => setShowInvite(true)}
                  className="h-9.5 px-3.5 rounded-lg bg-[#0D9488] hover:bg-[#0b7e73] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Invite officer</span>
                </button>
              </div>
            }
          />

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2EAF2]">
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Officer
                  </th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Role
                  </th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Department
                  </th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Last active
                  </th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    MAPs
                  </th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => {
                  const currentStatus = userStatuses[user.id] || user.status
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-[#F1F5F9]/50 transition-colors"
                    >
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 text-[#0D9488] font-semibold text-xs flex items-center justify-center shrink-0">
                            {user.avatar}
                          </div>
                          <div>
                            <p className="text-[13.5px] font-semibold text-[#102A43] m-0 leading-snug">
                              {user.name}
                            </p>
                            <p className="text-[12px] text-slate-500 m-0 leading-snug font-mono">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-[13px] text-slate-600">
                        {user.role}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] text-slate-600 border border-[#E2EAF2]">
                          {user.dept}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <StatusChip tone={statusTone(currentStatus)}>
                          {currentStatus}
                        </StatusChip>
                      </td>
                      <td className="py-3.5 pr-4 text-[12px] text-slate-500 font-mono">
                        {user.lastActive}
                      </td>
                      <td className="py-3.5 pr-4 text-[13px] font-semibold text-[#102A43] tabular-nums">
                        {user.mapsOwned}
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() =>
                              toast(
                                "info",
                                "Edit officer",
                                `Opening editor for ${user.name}`,
                              )
                            }
                            className="text-xs font-medium text-[#0D9488] hover:text-[#0b7e73] hover:bg-teal-50 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          {currentStatus === "Active" && (
                            <button
                              onClick={() => {
                                setUserStatuses((p) => ({
                                  ...p,
                                  [user.id]: "Suspended",
                                }))
                                toast(
                                  "warning",
                                  "Officer suspended",
                                  `${user.name} has been suspended.`,
                                )
                              }}
                              className="text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}
                          {currentStatus === "Suspended" && (
                            <button
                              onClick={() => {
                                setUserStatuses((p) => ({
                                  ...p,
                                  [user.id]: "Active",
                                }))
                                toast(
                                  "success",
                                  "Officer reinstated",
                                  `${user.name} has been reactivated.`,
                                )
                              }}
                              className="text-xs font-medium text-[#0D9488] hover:text-[#0b7e73] hover:bg-teal-50 px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              Reinstate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <EmptyState
              icon={<Search className="w-5 h-5 text-slate-400" />}
              title="No officers match"
              hint="Clear the search input or adjust keywords to list all members."
            />
          )}
        </Card>
      </div>
    </>
  )
}
