import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Boxes, ChevronDown, CircleCheck, KeyRound, LayoutDashboard, LogOut, Menu, Moon, PackageCheck, Sun, UserCog, X } from 'lucide-react'
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom'
import brandMark from '../assets/brand/brand-mark-512.png'
import { useLanguage } from '../i18n/useLanguage'
import { localizedError } from '../lib/localizedError'
import { cn } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useToast } from './toast'
import { Button, IconButton, Modal, PasswordField, StatusBadge } from './ui'

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'US'
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { language, t } = useLanguage()
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

  const navItems = [
    { to: '/', label: t('nav.overview'), caption: t('nav.overviewCaption'), icon: LayoutDashboard },
    { to: '/inventory', label: t('nav.inventory'), caption: t('nav.inventoryCaption'), icon: Boxes },
    { to: '/outbound', label: t('nav.outbound'), caption: t('nav.outboundCaption'), icon: ArrowUpFromLine },
    { to: '/inbound', label: t('nav.inbound'), caption: t('nav.inboundCaption'), icon: ArrowDownToLine },
    { to: '/refill', label: t('nav.refill'), caption: t('nav.refillCaption'), icon: PackageCheck },
    ...(user?.role === 'ADMIN' ? [{ to: '/admin', label: t('nav.admin'), caption: t('nav.adminCaption'), icon: UserCog }] : []),
  ]
  const pageMeta = {
    '/': { title: t('page.overviewTitle'), subtitle: t('page.overviewSubtitle') },
    '/inventory': { title: t('page.inventoryTitle'), subtitle: t('page.inventorySubtitle') },
    '/outbound': { title: t('page.outboundTitle'), subtitle: t('page.outboundSubtitle') },
    '/inbound': { title: t('page.inboundTitle'), subtitle: t('page.inboundSubtitle') },
    '/refill': { title: t('page.refillTitle'), subtitle: t('page.refillSubtitle') },
    '/admin': { title: t('page.adminTitle'), subtitle: t('page.adminSubtitle') },
  }
  const meta = pageMeta[location.pathname as keyof typeof pageMeta] ?? pageMeta['/']

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

  useEffect(() => {
    if (!mobileOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [mobileOpen])

  const toggleTheme = () => setDark((current) => {
    const next = !current
    document.documentElement.classList.toggle('dark', next)
    window.localStorage.setItem('soh-theme', next ? 'dark' : 'light')
    return next
  })

  const signOut = async () => { setAccountOpen(false); clearData(); await logout() }

  const submitPassword = async () => {
    setPasswordError('')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError(t('shell.passwordMismatch')); return }
    setPasswordBusy(true)
    try {
      await changePassword(passwordForm)
      setPasswordOpen(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      push({ tone: 'success', title: t('shell.passwordUpdated'), description: t('shell.sessionUpdated') })
    } catch (error) {
      setPasswordError(localizedError(error, language, t, 'shell.passwordUpdateFailed'))
    } finally {
      setPasswordBusy(false)
    }
  }

  const sidebar = (
    <aside className='flex h-full w-[268px] flex-col bg-[var(--sidebar)] text-white' aria-label={t('shell.primaryNavigation')}>
      <div className='flex h-[76px] items-center gap-3 border-b border-white/10 px-5'>
        <span className='flex h-10 w-10 items-center justify-center bg-white'><img src={brandMark} alt='' className='h-9 w-9 object-cover' aria-hidden='true' /></span>
        <div className='min-w-0'><p className='truncate text-[15px] font-semibold tracking-tight'>SOH Consignment</p><p className='mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-[#93adbd]'>{t('shell.productCaption')}</p></div>
        <div className='ml-auto lg:hidden'><IconButton label={t('shell.closeNavigation')} className='text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white' onClick={() => setMobileOpen(false)}><X size={18} /></IconButton></div>
      </div>

      <div className='px-3 pt-6'>
        <p className='mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#7896a8]'>{t('nav.workspace')}</p>
        <nav className='space-y-1'>
          {navItems.map(({ to, label, caption, icon: Icon }) => (
            <RouterNavLink key={to} to={to} end={to === '/'} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('group relative grid min-h-[54px] grid-cols-[34px_1fr] items-center gap-3 border border-transparent px-3 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)]', isActive ? 'border-white/10 bg-[var(--sidebar-raised)] text-white before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--brand-orange-bright)]' : 'text-[#b8c9d2] hover:bg-white/[0.06] hover:text-white')}>
              <Icon size={18} className='justify-self-center' aria-hidden='true' />
              <span className='min-w-0'><span className='block truncate text-sm font-semibold'>{label}</span><span className='mt-0.5 block truncate text-[10px] text-[#8fa9b8]'>{caption}</span></span>
            </RouterNavLink>
          ))}
        </nav>
      </div>

      <div className='mt-auto border-t border-white/10 px-5 py-5'>
        <div className='flex items-center gap-3'>
          <span className='flex h-8 w-8 shrink-0 items-center justify-center bg-[#254d6b] text-xs font-semibold text-white'>{initials(user?.displayName ?? '')}</span>
          <div className='min-w-0'>
            <p className='truncate text-xs font-semibold text-white'>{user?.displayName}</p>
            <p className='mt-0.5 truncate text-[10px] text-[#8fa9b8]'>{user?.role === 'ADMIN' ? t('common.administrator') : t('common.operator')}</p>
          </div>
        </div>
      </div>
    </aside>
  )

  return (
    <div className='min-h-screen bg-[var(--canvas)] text-[var(--text)]'>
      <a href='#main-content' className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-[var(--sidebar)] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white'>{t('shell.skipToContent')}</a>
      <div className='flex min-h-screen'>
        <div className='hidden lg:block'>{sidebar}</div>
        {mobileOpen && <div className='fixed inset-0 z-40 bg-[#07131d]/65 lg:hidden' onClick={() => setMobileOpen(false)} aria-hidden='true' />}
        <div className={cn('fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:hidden', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>{sidebar}</div>
        <div className='min-w-0 flex-1'>
          <header className='sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6 xl:px-9' aria-label={t('shell.applicationHeader')}>
            <div className='flex min-w-0 items-center gap-3'><div className='lg:hidden'><IconButton label={t('shell.openNavigation')} onClick={() => setMobileOpen(true)}><Menu size={19} /></IconButton></div><div className='min-w-0'><p className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-orange)]'>{meta.title}</p><h2 className='truncate text-base font-semibold tracking-tight text-[var(--text)]'>{meta.subtitle}</h2></div></div>
            <div className='flex items-center gap-2 sm:gap-3'><LanguageSwitcher compact /><IconButton label={dark ? t('shell.lightMode') : t('shell.darkMode')} onClick={toggleTheme}>{dark ? <Sun size={17} /> : <Moon size={17} />}</IconButton><div className='hidden h-7 w-px bg-[var(--border)] sm:block' aria-hidden='true' />
              <div className='relative' ref={accountRef}>
                <button type='button' onClick={() => setAccountOpen((current) => !current)} className='flex min-h-11 items-center gap-2 px-1.5 text-left transition-colors hover:bg-[var(--surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]' aria-haspopup='menu' aria-expanded={accountOpen} aria-label={t('shell.accountMenu')}>
                  <span className='flex h-9 w-9 items-center justify-center bg-[var(--brand-blue)] text-xs font-semibold text-white'>{initials(user?.displayName ?? '')}</span><span className='hidden sm:block'><span className='block max-w-36 truncate text-xs font-semibold text-[var(--text)]'>{user?.displayName}</span><span className='block text-[10px] text-[var(--text-muted)]'>{user?.role === 'ADMIN' ? t('common.administrator') : t('common.operator')}</span></span><ChevronDown size={15} className='hidden text-[var(--text-muted)] sm:block' aria-hidden='true' />
                </button>
                {accountOpen && <div role='menu' className='absolute right-0 top-[calc(100%+8px)] z-40 w-60 border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl'><div className='border-b border-[var(--border)] px-3 py-2.5'><p className='truncate text-xs font-semibold text-[var(--text)]'>{user?.username}</p><p className='mt-0.5 truncate text-[11px] text-[var(--text-muted)]'>{user?.email || t('shell.emailMissing')}</p></div><button role='menuitem' type='button' onClick={() => { setAccountOpen(false); setPasswordOpen(true) }} className='mt-1 flex min-h-10 w-full items-center gap-2 px-3 text-sm text-[var(--text)] hover:bg-[var(--surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)]'><KeyRound size={16} aria-hidden='true' />{t('shell.changePassword')}</button><button role='menuitem' type='button' onClick={() => void signOut()} className='flex min-h-10 w-full items-center gap-2 px-3 text-sm text-[#a33945] hover:bg-[#f8e9eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a33945]'><LogOut size={16} aria-hidden='true' />{t('common.signOut')}</button></div>}
              </div>
            </div>
          </header>
          <main id='main-content' className='mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 xl:px-9'>{children}</main>
        </div>
      </div>

      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title={t('shell.changePassword')} description={t('shell.changePasswordDescription')} size='sm'>
        <div className='space-y-4'><PasswordField id='current-password' label={t('common.currentPassword')} value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} autoComplete='current-password' required disabled={passwordBusy} /><PasswordField id='profile-new-password' label={t('common.newPassword')} value={passwordForm.newPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} autoComplete='new-password' required disabled={passwordBusy} hint={t('shell.passwordHint')} /><PasswordField id='profile-confirm-password' label={t('common.confirmPassword')} value={passwordForm.confirmPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} autoComplete='new-password' required disabled={passwordBusy} />{passwordError && <p role='alert' className='border-l-4 border-[#a33945] bg-[#f8e9eb] px-4 py-3 text-sm text-[#7f2834]'>{passwordError}</p>}<div className='flex justify-end gap-2 border-t border-[var(--border)] pt-4'><Button variant='secondary' onClick={() => setPasswordOpen(false)} disabled={passwordBusy}>{t('common.cancel')}</Button><Button onClick={() => void submitPassword()} disabled={passwordBusy || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}>{passwordBusy ? t('common.saving') : t('shell.savePassword')}</Button></div></div>
      </Modal>
    </div>
  )
}
