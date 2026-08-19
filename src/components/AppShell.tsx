import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Boxes, ChevronDown, KeyRound, LayoutDashboard, LogOut, Menu, Moon, PackageCheck, Sun, UserCog, X } from 'lucide-react'
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom'
import brandMark from '../assets/brand/brand-mark-512.png'
import { useLanguage } from '../i18n/useLanguage'
import { localizedError } from '../lib/localizedError'
import { cn } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useToast } from './toast'
import { Button, IconButton, Modal, PasswordField } from './ui'

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
  const mobileNavItems = navItems.filter((item) => item.to !== '/admin')
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
    <aside className='app-sidebar' aria-label={t('shell.primaryNavigation')}>
      <div className='app-sidebar-brand'>
        <span className='app-sidebar-mark'><img src={brandMark} alt='' aria-hidden='true' /></span>
        <div className='min-w-0'><p>SOH</p><span>Consignment</span></div>
        <div className='ml-auto lg:hidden'><IconButton label={t('shell.closeNavigation')} className='text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white' onClick={() => setMobileOpen(false)}><X size={18} /></IconButton></div>
      </div>

      <div className='app-sidebar-nav-wrap'>
        <p className='app-sidebar-label'>{t('nav.workspace')}</p>
        <nav className='app-sidebar-nav'>
          {navItems.map(({ to, label, icon: Icon }) => (
            <RouterNavLink key={to} to={to} end={to === '/'} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('app-sidebar-link', isActive && 'is-active')}>
              <Icon size={18} aria-hidden='true' />
              <span>{label}</span>
            </RouterNavLink>
          ))}
        </nav>
      </div>
      <div className='app-sidebar-foot' aria-hidden='true'><span />SOH / OPS</div>
    </aside>
  )

  return (
    <div className='app-shell min-h-screen bg-[var(--canvas)] text-[var(--text)]'>
      <a href='#main-content' className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-[var(--sidebar)] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white'>{t('shell.skipToContent')}</a>
      <div className='flex min-h-screen'>
        <div className='hidden lg:block'>{sidebar}</div>
        {mobileOpen && <div className='app-mobile-backdrop' onClick={() => setMobileOpen(false)} aria-hidden='true' />}
        <div className={cn('app-mobile-drawer', mobileOpen && 'is-open')}>{sidebar}</div>
        <div className='app-main-column min-w-0 flex-1'>
          <header className='app-topbar' aria-label={t('shell.applicationHeader')}>
            <div className='flex min-w-0 items-center gap-3'><div className='lg:hidden'><IconButton label={t('shell.openNavigation')} onClick={() => setMobileOpen(true)}><Menu size={19} /></IconButton></div><div className='min-w-0'><p className='app-topbar-kicker'>{meta.title}</p><h2>{meta.subtitle}</h2></div></div>
            <div className='flex items-center gap-2 sm:gap-3'><LanguageSwitcher compact /><IconButton label={dark ? t('shell.lightMode') : t('shell.darkMode')} onClick={toggleTheme}>{dark ? <Sun size={17} /> : <Moon size={17} />}</IconButton><div className='hidden h-7 w-px bg-[var(--border)] sm:block' aria-hidden='true' />
              <div className='relative' ref={accountRef}>
                <button type='button' onClick={() => setAccountOpen((current) => !current)} className='app-account-trigger' aria-haspopup='menu' aria-expanded={accountOpen} aria-label={t('shell.accountMenu')}>
                  <span className='app-account-avatar'>{initials(user?.displayName ?? '')}</span><span className='hidden sm:block'><span className='block max-w-36 truncate text-xs font-semibold text-[var(--text)]'>{user?.displayName}</span><span className='block text-[10px] text-[var(--text-muted)]'>{user?.role === 'ADMIN' ? t('common.administrator') : t('common.operator')}</span></span><ChevronDown size={15} className='hidden text-[var(--text-muted)] sm:block' aria-hidden='true' />
                </button>
                {accountOpen && <div role='menu' className='app-account-menu'><div className='app-account-menu-head'><p>{user?.displayName}</p><span>{user?.username}</span></div><button role='menuitem' type='button' onClick={() => { setAccountOpen(false); setPasswordOpen(true) }}><KeyRound size={16} aria-hidden='true' />{t('shell.changePassword')}</button><button role='menuitem' type='button' className='is-danger' onClick={() => void signOut()}><LogOut size={16} aria-hidden='true' />{t('common.signOut')}</button></div>}
              </div>
            </div>
          </header>
          <main id='main-content' className='app-content'>{children}</main>
        </div>
      </div>

      <nav className='mobile-bottom-nav lg:hidden' aria-label={t('shell.primaryNavigation')}>
        {mobileNavItems.map(({ to, label, icon: Icon }) => <RouterNavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn('mobile-bottom-link', isActive && 'is-active')}><Icon size={19} aria-hidden='true' /><span>{label}</span></RouterNavLink>)}
      </nav>

      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title={t('shell.changePassword')} description={t('shell.changePasswordDescription')} size='sm'>
        <div className='space-y-4'><PasswordField id='current-password' label={t('common.currentPassword')} value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} autoComplete='current-password' required disabled={passwordBusy} /><PasswordField id='profile-new-password' label={t('common.newPassword')} value={passwordForm.newPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} autoComplete='new-password' required disabled={passwordBusy} hint={t('shell.passwordHint')} /><PasswordField id='profile-confirm-password' label={t('common.confirmPassword')} value={passwordForm.confirmPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} autoComplete='new-password' required disabled={passwordBusy} />{passwordError && <p role='alert' className='border-l-4 border-[#a33945] bg-[#f8e9eb] px-4 py-3 text-sm text-[#7f2834]'>{passwordError}</p>}<div className='flex justify-end gap-2 border-t border-[var(--border)] pt-4'><Button variant='secondary' onClick={() => setPasswordOpen(false)} disabled={passwordBusy}>{t('common.cancel')}</Button><Button onClick={() => void submitPassword()} disabled={passwordBusy || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}>{passwordBusy ? t('common.saving') : t('shell.savePassword')}</Button></div></div>
      </Modal>
    </div>
  )
}
