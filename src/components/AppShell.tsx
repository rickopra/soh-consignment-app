import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Boxes, ChevronDown, ClipboardCheck, KeyRound, LayoutDashboard, LogOut, Menu, Moon, PackageCheck, Sun, UserCog, X } from 'lucide-react'
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom'
import brandMark from '../assets/brand/brand-mark-512.png'
import { cn } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { useToast } from './toast'
import { Button, IconButton, Modal, PasswordField, StatusBadge } from './ui'

const baseNavItems = [
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
  '/admin': { title: 'Kontrol Akses', subtitle: 'Kelola pengguna, sesi, dan audit autentikasi' },
}

function initials(value: string) {
  const result = value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  return result || 'US'
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const changePassword = useAuthStore((state) => state.changePassword)
  const clearData = useAppStore((state) => state.clearData)
  const { push } = useToast()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const accountRef = useRef<HTMLDivElement>(null)
  const meta = pageMeta[location.pathname] ?? pageMeta['/']
  const navItems = user?.role === 'ADMIN' ? [...baseNavItems, { to: '/admin', label: 'Administrasi', caption: 'Pengguna dan akses', icon: UserCog }] : baseNavItems

  useEffect(() => {
    if (!accountOpen) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return
      if (event instanceof MouseEvent && accountRef.current?.contains(event.target as Node)) return
      setAccountOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [accountOpen])

  const toggleTheme = () => {
    setDark((current) => {
      const next = !current
      document.documentElement.classList.toggle('dark', next)
      window.localStorage.setItem('soh-theme', next ? 'dark' : 'light')
      return next
    })
  }

  const signOut = async () => {
    setAccountOpen(false)
    clearData()
    await logout()
  }

  const submitPassword = async () => {
    setPasswordError('')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Konfirmasi password tidak sama.')
      return
    }
    setPasswordBusy(true)
    try {
      await changePassword(passwordForm)
      setPasswordOpen(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      push({ tone: 'success', title: 'Password diperbarui', description: 'Sesi aktif telah diperbarui.' })
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Password gagal diperbarui.')
    } finally {
      setPasswordBusy(false)
    }
  }

  const sidebar = (
    <aside className="flex h-full w-[288px] flex-col border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950" aria-label="Navigasi utama">
      <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6 dark:border-slate-800">
        <img src={brandMark} alt="SOH Consignment" className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-900/5 dark:ring-white/10" />
        <div><p className="text-[15px] font-semibold tracking-tight text-slate-950 dark:text-white">SOH Consignment</p><p className="text-[11px] font-medium text-slate-400">Consignment control center</p></div>
        <div className="ml-auto lg:hidden"><IconButton label="Tutup navigasi" onClick={() => setMobileOpen(false)}><X size={18} /></IconButton></div>
      </div>
      <div className="px-4 pt-6">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Workspace</p>
        <nav className="space-y-1">
          {navItems.map(({ to, label, caption, icon: Icon }) => (
            <RouterNavLink key={to} to={to} end={to === '/'} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors', isActive ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white')}>
              {({ isActive }) => <><span className={cn('flex h-9 w-9 items-center justify-center rounded-lg transition-colors', isActive ? 'bg-[#0b4a78] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400')}><Icon size={17} aria-hidden="true" /></span><span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className={cn('mt-0.5 block truncate text-[11px]', isActive ? 'text-blue-700 dark:text-blue-200' : 'text-slate-600 dark:text-slate-400')}>{caption}</span></span></>}
            </RouterNavLink>
          ))}
        </nav>
      </div>
      <div className="mt-auto px-4 pb-5">
        <div className="border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#0b4a78] ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"><ClipboardCheck size={16} aria-hidden="true" /></span><StatusBadge status="ready">Connected</StatusBadge></div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white">Jambi / Mendalo</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">Data operasional terhubung ke Google Sheets.</p>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-slate-950 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white">Lewati ke konten utama</a>
      <div className="flex min-h-screen">
        <div className="hidden lg:block">{sidebar}</div>
        {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
        <div className={cn('fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:hidden', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>{sidebar}</div>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 dark:border-slate-800 dark:bg-slate-950/95 sm:px-6 xl:px-9" aria-label="Header halaman">
            <div className="flex min-w-0 items-center gap-3"><div className="lg:hidden"><IconButton label="Buka navigasi" onClick={() => setMobileOpen(true)}><Menu size={19} /></IconButton></div><div className="min-w-0"><h2 className="truncate text-base font-semibold tracking-tight text-slate-950 dark:text-white">{meta.title}</h2><p className="hidden truncate text-xs text-slate-400 sm:block">{meta.subtitle}</p></div></div>
            <div className="flex items-center gap-2 sm:gap-3">
              <IconButton label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'} onClick={toggleTheme}>{dark ? <Sun size={17} /> : <Moon size={17} />}</IconButton>
              <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-800 sm:block" aria-hidden="true" />
              <div className="relative" ref={accountRef}>
                <button type="button" onClick={() => setAccountOpen((current) => !current)} className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 text-left transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a78] dark:hover:bg-slate-900" aria-haspopup="menu" aria-expanded={accountOpen}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0b4a78] text-xs font-semibold text-white">{initials(user?.displayName ?? '')}</span><span className="hidden sm:block"><span className="block max-w-36 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{user?.displayName}</span><span className="block text-[10px] text-slate-400">{user?.role === 'ADMIN' ? 'Administrator' : 'Operator'}</span></span><ChevronDown size={15} className="hidden text-slate-400 sm:block" aria-hidden="true" />
                </button>
                {accountOpen && <div role="menu" className="absolute right-0 top-[calc(100%+8px)] w-56 border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"><div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800"><p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{user?.username}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{user?.email || 'Email belum diisi'}</p></div><button role="menuitem" type="button" onClick={() => { setAccountOpen(false); setPasswordOpen(true) }} className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a78] dark:text-slate-200 dark:hover:bg-slate-800"><KeyRound size={16} aria-hidden="true" />Ganti password</button><button role="menuitem" type="button" onClick={() => void signOut()} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm text-rose-700 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 dark:text-rose-300 dark:hover:bg-rose-950/40"><LogOut size={16} aria-hidden="true" />Keluar</button></div>}
              </div>
            </div>
          </header>
          <main id="main-content" className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 xl:px-9">{children}</main>
        </div>
      </div>

      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Ganti password" description="Sesi lama akan dicabut setelah password berhasil diperbarui." size="sm">
        <div className="space-y-4"><PasswordField id="current-password" label="Password saat ini" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} autoComplete="current-password" required disabled={passwordBusy} /><PasswordField id="profile-new-password" label="Password baru" value={passwordForm.newPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} autoComplete="new-password" required disabled={passwordBusy} hint="Minimal 12 karakter, huruf besar, kecil, angka, dan simbol" /><PasswordField id="profile-confirm-password" label="Ulangi password baru" value={passwordForm.confirmPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} autoComplete="new-password" required disabled={passwordBusy} />{passwordError && <p role="alert" className="border-l-4 border-rose-600 bg-rose-50 px-4 py-3 text-sm text-rose-800">{passwordError}</p>}<div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><Button variant="secondary" onClick={() => setPasswordOpen(false)} disabled={passwordBusy}>Batal</Button><Button onClick={() => void submitPassword()} disabled={passwordBusy || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}>{passwordBusy ? 'Menyimpan...' : 'Simpan password'}</Button></div></div>
      </Modal>
    </div>
  )
}
