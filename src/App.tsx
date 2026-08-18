import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { ToastProvider } from './components/ToastProvider'
import { AppShell } from './components/AppShell'
import LoginPage from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import OutboundPage from './pages/OutboundPage'
import InboundPage from './pages/InboundPage'
import RefillPage from './pages/RefillPage'
import AdminPage from './pages/AdminPage'
import brandMark from './assets/brand/brand-mark-512.png'
import { Button } from './components/ui'
import { useAppStore } from './store/appStore'
import { useAuthStore } from './store/authStore'
import './App.css'

function AppLoading({ label = 'Memverifikasi session' }: { label?: string }) {
  return <div className="flex min-h-screen items-center justify-center bg-[#f3f5f7] px-6"><div className="flex items-center gap-4 border border-slate-200 bg-white px-5 py-4"><img src={brandMark} alt="" className="h-10 w-10 rounded-md" aria-hidden="true" /><div><p className="text-sm font-semibold text-slate-900">SOH Consignment</p><p className="mt-1 flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="animate-spin" size={14} aria-hidden="true" />{label}</p></div></div></div>
}

function AuthenticatedApplication() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const hydrateFromApi = useAppStore((state) => state.hydrateFromApi)
  const hydrated = useAppStore((state) => state.hydrated)
  const clearData = useAppStore((state) => state.clearData)
  const [loadError, setLoadError] = useState('')

  const hydrate = async () => {
    setLoadError('')
    try {
      await hydrateFromApi()
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Data aplikasi gagal dimuat.')
    }
  }

  useEffect(() => {
    void hydrateFromApi().catch((error) => setLoadError(error instanceof Error ? error.message : 'Data aplikasi gagal dimuat.'))
    return () => clearData()
  }, [clearData, hydrateFromApi])

  if (!hydrated && !loadError) return <AppLoading label="Memuat data operasional" />
  if (!hydrated) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f3f5f7] px-6"><div className="w-full max-w-md border border-slate-200 bg-white p-6"><h1 className="text-xl font-semibold text-slate-950">Data belum dapat dimuat</h1><p className="mt-2 text-sm leading-6 text-slate-600">{loadError}</p><div className="mt-6 flex gap-2"><Button onClick={() => void hydrate()}>Coba lagi</Button><Button variant="secondary" onClick={() => void logout()}>Keluar</Button></div></div></div>
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/outbound" element={<OutboundPage />} />
        <Route path="/inbound" element={<InboundPage />} />
        <Route path="/refill" element={<RefillPage />} />
        <Route path="/admin" element={user?.role === 'ADMIN' ? <AdminPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

function AppContent() {
  const status = useAuthStore((state) => state.status)
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => { void initialize() }, [initialize])

  if (status === 'initializing') return <AppLoading />
  if (status === 'anonymous') return <LoginPage />
  if (status === 'password_change') return <ChangePasswordPage />
  return <AuthenticatedApplication />
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider><AppContent /></ToastProvider>
    </BrowserRouter>
  )
}

export default App
