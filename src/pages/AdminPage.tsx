import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, LockOpen, Plus, RefreshCw, Shield, UserRound, Users, X } from 'lucide-react'
import { useToast } from '../components/toast'
import { Button, Modal, SectionHeader, SelectField, StatusBadge, TextField } from '../components/ui'
import { useLanguage } from '../i18n/useLanguage'
import { adminCreateUser, adminResetPassword, adminSetActive, adminSetRole, adminUnlockUser, getAdminOverview } from '../lib/api'
import { localizedError } from '../lib/localizedError'
import { useAuthStore } from '../store/authStore'
import type { AdminOverview, AdminUser, UserRole } from '../types'

type Tab = 'users' | 'sessions' | 'audit'
type ConfirmAction = { type: 'reset' | 'toggle'; user: AdminUser } | null
const emptyOverview: AdminOverview = { metrics: { totalUsers: 0, activeUsers: 0, lockedUsers: 0, activeSessions: 0 }, users: [], sessions: [], audit: [] }

export default function AdminPage() {
  const { language, t, formatDateTime, formatNumber } = useLanguage()
  const token = useAuthStore((state) => state.token)
  const currentUser = useAuthStore((state) => state.user)
  const { push } = useToast()
  const [overview, setOverview] = useState<AdminOverview>(emptyOverview)
  const [tab, setTab] = useState<Tab>('users')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmAction>(null)
  const [credential, setCredential] = useState<{ username: string; password: string } | null>(null)
  const [form, setForm] = useState({ username: '', email: '', displayName: '', role: 'OPERATOR' as UserRole })
  const [referenceTime, setReferenceTime] = useState(0)

  const load = useCallback(async (silent = false) => {
    if (!token) return
    if (!silent) setLoading(true)
    setError('')
    try {
      setOverview((await getAdminOverview(token)).data)
      setReferenceTime(Date.now())
    } catch (requestError) {
      setError(localizedError(requestError, language, t, 'admin.loadFailed'))
    } finally { setLoading(false) }
  }, [language, t, token])

  useEffect(() => {
    if (!token) return
    void getAdminOverview(token).then((response) => {
      setOverview(response.data)
      setReferenceTime(Date.now())
      setLoading(false)
    }).catch((requestError) => {
      setError(localizedError(requestError, language, t, 'admin.loadFailed'))
      setLoading(false)
    })
  }, [language, t, token])
  const lockedUsers = useMemo(() => overview.users.filter((user) => user.lockedUntil && new Date(user.lockedUntil).getTime() > referenceTime).length, [overview.users, referenceTime])
  const roleLabel = (role: UserRole) => role === 'ADMIN' ? t('common.administrator') : t('common.operator')
  const userStatus = (user: AdminUser) => {
    if (!user.active) return { label: t('common.inactive'), status: 'neutral' as const }
    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > referenceTime) return { label: t('common.locked'), status: 'danger' as const }
    if (user.mustChangePassword) return { label: t('admin.statusMustChange'), status: 'warning' as const }
    return { label: t('common.active'), status: 'ready' as const }
  }

  const createUser = async () => {
    if (!token) return
    setBusy('create')
    setError('')
    try {
      const response = await adminCreateUser(token, form)
      setCreateOpen(false)
      setForm({ username: '', email: '', displayName: '', role: 'OPERATOR' })
      setCredential({ username: response.data.user.username, password: response.data.temporaryPassword })
      push({ tone: 'success', title: t('admin.userCreated'), description: t('admin.userCreatedDescription') })
      await load(true)
    } catch (requestError) {
      setError(localizedError(requestError, language, t, 'admin.createFailed'))
    } finally { setBusy('') }
  }

  const executeConfirm = async () => {
    if (!token || !confirm) return
    setBusy(confirm.user.id)
    try {
      if (confirm.type === 'reset') {
        const response = await adminResetPassword(token, confirm.user.id)
        setCredential({ username: response.data.user.username, password: response.data.temporaryPassword })
        push({ tone: 'success', title: t('admin.passwordReset'), description: t('admin.passwordResetDescription') })
      } else {
        await adminSetActive(token, confirm.user.id, !confirm.user.active)
        push({ tone: 'success', title: confirm.user.active ? t('admin.userDeactivated') : t('admin.userActivated'), description: confirm.user.username })
      }
      setConfirm(null)
      await load(true)
    } catch (requestError) {
      setError(localizedError(requestError, language, t, 'admin.actionFailed'))
    } finally { setBusy('') }
  }

  const unlock = async (user: AdminUser) => {
    if (!token) return
    setBusy(user.id)
    try {
      await adminUnlockUser(token, user.id)
      push({ tone: 'success', title: t('admin.accountUnlocked'), description: t('admin.accountUnlockedDescription', { username: user.username }) })
      await load(true)
    } catch (requestError) {
      setError(localizedError(requestError, language, t, 'admin.unlockFailed'))
    } finally { setBusy('') }
  }

  const changeRole = async (user: AdminUser, role: UserRole) => {
    if (!token || role === user.role) return
    setBusy(user.id)
    try {
      await adminSetRole(token, user.id, role)
      push({ tone: 'success', title: t('admin.roleUpdated'), description: t('admin.roleUpdatedDescription', { username: user.username, role: roleLabel(role) }) })
      await load(true)
    } catch (requestError) {
      setError(localizedError(requestError, language, t, 'admin.roleUpdateFailed'))
    } finally { setBusy('') }
  }

  const copyCredential = async () => {
    if (!credential) return
    await navigator.clipboard?.writeText(`${t('common.username')}: ${credential.username}\n${t('admin.temporaryPassword')}: ${credential.password}`)
    push({ tone: 'success', title: t('common.copied'), description: t('admin.credentialsCopied') })
  }

  const metrics = [
    { label: t('admin.totalUsers'), value: overview.metrics.totalUsers, icon: Users },
    { label: t('admin.activeUsers'), value: overview.metrics.activeUsers, icon: UserRound },
    { label: t('admin.lockedAccounts'), value: lockedUsers, icon: LockOpen, emphasis: lockedUsers > 0 },
    { label: t('admin.activeSessions'), value: overview.metrics.activeSessions, icon: Shield },
  ]

  return (
    <div className='operational-view'>
      <SectionHeader eyebrow={t('admin.eyebrow')} title={t('admin.title')} description={t('admin.description')} action={<div className='flex gap-2'><Button variant='secondary' size='sm' onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden='true' />{t('common.reload')}</Button><Button size='sm' onClick={() => setCreateOpen(true)}><Plus size={16} aria-hidden='true' />{t('admin.newUser')}</Button></div>} />
      {error && <div role='alert' className='mb-5 flex items-start justify-between gap-4 border-l-4 border-[#a33945] bg-[#f8e9eb] px-4 py-3 text-sm leading-6 text-[#7f2834]'><span>{error}</span><button type='button' aria-label={t('common.close')} onClick={() => setError('')}><X size={16} /></button></div>}

      <section className='app-panel mb-6 grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4' aria-label={t('admin.title')}>
        {metrics.map(({ label, value, icon: Icon, emphasis }, index) => <div key={label} className={`flex min-h-[104px] items-center gap-4 p-5 ${index < metrics.length - 1 ? 'border-b border-[var(--border)] sm:border-r xl:border-b-0' : ''}`}><Icon size={20} className={emphasis ? 'text-[var(--danger)]' : 'text-[var(--brand-blue)]'} aria-hidden='true' /><div><p className={`text-2xl font-semibold ${emphasis ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}>{formatNumber(value)}</p><p className='mt-1 text-xs text-[var(--text-muted)]'>{label}</p></div></div>)}
      </section>

      <section className='app-panel overflow-hidden' aria-labelledby='admin-content-title'>
        <div className='flex flex-wrap items-center gap-6 border-b border-[var(--border)] px-5 sm:px-6'><h2 id='admin-content-title' className='sr-only'>{t('admin.title')}</h2>{([['users', t('admin.usersTab')], ['sessions', t('admin.sessionsTab')], ['audit', t('admin.auditTab')]] as Array<[Tab, string]>).map(([value, label]) => <button key={value} type='button' onClick={() => setTab(value)} className={`border-b-[3px] py-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${tab === value ? 'border-[var(--brand-orange)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`} aria-pressed={tab === value}>{label}</button>)}</div>
        {loading ? <div className='flex min-h-64 items-center justify-center text-sm text-[var(--text-muted)]'>{t('admin.loading')}</div> : tab === 'users' ? (
          <div className='overflow-x-auto'><table className='data-table min-w-[980px]'><caption className='sr-only'>{t('admin.usersTab')}</caption><thead><tr><th scope='col'>{t('admin.identityColumn')}</th><th scope='col'>{t('admin.roleColumn')}</th><th scope='col'>{t('common.status')}</th><th scope='col'>{t('admin.lastLoginColumn')}</th><th scope='col' className='text-right'>{t('common.actions')}</th></tr></thead><tbody>{overview.users.map((user) => { const status = userStatus(user); const self = user.id === currentUser?.id; return <tr key={user.id}><td><p className='font-semibold text-[var(--text)]'>{user.displayName}</p><p className='mt-1 text-xs text-[var(--text-muted)]'>{user.username}{user.email ? ` | ${user.email}` : ''}</p></td><td><select value={user.role} onChange={(event) => void changeRole(user, event.target.value as UserRole)} disabled={self || busy === user.id} className='min-h-9 rounded-[5px] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2.5 text-xs font-semibold text-[var(--text)] outline-none focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange)]/15' aria-label={`${t('admin.role')} ${user.username}`}><option value='OPERATOR'>{t('common.operator')}</option><option value='ADMIN'>{t('common.administrator')}</option></select></td><td><StatusBadge status={status.status}>{status.label}</StatusBadge>{user.failedAttempts > 0 && <p className='mt-2 text-xs text-[var(--text-muted)]'>{t('admin.failedAttempts', { count: formatNumber(user.failedAttempts) })}</p>}</td><td className='whitespace-nowrap text-xs text-[var(--text-muted)]'>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : t('admin.neverSignedIn')}</td><td><div className='flex justify-end gap-1.5'><Button variant='secondary' size='sm' onClick={() => setConfirm({ type: 'reset', user })} disabled={self || Boolean(busy)}>{t('admin.resetPassword')}</Button>{status.status === 'danger' && <Button variant='secondary' size='sm' onClick={() => void unlock(user)} disabled={Boolean(busy)}><LockOpen size={14} aria-hidden='true' />{t('admin.unlock')}</Button>}<Button variant={user.active ? 'ghost' : 'subtle'} size='sm' onClick={() => setConfirm({ type: 'toggle', user })} disabled={self || Boolean(busy)}>{user.active ? t('admin.deactivate') : t('admin.activate')}</Button></div></td></tr>})}</tbody></table>{overview.users.length === 0 && <div className='p-10 text-center text-sm text-[var(--text-muted)]'>{t('admin.noUsers')}</div>}</div>
        ) : tab === 'sessions' ? (
          <div className='overflow-x-auto'><table className='data-table min-w-[780px]'><caption className='sr-only'>{t('admin.sessionsCaption')}</caption><thead><tr><th scope='col'>{t('admin.identityColumn')}</th><th scope='col'>{t('admin.sessionType')}</th><th scope='col'>{t('admin.createdAt')}</th><th scope='col'>{t('admin.expiresAt')}</th><th scope='col'>{t('admin.client')}</th></tr></thead><tbody>{overview.sessions.map((session) => <tr key={session.id}><td><p className='font-semibold text-[var(--text)]'>{session.displayName}</p><p className='mt-1 text-xs text-[var(--text-muted)]'>{session.username}</p></td><td className='text-xs text-[var(--text-muted)]'>{session.purpose === 'APP' ? t('admin.applicationSession') : t('admin.passwordChangeSession')}</td><td className='whitespace-nowrap text-xs text-[var(--text-muted)]'>{formatDateTime(session.createdAt)}</td><td className='whitespace-nowrap text-xs text-[var(--text-muted)]'>{formatDateTime(session.expiresAt)}</td><td className='max-w-[280px] truncate text-xs text-[var(--text-muted)]' title={session.client}>{session.client || t('common.notAvailable')}</td></tr>)}</tbody></table>{overview.sessions.length === 0 && <div className='p-10 text-center text-sm text-[var(--text-muted)]'>{t('admin.noSessions')}</div>}</div>
        ) : (
          <div className='overflow-x-auto'><table className='data-table min-w-[820px]'><caption className='sr-only'>{t('admin.auditCaption')}</caption><thead><tr><th scope='col'>{t('common.date')}</th><th scope='col'>{t('admin.event')}</th><th scope='col'>{t('admin.identityColumn')}</th><th scope='col'>{t('admin.result')}</th><th scope='col'>{t('admin.details')}</th></tr></thead><tbody>{overview.audit.map((entry) => <tr key={entry.id}><td className='whitespace-nowrap text-xs text-[var(--text-muted)]'>{formatDateTime(entry.createdAt)}</td><td className='text-xs font-semibold text-[var(--text)]'>{entry.eventType}</td><td className='text-xs text-[var(--text-muted)]'>{entry.username || t('common.unknown')}</td><td><StatusBadge status={entry.outcome === 'SUCCESS' ? 'ready' : entry.outcome === 'BLOCKED' ? 'warning' : 'danger'}>{entry.outcome === 'SUCCESS' ? t('admin.success') : entry.outcome === 'BLOCKED' ? t('admin.blocked') : t('admin.failed')}</StatusBadge></td><td className='max-w-[360px] text-xs leading-5 text-[var(--text-muted)]'>{entry.details}</td></tr>)}</tbody></table>{overview.audit.length === 0 && <div className='p-10 text-center text-sm text-[var(--text-muted)]'>{t('admin.noAudit')}</div>}</div>
        )}
      </section>
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('admin.createTitle')} description={t('admin.createDescription')} size='sm'>
        <div className='space-y-4'><TextField id='admin-display-name' label={t('admin.displayName')} value={form.displayName} onChange={(value) => setForm((current) => ({ ...current, displayName: value }))} placeholder={t('admin.displayNamePlaceholder')} required /><TextField id='admin-username' label={t('common.username')} value={form.username} onChange={(value) => setForm((current) => ({ ...current, username: value.toLowerCase() }))} placeholder={t('admin.usernamePlaceholder')} required /><TextField id='admin-email' label={t('common.email')} type='email' value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} hint={t('common.optional')} /><SelectField id='admin-role' label={t('admin.role')} value={form.role} onChange={(value) => setForm((current) => ({ ...current, role: value as UserRole }))} options={[{ value: 'OPERATOR', label: t('common.operator') }, { value: 'ADMIN', label: t('common.administrator') }]} /><div className='flex justify-end gap-2 border-t border-[var(--border)] pt-4'><Button variant='secondary' onClick={() => setCreateOpen(false)} disabled={busy === 'create'}>{t('common.cancel')}</Button><Button onClick={() => void createUser()} disabled={busy === 'create' || !form.displayName.trim() || !form.username.trim()}>{busy === 'create' ? t('admin.creating') : t('admin.create')}</Button></div></div>
      </Modal>

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm?.type === 'reset' ? t('admin.resetConfirmTitle') : confirm?.user.active ? t('admin.deactivateTitle') : t('admin.activateTitle')} description={confirm?.type === 'reset' ? t('admin.resetConfirmDescription') : confirm?.user.active ? t('admin.deactivateDescription') : t('admin.activateDescription')} size='sm'>
        <div className='flex justify-end gap-2'><Button variant='secondary' onClick={() => setConfirm(null)} disabled={Boolean(busy)}>{t('common.cancel')}</Button><Button variant={confirm?.type === 'toggle' && confirm.user.active ? 'danger' : 'primary'} onClick={() => void executeConfirm()} disabled={Boolean(busy)}>{confirm?.type === 'reset' ? t('admin.resetPassword') : confirm?.user.active ? t('admin.deactivate') : t('admin.activate')}</Button></div>
      </Modal>

      <Modal open={Boolean(credential)} onClose={() => setCredential(null)} title={t('admin.credentialsTitle')} description={t('admin.credentialsDescription')} size='sm'>
        {credential && <div><dl className='divide-y divide-[var(--border)] border border-[var(--border)]'><div className='grid grid-cols-[140px_1fr] gap-3 px-4 py-3 text-sm'><dt className='text-[var(--text-muted)]'>{t('common.username')}</dt><dd className='break-all font-mono text-[var(--text)]'>{credential.username}</dd></div><div className='grid grid-cols-[140px_1fr] gap-3 px-4 py-3 text-sm'><dt className='text-[var(--text-muted)]'>{t('admin.temporaryPassword')}</dt><dd className='break-all font-mono font-semibold text-[var(--text)]'>{credential.password}</dd></div></dl><div className='mt-4 flex justify-end gap-2'><Button variant='secondary' onClick={() => void copyCredential()}><Copy size={15} aria-hidden='true' />{t('admin.copyCredentials')}</Button><Button onClick={() => setCredential(null)}>{t('common.close')}</Button></div></div>}
      </Modal>
    </div>
  )
}
