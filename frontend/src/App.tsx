import {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
} from "react"
import Sidebar from "./components/Sidebar"
import Header from "./components/Header"
import CommandPalette from "./components/CommandPalette"
import {
  ToastContainer,
  type ToastMessage,
  type ToastType,
} from "./components/Toast"
import DashboardPage from "./pages/DashboardPage"
import RegulationsPage from "./pages/RegulationsPage"
import RegulationDetailPage from "./pages/RegulationDetailPage"
import MapTasksPage from "./pages/MapTasksPage"
import MapReviewPage from "./pages/MapReviewPage"
import ReportsPage from "./pages/ReportsPage"
import SettingsPage from "./pages/SettingsPage"
import LoginPage from "./pages/LoginPage"
import DigitalTwinPage from "./pages/DigitalTwinPage"
import EvidencePage from "./pages/EvidencePage"
import UsersPage from "./pages/UsersPage"
import { api } from "./lib/api"
import type { UserOut } from "./lib/types"

export type Page = "dashboard" | "regulations" | "regulation-detail" | "digital-twin" | "map-tasks" | "map-review" | "evidence" | "reports" | "users" | "settings" | "login"

export interface NavCtx {
  navigate: (page: Page, id?: string) => void
  toast: (type: ToastType, title: string, message?: string) => void
  selectedId: string | null
  user: UserOut | null
  logout: () => Promise<void> | void
  refresh: () => void
}

export const AppCtx = createContext<NavCtx>({
  navigate: () => {},
  toast: () => {},
  selectedId: null,
  user: null,
  logout: () => {},
  refresh: () => {},
})

export const useApp = () => useContext(AppCtx)

const pageTitles: Record<Page, string> = {
  dashboard: "Dashboard",
  regulations: "Regulations",
  "regulation-detail": "Regulation Detail",
  "digital-twin": "Digital Twin",
  "map-tasks": "MAP Tasks",
  "map-review": "MAP Review",
  evidence: "Evidence",
  reports: "Reports",
  users: "Users",
  settings: "Settings",
  login: "Login",
}

const sidebarPage: Record<Page, Page> = {
  dashboard: "dashboard",
  regulations: "regulations",
  "regulation-detail": "regulations",
  "digital-twin": "digital-twin",
  "map-tasks": "map-tasks",
  "map-review": "map-tasks",
  evidence: "evidence",
  reports: "reports",
  users: "users",
  settings: "settings",
  login: "login",
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [user, setUser] = useState<UserOut | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("pravah_sidebar_collapsed") === "true"
    } catch {
      return false
    }
  })

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem("pravah_sidebar_collapsed", String(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const toast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { id, type, title, message }])
    },
    [],
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const navigate = useCallback((page: Page | string, id?: string) => {
    if (page === "__palette__") {
      setPaletteOpen(true)
      return
    }
    setCurrentPage(page as Page)
    setSelectedId(id ?? null)
  }, [])

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (import.meta.env.DEV && !sessionStorage.getItem("dev-started")) {
        sessionStorage.setItem("dev-started", "true")
        try {
          await api.post("/auth/logout")
        } catch {
          /* ignore */
        }
      }
      api
        .get<UserOut>("/auth/me")
        .then((u) => setUser(u))
        .catch(() => setUser(null))
        .finally(() => setAuthLoading(false))
    }
    checkSession()
  }, [])

  // Listen for navigate-to-login event from api.ts 401 handler
  useEffect(() => {
    const handler = () => {
      setUser(null)
      setCurrentPage("login")
    }
    window.addEventListener("navigate-to-login", handler)
    return () => window.removeEventListener("navigate-to-login", handler)
  }, [])

  // Cmd+K palette and Cmd+B sidebar toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setPaletteOpen((p) => !p)
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [toggleSidebar])

  if (authLoading) {
    return (
      <div
        className="pv-app"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)" }}>
            PravahOS
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "var(--teal)",
              marginTop: 6,
            }}
          >
            VERIFYING SESSION…
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={(u) => {
          setUser(u)
          setCurrentPage("dashboard")
          toast("success", "Signed in successfully", `Welcome back, ${u.email}`)
        }}
      />
    )
  }

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout")
    } catch {
      /* ignore */
    }
    setUser(null)
    setCurrentPage("login")
  }

  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    toast("info", "Data refreshed", "Reloaded latest changes from server.")
  }, [toast])

  const ctx: NavCtx = {
    navigate: navigate as NavCtx["navigate"],
    toast,
    selectedId,
    user,
    logout: handleLogout,
    refresh: handleRefresh,
  }

  const renderPage = () => {
    switch (currentPage) {
      case "regulations":
        return <RegulationsPage />
      case "regulation-detail":
        return <RegulationDetailPage />
      case "digital-twin":
        return <DigitalTwinPage />
      case "map-tasks":
        return <MapTasksPage />
      case "map-review":
        return <MapReviewPage />
      case "evidence":
        return <EvidencePage />
      case "reports":
        return <ReportsPage />
      case "users":
        return <UsersPage />
      case "settings":
        return <SettingsPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="pv-app flex min-h-screen" style={{ width: "100%" }}>
        <Sidebar
          currentPage={sidebarPage[currentPage]}
          onNavigate={(p) => navigate(p)}
          onLogout={handleLogout}
          onPalette={() => setPaletteOpen(true)}
          collapsed={sidebarCollapsed}
        />

        <div
          className={`pv-main flex-1 flex flex-col ${
            sidebarCollapsed ? "sidebar-collapsed" : ""
          }`}
          style={{
            marginLeft: sidebarCollapsed
              ? "var(--sidebar-collapsed-width, 68px)"
              : "var(--sidebar-width, 220px)",
            minHeight: "100vh",
            minWidth: 0,
            transition: "margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Header
            title={pageTitles[currentPage]}
            onPaletteOpen={() => setPaletteOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            onLogout={handleLogout}
            onRefresh={handleRefresh}
          />
          <main
            className="flex-1 flex flex-col"
            style={{ padding: "16px 24px 40px", width: "100%", minWidth: 0 }}
          >
            <div key={`${currentPage}-${refreshKey}`} className="pv-rise flex-1 flex flex-col">
              {renderPage()}
            </div>
            <footer
              style={{
                marginTop: 32,
                paddingTop: 14,
                borderTop: "1px solid var(--line)",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "var(--faint)",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>PRAVAHOS · AUDIT TRAIL ENABLED · ALL ACTIONS LOGGED</span>
              
            </footer>
          </main>
        </div>

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onNavigate={navigate}
        />

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </AppCtx.Provider>
  )
}
