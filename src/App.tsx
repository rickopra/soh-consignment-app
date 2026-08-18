import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider'
import { AppShell } from './components/AppShell'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import OutboundPage from './pages/OutboundPage'
import InboundPage from './pages/InboundPage'
import RefillPage from './pages/RefillPage'
import './App.css'
import { apiIsConfigured } from './lib/api'
import { useAppStore } from './store/appStore'

function App() {
  const hydrateFromApi = useAppStore((state) => state.hydrateFromApi)
  useEffect(() => {
    if (apiIsConfigured()) void hydrateFromApi()
  }, [hydrateFromApi])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/outbound" element={<OutboundPage />} />
            <Route path="/inbound" element={<InboundPage />} />
            <Route path="/refill" element={<RefillPage />} />
          </Routes>
        </AppShell>
      </ToastProvider>
    </BrowserRouter>
  )
}
export default App


