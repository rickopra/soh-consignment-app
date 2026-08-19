import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { AppShell } from './components/AppShell'
import { ToastProvider } from './components/ToastProvider'
import { Button } from './components/ui'
import brandMark from './assets/brand/brand-mark-512.png'
import { useLanguage } from './i18n/useLanguage'
import type { TranslationKey } from './i18n/translations'
import { localizedError } from './lib/localizedError'
import ChangePasswordPage from './pages/ChangePasswordPage'
import LoginPage from './pages/LoginPage'
import { useAppStore } from './store/appStore'
import { useAuthStore } from './store/authStore'
import './App.css'

const AdminPage = lazy(() => import('./pages/AdminPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const InboundPage = lazy(() => import('./pages/InboundPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const OutboundPage = lazy(() => import('./pages/OutboundPage'))
const RefillPage = lazy(() => import('./pages/RefillPage'))

function AppLoading({ label = 'app.loadingSession' }: { label?: TranslationKey }) {
  const { t } = useLanguage()
  return <div className='flex min-h-screen items-center justify-center bg-[var(--canvas)] px-6'><div className='flex min-w-[280px] items-center gap-4 border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm'><span className='flex h-10 w-10 items-center justify-center bg-white'><img src={brandMark} alt='' className='h-9 w-9 object-cover' aria-hidden='true' /></span><div><p className='text-sm font-semibold text-[var(--text)]'>SOH Consignment</p><p className='mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]'><LoaderCircle className='animate-spin' size={14} aria-hidden='true' />{t(label)}</p></div></div></div>
}

function AuthenticatedApplication() {
  const { language, t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const hydrateFromApi = useAppStore((state) => state.hydrateFromApi)
  const hydrated = useAppStore((state) => state.hydrated)
  const clearData = useAppStore((state) => state.clearData)
  const [loadError, setLoadError] = useState('')
  const localization = useRef({ language, t })

  useEffect(() => {
    localization.current = { language, t }
  }, [language, t])

  const hydrate = async () => {
    setLoadError('')
    try { await hydrateFromApi() }
    catch (error) { setLoadError(localizedError(error, language, t, 'app.loadErrorFallback')) }
  }

  useEffect(() => {
    void hydrateFromApi().catch((error) => {
      const current = localization.current
      setLoadError(localizedError(error, current.language, current.t, 'app.loadErrorFallback'))
    })
    return () => clearData()
  }, [clearData, hydrateFromApi])

  if (!hydrated && !loadError) return <AppLoading label='app.loadingData' />
  if (!hydrated) return <div className='flex min-h-screen items-center justify-center bg-[var(--canvas)] px-6'><div className='w-full max-w-md border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm'><AlertTriangle size={24} className='text-[var(--warning)]' aria-hidden='true' /><h1 className='mt-4 text-xl font-semibold text-[var(--text)]'>{t('app.loadErrorTitle')}</h1><p className='mt-2 text-sm leading-6 text-[var(--text-muted)]'>{loadError}</p><div className='mt-6 flex gap-2'><Button onClick={() => void hydrate()}>{t('common.retry')}</Button><Button variant='secondary' onClick={() => void logout()}>{t('common.signOut')}</Button></div></div></div>

  return <AppShell><Suspense fallback={<AppLoading label='app.loadingData' />}><Routes><Route path='/' element={<DashboardPage />} /><Route path='/inventory' element={<InventoryPage />} /><Route path='/outbound' element={<OutboundPage />} /><Route path='/inbound' element={<InboundPage />} /><Route path='/refill' element={<RefillPage />} /><Route path='/admin' element={user?.role === 'ADMIN' ? <AdminPage /> : <Navigate to='/' replace />} /><Route path='*' element={<Navigate to='/' replace />} /></Routes></Suspense></AppShell>
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
  return <BrowserRouter basename={import.meta.env.BASE_URL}><ToastProvider><AppContent /></ToastProvider></BrowserRouter>
}

export default App
