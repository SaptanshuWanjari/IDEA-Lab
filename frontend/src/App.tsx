import { useState, useCallback, useEffect, createContext, useContext } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import CommandPalette from './components/CommandPalette'
import { ToastContainer, type ToastMessage, type ToastType } from './components/Toast'
import DashboardPage from './pages/DashboardPage'
import RegulationsPage from './pages/RegulationsPage'
import RegulationDetailPage from './pages/RegulationDetailPage'
import MapTasksPage from './pages/MapTasksPage'
import MapReviewPage from './pages/MapReviewPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import DigitalTwinPage from './pages/DigitalTwinPage'
import EvidencePage from './pages/EvidencePage'
import UsersPage from './pages/UsersPage'
import { api } from './lib/api'
import type { UserOut } from './lib/types'

export type Page =
  | 'dashboard'
  | 'regulations'
  | 'regulation-detail'
  | 'digital-twin'
  | 'map-tasks'
  | 'map-review'
  | 'evidence'
  | 'reports'
  | 'users'
  | 'settings'
  | 'login'

export interface NavCtx {
  navigate: (page: Page, id?: string) => void
  toast: (type: ToastType, title: string, message?: string) => void
  selectedId: string | null
  user: UserOut | null
}

export const AppCtx = createContext<NavCtx>({
  navigate: () => {},
  toast: () => {},
  selectedId: null,
  user: null,
})

export const useApp = () => useContext(AppCtx)

const pageTitles: Record<Page, string> = {
  dashboard: 'Dashboard',
  regulations: 'Regulations',
  'regulation-detail': 'Regulation Detail',
  'digital-twin': 'Digital Twin',
  'map-tasks': 'MAP Tasks',
  'map-review': 'MAP Review',
  evidence: 'Evidence',
  reports: 'Reports',
  users: 'Users',
  settings: 'Settings',
  login: 'Login',
}

const sidebarPage: Record<Page, Page> = {
  dashboard: 'dashboard',
  regulations: 'regulations',
  'regulation-detail': 'regulations',
  'digital-twin': 'digital-twin',
  'map-tasks': 'map-tasks',
  'map-review': 'map-tasks',
  evidence: 'evidence',
  reports: 'reports',
  users: 'users',
  settings: 'settings',
  login: 'login',
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [user, setUser] = useState<UserOut | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, title, message }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const navigate = useCallback((page: Page | string, id?: string) => {
    if (page === '__palette__') { setPaletteOpen(true); return }
    setCurrentPage(page as Page)
    setSelectedId(id ?? null)
  }, [])

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (import.meta.env.DEV && !sessionStorage.getItem('dev-started')) {
        sessionStorage.setItem('dev-started', 'true')
        try { await api.post('/auth/logout') } catch { /* ignore */ }
      }
      api.get<UserOut>('/auth/me')
        .then(u => setUser(u))
        .catch(() => setUser(null))
        .finally(() => setAuthLoading(false))
    }
    checkSession()
  }, [])

  // Listen for navigate-to-login event from api.ts 401 handler
  useEffect(() => {
    const handler = () => { setUser(null); setCurrentPage('login') }
    window.addEventListener('navigate-to-login', handler)
    return () => window.removeEventListener('navigate-to-login', handler)
  }, [])

  // Cmd+K palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(p => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (authLoading) {
    return (
      <div className="pv-app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 600 }}>PravahOS</div>
          <div className="pv-mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--brass)', marginTop: 6 }}>VERIFYING SESSION…</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <LoginPage onLogin={(u) => {
        setUser(u)
        setCurrentPage('dashboard')
        toast('success', 'Signed in successfully', `Welcome back, ${u.email}`)
      }} />
    )
  }

  const ctx: NavCtx = { navigate: navigate as NavCtx['navigate'], toast, selectedId, user }

  const renderPage = () => {
    switch (currentPage) {
      case 'regulations':         return <RegulationsPage />
      case 'regulation-detail':   return <RegulationDetailPage />
      case 'digital-twin':        return <DigitalTwinPage />
      case 'map-tasks':           return <MapTasksPage />
      case 'map-review':          return <MapReviewPage />
      case 'evidence':            return <EvidencePage />
      case 'reports':             return <ReportsPage />
      case 'users':               return <UsersPage />
      case 'settings':            return <SettingsPage />
      default:                    return <DashboardPage />
    }
  }

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    setUser(null)
    setCurrentPage('login')
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="pv-app flex min-h-screen" style={{ width: '100%' }}>
        <Sidebar
          currentPage={sidebarPage[currentPage]}
          onNavigate={p => navigate(p)}
          onLogout={handleLogout}
          onPalette={() => setPaletteOpen(true)}
        />

        <div className="pv-main flex-1 flex flex-col" style={{ marginLeft: 248, minHeight: '100vh', minWidth: 0 }}>
          <Header
            title={pageTitles[currentPage]}
            onPaletteOpen={() => setPaletteOpen(true)}
          />
          <main className="flex-1 flex flex-col" style={{ padding: '24px 28px 56px', maxWidth: 1360, width: '100%', margin: '0 auto' }}>
            <div key={currentPage} className="pv-rise flex-1 flex flex-col">
              {renderPage()}
            </div>
            <footer className="pv-mono" style={{ marginTop: 32, paddingTop: 14, borderTop: '1px solid var(--line)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--faint)', display: 'flex', justifyContent: 'space-between' }}>
              <span>PRAVAHOS · AUDIT TRAIL ENABLED · ALL ACTIONS LOGGED</span>
              <span>MAKER–CHECKER ENFORCED</span>
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
