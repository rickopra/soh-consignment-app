import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, LockOpen, Plus, RefreshCw, Shield, UserRound, Users, X } from 'lucide-react'
import { useToast } from '../components/toast'
import { Button, Modal, SectionHeader, SelectField, StatusBadge, TextField } from '../components/ui'
import { ApiError, adminCreateUser, adminResetPassword, adminSetActive, adminSetRole, adminUnlockUser, getAdminOverview } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import type { AdminOverview, AdminUser, UserRole } from '../types'

type Tab = 'users' | 'sessions' | 'audit'
type ConfirmAction = { type: 'reset' | 'toggle'; user: AdminUser } | null

const emptyOverview: AdminOverview = { metrics: { totalUsers: 0, activeUsers: 0, lockedUsers: 0, activeSessions: 0 }, users: [], sessions: [], audit: [] }

function dateTime(value: string) {
  if (!value) return 'Belum ada'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function roleLabel(role: UserRole) {
  return role === 'ADMIN' ? 'Administrator' : 'Operator'
}

function userStatus(user: AdminUser, referenceTime: number) {
  if (!user.active) return { label: 'Nonaktif', status: 'neutral' as const }
  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > referenceTime) return { label: 'Terkunci', status: 'danger' as const }
  if (user.mustChangePassword) return { label: 'Wajib ganti password', status: 'warning' as const }
  return { label: 'Aktif', status: 'ready' as const }
}

export default function AdminPage() {
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
      setError(requestError instanceof ApiError ? requestError.message : 'Data administrator gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    void getAdminOverview(token).then((response) => {
      setOverview(response.data)
      setReferenceTime(Date.now())
      setLoading(false)
    }).catch((requestError) => {
      setError(requestError instanceof ApiError ? requestError.message : 'Data administrator gagal dimuat.')
      setLoading(false)
    })
  }, [token])

  const lockedUsers = useMemo(() => overview.users.filter((user) => user.lockedUntil && new Date(user.lockedUntil).getTime() > referenceTime).length, [overview.users, referenceTime])

  const createUser = async () => {
    if (!token) return
    setBusy('create')
    setError('')
    try {
      const response = await adminCreateUser(token, form)
      setCreateOpen(false)
      setForm({ username: '', email: '', displayName: '', role: 'OPERATOR' })
      setCredential({ username: response.data.user.username, password: response.data.temporaryPassword })
      push({ tone: 'success', title: 'Pengguna dibuat', description: 'Simpan password sementara sebelum menutup dialog.' })
      await load(true)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Pengguna gagal dibuat.')
    } finally {
      setBusy('')
    }
  }

  const executeConfirm = async () => {
    if (!token || !confirm) return
    setBusy(confirm.user.id)
    try {
      if (confirm.type === 'reset') {
        const response = await adminResetPassword(token, confirm.user.id)
        setCredential({ username: response.data.user.username, password: response.data.temporaryPassword })
        push({ tone: 'success', title: 'Password direset', description: 'Password sementara hanya ditampilkan sekali.' })
      } else {
        await adminSetActive(token, confirm.user.id, !confirm.user.active)
        push({ tone: 'success', title: confirm.user.active ? 'Pengguna dinonaktifkan' : 'Pengguna diaktifkan', description: confirm.user.username })
      }
      setConfirm(null)
      await load(true)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Aksi administrator gagal.')
    } finally {
      setBusy('')
    }
  }

  const unlock = async (user: AdminUser) => {
    if (!token) return
    setBusy(user.id)
    try {
      await adminUnlockUser(token, user.id)
      push({ tone: 'success', title: 'Akun dibuka', description: `${user.username} dapat mencoba login kembali.` })
      await load(true)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Akun gagal dibuka.')
    } finally {
      setBusy('')
    }
  }

  const changeRole = async (user: AdminUser, role: UserRole) => {
    if (!token || role === user.role) return
    setBusy(user.id)
    try {
      await adminSetRole(token, user.id, role)
      push({ tone: 'success', title: 'Role diperbarui', description: `${user.username} sekarang ${roleLabel(role)}.` })
      await load(true)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Role gagal diperbarui.')
    } finally {
      setBusy('')
    }
  }

  const copyCredential = async () => {
    if (!credential) return
    await navigator.clipboard?.writeText(`Username: ${credential.username}\nPassword sementara: ${credential.password}`)
    push({ tone: 'success', title: 'Disalin', description: 'Kredensial sementara disalin ke clipboard.' })
  }

  return (
    <div>
      <SectionHeader eyebrow="Administrasi" title="Kontrol akses" description="Kelola akun, sesi, dan jejak autentikasi tanpa mengubah data operasional." action={<div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />Muat ulang</Button><Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={16} aria-hidden="true" />Pengguna baru</Button></div>} />
      {error && <div role="alert" className="mb-5 flex items-start justify-between gap-4 border-l-4 border-rose-600 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"><span>{error}</span><button type="button" aria-label="Tutup pesan error" onClick={() => setError('')}><X size={16} /></button></div>}
      <section className="mb-6 grid border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan akses">
        <Metric label="Total pengguna" value={overview.metrics.totalUsers} icon={Users} />
        <Metric label="Pengguna aktif" value={overview.metrics.activeUsers} icon={UserRound} />
        <Metric label="Akun terkunci" value={lockedUsers} icon={LockOpen} emphasis={lockedUsers > 0} />
        <Metric label="Sesi aktif" value={overview.metrics.activeSessions} icon={Shield} />
      </section>
      <section className="border border-slate-200 bg-white" aria-labelledby="admin-content-title">
        <div className="flex flex-wrap items-center gap-6 border-b border-slate-200 px-5 sm:px-6">
          <h2 id="admin-content-title" className="sr-only">Administrasi akses</h2>
          {([['users', 'Pengguna'], ['sessions', 'Sesi aktif'], ['audit', 'Log audit']] as Array<[Tab, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`border-b-2 py-4 text-sm font-semibold transition-colors ${tab === value ? 'border-[#0b4a78] text-[#0b4a78]' : 'border-transparent text-slate-500 hover:text-slate-900'}`} aria-pressed={tab === value}>{label}</button>)}
        </div>
        {loading ? <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">Memuat data akses...</div> : tab === 'users' ? <UserTable users={overview.users} currentUserId={currentUser?.id ?? ''} busy={busy} referenceTime={referenceTime} onRoleChange={changeRole} onUnlock={unlock} onToggle={(user) => setConfirm({ type: 'toggle', user })} onReset={(user) => setConfirm({ type: 'reset', user })} /> : tab === 'sessions' ? <SessionTable sessions={overview.sessions} /> : <AuditTable entries={overview.audit} />}
      </section>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Buat pengguna baru" description="Password sementara dibuat oleh backend dan wajib diganti saat login pertama." size="sm">
        <div className="space-y-4">
          <TextField id="admin-display-name" label="Nama pengguna" value={form.displayName} onChange={(value) => setForm((current) => ({ ...current, displayName: value }))} placeholder="Contoh: Warehouse Operator" required />
          <TextField id="admin-username" label="Username" value={form.username} onChange={(value) => setForm((current) => ({ ...current, username: value.toLowerCase() }))} placeholder="warehouse.operator" hint="Huruf kecil, angka, titik, underscore, atau minus" required />
          <TextField id="admin-email" label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} placeholder="ops@example.com" type="text" />
          <SelectField id="admin-role" label="Role" value={form.role} onChange={(value) => setForm((current) => ({ ...current, role: value as UserRole }))} options={[{ value: 'OPERATOR', label: 'Operator' }, { value: 'ADMIN', label: 'Administrator' }]} required />
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={busy === 'create'}>Batal</Button><Button onClick={() => void createUser()} disabled={busy === 'create' || !form.displayName || !form.username}>{busy === 'create' ? 'Membuat...' : 'Buat pengguna'}</Button></div>
        </div>
      </Modal>

      <Modal open={Boolean(credential)} onClose={() => setCredential(null)} title="Password sementara" description="Sampaikan kredensial ini melalui kanal internal. Dialog ini tidak akan menampilkan ulang password setelah ditutup." size="sm">
        {credential && <div className="space-y-5"><div className="border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><p className="font-semibold">Wajib ganti saat login pertama</p><p className="mt-1">Password hanya dibuat dan ditampilkan kali ini.</p></div><dl className="divide-y divide-slate-200 border border-slate-200"><CredentialRow label="Username" value={credential.username} /><CredentialRow label="Password" value={credential.password} /></dl><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setCredential(null)}>Tutup</Button><Button onClick={() => void copyCredential()}><Copy size={15} aria-hidden="true" />Salin kredensial</Button></div></div>}
      </Modal>

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm?.type === 'reset' ? 'Reset password pengguna?' : confirm?.user.active ? 'Nonaktifkan pengguna?' : 'Aktifkan pengguna?'} description="Aksi ini akan dicatat pada audit log." size="sm">
        {confirm && <div className="space-y-5"><p className="text-sm leading-6 text-slate-600">{confirm.type === 'reset' ? `Password ${confirm.user.username} akan diganti dengan password sementara baru dan seluruh session aktifnya dicabut.` : confirm.user.active ? `Akun ${confirm.user.username} tidak dapat login sampai diaktifkan kembali.` : `Akun ${confirm.user.username} dapat login kembali setelah diaktifkan.`}</p><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirm(null)} disabled={Boolean(busy)}>Batal</Button><Button variant={confirm.type === 'toggle' && confirm.user.active ? 'danger' : 'primary'} onClick={() => void executeConfirm()} disabled={Boolean(busy)}>{busy ? 'Memproses...' : confirm.type === 'reset' ? 'Reset password' : confirm.user.active ? 'Nonaktifkan' : 'Aktifkan'}</Button></div></div>}
      </Modal>
    </div>
  )
}

function Metric({ label, value, icon: Icon, emphasis }: { label: string; value: number; icon: typeof Users; emphasis?: boolean }) {
  return <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0"><span className={`flex h-9 w-9 items-center justify-center rounded-md ${emphasis ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-[#0b4a78]'}`}><Icon size={17} aria-hidden="true" /></span><div><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 text-xl font-semibold text-slate-950">{value}</p></div></div>
}

function UserTable({ users, currentUserId, busy, referenceTime, onRoleChange, onUnlock, onToggle, onReset }: { users: AdminUser[]; currentUserId: string; busy: string; referenceTime: number; onRoleChange: (user: AdminUser, role: UserRole) => void; onUnlock: (user: AdminUser) => void; onToggle: (user: AdminUser) => void; onReset: (user: AdminUser) => void }) {
  return <div className="overflow-x-auto"><table className="min-w-[900px] w-full border-collapse text-left"><caption className="sr-only">Daftar pengguna dan status akses</caption><thead><tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500"><th className="px-5 py-3 sm:px-6">Pengguna</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Login terakhir</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => { const status = userStatus(user, referenceTime); const self = user.id === currentUserId; return <tr key={user.id} className="align-top hover:bg-slate-50/80"><td className="px-5 py-4 sm:px-6"><p className="font-semibold text-slate-900">{user.displayName}</p><p className="mt-1 text-xs text-slate-500">{user.username}{user.email ? ` · ${user.email}` : ''}</p></td><td className="px-5 py-4"><select value={user.role} onChange={(event) => onRoleChange(user, event.target.value as UserRole)} disabled={self || busy === user.id} className="min-h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#0b4a78] focus:ring-2 focus:ring-[#0b4a78]/15" aria-label={`Role ${user.username}`}><option value="OPERATOR">Operator</option><option value="ADMIN">Administrator</option></select></td><td className="px-5 py-4"><StatusBadge status={status.status}>{status.label}</StatusBadge>{user.failedAttempts > 0 && <p className="mt-2 text-xs text-slate-500">{user.failedAttempts} percobaan gagal</p>}</td><td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">{user.lastLoginAt ? dateTime(user.lastLoginAt) : 'Belum login'}</td><td className="px-5 py-4"><div className="flex justify-end gap-1.5"><Button variant="secondary" size="sm" onClick={() => onReset(user)} disabled={self || Boolean(busy)}>Reset password</Button>{status.status === 'danger' && <Button variant="secondary" size="sm" onClick={() => onUnlock(user)} disabled={Boolean(busy)}><LockOpen size={14} aria-hidden="true" />Buka lock</Button>}<Button variant={user.active ? 'ghost' : 'subtle'} size="sm" onClick={() => onToggle(user)} disabled={self || Boolean(busy)}>{user.active ? 'Nonaktifkan' : 'Aktifkan'}</Button></div></td></tr>})}</tbody></table>{users.length === 0 && <div className="p-10 text-center text-sm text-slate-500">Belum ada pengguna.</div>}</div>
}

function SessionTable({ sessions }: { sessions: AdminOverview['sessions'] }) {
  return <div className="overflow-x-auto"><table className="min-w-[760px] w-full border-collapse text-left"><caption className="sr-only">Session aktif</caption><thead><tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500"><th className="px-5 py-3 sm:px-6">Pengguna</th><th className="px-5 py-3">Jenis</th><th className="px-5 py-3">Dibuat</th><th className="px-5 py-3">Berakhir</th><th className="px-5 py-3">Client</th></tr></thead><tbody className="divide-y divide-slate-100">{sessions.map((session) => <tr key={session.id}><td className="px-5 py-4 sm:px-6"><p className="font-semibold text-slate-900">{session.displayName}</p><p className="mt-1 text-xs text-slate-500">{session.username}</p></td><td className="px-5 py-4 text-xs text-slate-600">{session.purpose === 'APP' ? 'Aplikasi' : 'Ganti password'}</td><td className="px-5 py-4 text-xs text-slate-600">{dateTime(session.createdAt)}</td><td className="px-5 py-4 text-xs text-slate-600">{dateTime(session.expiresAt)}</td><td className="max-w-[260px] truncate px-5 py-4 text-xs text-slate-500" title={session.client}>{session.client || 'Tidak tersedia'}</td></tr>)}</tbody></table>{sessions.length === 0 && <div className="p-10 text-center text-sm text-slate-500">Tidak ada session aktif.</div>}</div>
}

function AuditTable({ entries }: { entries: AdminOverview['audit'] }) {
  return <div className="overflow-x-auto"><table className="min-w-[760px] w-full border-collapse text-left"><caption className="sr-only">Audit autentikasi</caption><thead><tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500"><th className="px-5 py-3 sm:px-6">Waktu</th><th className="px-5 py-3">Event</th><th className="px-5 py-3">Pengguna</th><th className="px-5 py-3">Hasil</th><th className="px-5 py-3">Detail</th></tr></thead><tbody className="divide-y divide-slate-100">{entries.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600 sm:px-6">{dateTime(entry.createdAt)}</td><td className="px-5 py-4 text-xs font-semibold text-slate-800">{entry.eventType}</td><td className="px-5 py-4 text-xs text-slate-600">{entry.username || 'Unknown'}</td><td className="px-5 py-4"><StatusBadge status={entry.outcome === 'SUCCESS' ? 'ready' : entry.outcome === 'BLOCKED' ? 'warning' : 'danger'}>{entry.outcome}</StatusBadge></td><td className="max-w-[340px] px-5 py-4 text-xs leading-5 text-slate-600">{entry.details}</td></tr>)}</tbody></table>{entries.length === 0 && <div className="p-10 text-center text-sm text-slate-500">Belum ada audit autentikasi.</div>}</div>
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[110px_1fr] gap-3 px-4 py-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className="break-all font-mono text-slate-900">{value}</dd></div>
}
