import { useEffect, useState } from "react"

export type ToastType = "success" | "error" | "info" | "warning"

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message?: string
}

const icons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="#1B6B4A"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="#A83226"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  warning: (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="#8A5E00"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="#13293F"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
}

const bgColors: Record<ToastType, string> = {
  success: "#FFFFFF",
  error: "#FFFFFF",
  warning: "#FFFFFF",
  info: "#FFFFFF",
}

const borderColors: Record<ToastType, string> = {
  success: "#C4DFCF",
  error: "#EFC4BE",
  warning: "#E7D3A0",
  info: "#CBD6E2",
}

const accentColors: Record<ToastType, string> = {
  success: "#1B6B4A",
  error: "#A83226",
  warning: "#8A5E00",
  info: "#13293F",
}

interface ToastItemProps {
  toast: ToastMessage
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        background: bgColors[toast.type],
        border: `1px solid ${borderColors[toast.type]}`,
        borderLeft: `3px solid ${accentColors[toast.type]}`,
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        boxShadow: "0 12px 40px -8px rgba(12,27,45,0.22)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(32px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        minWidth: 280,
        maxWidth: 360,
        cursor: "pointer",
      }}
      onClick={() => onRemove(toast.id)}
    >
      <div style={{ flexShrink: 0, marginTop: 1 }}>{icons[toast.type]}</div>
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#0A0A0A",
            margin: 0,
            fontFamily: "Inter",
          }}
        >
          {toast.title}
        </p>
        {toast.message && (
          <p
            style={{
              fontSize: 11,
              color: "#888880",
              margin: 0,
              marginTop: 2,
              fontFamily: "Inter",
            }}
          >
            {toast.message}
          </p>
        )}
      </div>
      <button
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#888880",
          fontSize: 14,
          padding: 0,
          marginTop: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 300,
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}
