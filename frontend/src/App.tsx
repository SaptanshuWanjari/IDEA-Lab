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
    api.get<UserOut>('/auth/me')
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false))
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
      <div className="grid-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="rgba(59,130,246,0.3)" strokeWidth="3"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
          </path>
        </svg>
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
      <div className="grid-bg flex min-h-screen" style={{ width: '100%' }}>
        <Sidebar
          currentPage={sidebarPage[currentPage]}
          onNavigate={p => navigate(p)}
          onLogout={handleLogout}
          onPalette={() => setPaletteOpen(true)}
        />

        <div className="flex-1 flex flex-col" style={{ marginLeft: 72, minHeight: '100vh' }}>
          <Header
            title={pageTitles[currentPage]}
            onPaletteOpen={() => setPaletteOpen(true)}
          />
          <main className="flex-1 overflow-auto flex flex-col" style={{ padding: '28px 28px 48px' }}>
            <div key={currentPage} className="flex-1 flex flex-col" style={{ animation: 'fadeInUp 0.28s ease forwards' }}>
              {renderPage()}
            </div>
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
