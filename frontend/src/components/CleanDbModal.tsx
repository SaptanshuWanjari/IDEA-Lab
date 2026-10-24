import { useState } from "react"
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react"
import { api } from "../lib/api"
import { useApp } from "../App"

interface CleanDbModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function CleanDbModal({
  open,
  onClose,
  onSuccess,
}: CleanDbModalProps) {
  const { toast } = useApp()
  const [cleaning, setCleaning] = useState(false)

  if (!open) return null

  const handleClean = async () => {
    setCleaning(true)
    try {
      const res = await api.post<{ status: string; message: string }>(
        "/admin/clean-db",
      )
      toast(
        "success",
        "Database cleaned",
        res.message || "System reset to clean initial state.",
      )
      onClose()
      if (onSuccess) {
        onSuccess()
      } else {
        // Reload current page to refresh all data
        window.location.reload()
      }
    } catch (err: unknown) {
      toast(
        "error",
        "Database clean failed",
        err instanceof Error ? err.message : "Failed to wipe database",
      )
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pv-clean-db-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !cleaning) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-lg w-full p-6 text-left transition-all">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-rose-700 text-xs font-bold tracking-wider">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>CONFIRM DATABASE RESET</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={cleaning}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <h2 id="pv-clean-db-title" className="text-lg font-bold text-ink mb-2">
          Reset Generated Policies & Tasks
        </h2>

        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-[12.5px] text-rose-900 mb-4 leading-relaxed">
          <p className="font-semibold mb-1">
            This will reset generated policies, task progress, and audit logs:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-rose-800 text-[12px] mt-2">
            <li>
              All generated MAP tasks, dependencies, candidate plans, and obligation reviews will be cleared.
            </li>
            <li>
              Uploaded task evidence files, AI assessments, and audit report snapshots will be removed.
            </li>
            <li>
              Audit logs, AI run records, and MAP execution graph nodes will be reset.
            </li>
            <li>
              <span className="font-semibold text-rose-950">Preserved:</span> All registered RBI circulars, ingested bank policies, department structures, and active user logins remain intact.
            </li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={cleaning}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClean}
            disabled={cleaning}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
          >
            {cleaning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Cleaning generated data…</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Generated Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
