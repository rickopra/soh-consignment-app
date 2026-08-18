import { useState, type ReactNode } from 'react'
import brandMark from '../assets/brand/brand-mark-512.png'
import { ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardCheck, LayoutDashboard, Menu, Moon, PackageCheck, Sun, X } from 'lucide-react'
import { IconButton, StatusBadge } from './ui'
import { cn } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Overview', caption: 'Ringkasan operasional', icon: LayoutDashboard },
  { to: '/inventory', label: 'SOH Inventory', caption: 'Stok dan readiness', icon: Boxes },
  { to: '/outbound', label: 'Outbound', caption: 'Permintaan barang', icon: ArrowUpFromLine },
  { to: '/inbound', label: 'Inbound', caption: 'Penerimaan barang', icon: ArrowDownToLine },
  { to: '/refill', label: 'Refill & Voucher', caption: 'Output dan dokumen', icon: PackageCheck },
]

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Overview', subtitle: 'Kondisi stok dan aktivitas hari ini' },
  '/inventory': { title: 'SOH Inventory', subtitle: 'Pantau stok, readiness, dan kebutuhan refill' },
  '/outbound': { title: 'Outbound', subtitle: 'Kelola permintaan dan pengeluaran part' },
  '/inbound': { title: 'Inbound', subtitle: 'Catat penerimaan dan status GR' },
  '/refill': { title: 'Refill & Voucher', subtitle: 'Siapkan rekomendasi refill dan dokumen permintaan' },
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { dataMode } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState(() => window.localStorage.getItem('soh-theme') === 'dark')
  const meta = pageMeta[location.pathname] ?? pageMeta['/']

  const toggleTheme = () => {
    setDark((current) => {
      const next = !current
      document.documentElement.classList.toggle('dark', next)
      window.localStorage.setItem('soh-theme', next ? 'dark' : 'light')
      return next
    })
  }

  const sidebar = (
    <aside className="flex h-full w-[288px] flex-col border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950" aria-label="Navigasi utama">
      <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6 dark:border-slate-800">
        <img src={brandMark} alt="SOH Consignment" className="h-10 w-10 rounded-2xl object-cover shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10" />
        <div><p className="text-[15px] font-extrabold tracking-tight text-slate-950 dark:text-white">SOH Consignment</p><p className="text-[11px] font-medium text-slate-400">Consignment control center</p></div>
        <div className="ml-auto lg:hidden"><IconButton label="Tutup navigasi" onClick={() => setMobileOpen(false)}><X size={18} /></IconButton></div>
      </div>
      <div className="px-4 pt-6">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
        <nav className="space-y-1">
          {navItems.map(({ to, label, caption, icon: Icon }) => (
            <RouterNavLink key={to} to={to} end={to === '/'} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('group flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors', isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white')}>
              {({ isActive }) => <><span className={cn('flex h-9 w-9 items-center justify-center rounded-xl transition-colors', isActive ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400')}><Icon size={17} aria-hidden="true" /></span><span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block truncate text-[11px] text-current/60">{caption}</span></span></>}
            </RouterNavLink>
          ))}
        </nav>
      </div>
      <div className="mt-auto px-4 pb-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
          <div className="mb-3 flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-blue-900/50 dark:text-blue-300"><ClipboardCheck size={16} aria-hidden="true" /></span><StatusBadge status="ready">Online</StatusBadge></div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">Jambi / Mendalo</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">Data tersimpan di mode demo lokal sampai backend dihubungkan.</p>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-slate-950 focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white">Lewati ke konten utama</a>
      <div className="flex min-h-screen">
        <div className="hidden lg:block">{sidebar}</div>
        {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
        <div className={cn('fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:hidden', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>{sidebar}</div>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-6 xl:px-9" aria-label="Header halaman">
            <div className="flex min-w-0 items-center gap-3"><div className="lg:hidden"><IconButton label="Buka navigasi" onClick={() => setMobileOpen(true)}><Menu size={19} /></IconButton></div><div className="min-w-0"><h2 className="truncate text-base font-bold tracking-tight text-slate-950 dark:text-white">{meta.title}</h2><p className="hidden truncate text-xs text-slate-400 sm:block">{meta.subtitle}</p></div></div>
            <div className="flex items-center gap-2 sm:gap-3">
              <IconButton label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'} onClick={toggleTheme}>{dark ? <Sun size={17} /> : <Moon size={17} />}</IconButton>
              <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-800 sm:block" aria-hidden="true" />
              <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">WM</div><div className="hidden sm:block"><p className="text-xs font-bold text-slate-800 dark:text-slate-100">Warehouse Man</p><p className="text-[10px] text-slate-400">{dataMode === 'demo' ? 'Demo workspace' : 'Connected'}</p></div></div>
            </div>
          </header>
          <main id="main-content" className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 xl:px-9">{children}</main>
        </div>
      </div>
    </div>
  )
}



