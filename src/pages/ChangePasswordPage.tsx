import { useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, Check, LoaderCircle, Minus, ShieldCheck } from 'lucide-react'
import { AuthLayout } from '../components/AuthLayout'
import { Button, PasswordField } from '../components/ui'
import { ApiError } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function ChangePasswordPage() {
  const user = useAuthStore((state) => state.user)
  const changePassword = useAuthStore((state) => state.changePassword)
  const logout = useAuthStore((state) => state.logout)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const normalizedUsername = user?.username.trim().toLowerCase() ?? ''
  const checks = useMemo(() => [
    { label: 'Minimal 12 karakter', valid: newPassword.length >= 12 },
    { label: 'Memiliki huruf besar dan huruf kecil', valid: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) },
    { label: 'Memiliki angka dan simbol', valid: /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword) },
    { label: 'Tidak memuat username', valid: Boolean(newPassword) && (!normalizedUsername || !newPassword.toLowerCase().includes(normalizedUsername)) },
    { label: 'Konfirmasi password sama', valid: Boolean(confirmPassword) && newPassword === confirmPassword },
  ], [confirmPassword, newPassword, normalizedUsername])
  const valid = checks.every((check) => check.valid)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!valid) {
      setError('Lengkapi seluruh ketentuan password sebelum melanjutkan.')
      return
    }
    setBusy(true)
    try {
      await changePassword({ newPassword, confirmPassword })
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Password gagal diperbarui.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout contextTitle="Selesaikan aktivasi akun Anda." contextDescription="Password sementara hanya digunakan untuk login awal. Setelah diganti, session lama dicabut dan akses aplikasi dibuat ulang.">
      <div className="mb-8">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#0b4a78]" aria-hidden="true"><ShieldCheck size={21} /></div>
        <p className="mb-1 text-sm font-medium text-[#0b4a78]">{user?.displayName}</p>
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-950">Buat password baru</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Perubahan ini wajib diselesaikan sebelum membuka modul operasional.</p>
      </div>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <PasswordField id="new-password" label="Password baru" value={newPassword} onChange={setNewPassword} autoComplete="new-password" required disabled={busy} />
        <PasswordField id="confirm-password" label="Ulangi password baru" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" required disabled={busy} />
        <div className="border border-slate-200 bg-white px-4 py-3" aria-live="polite">
          <p className="mb-2 text-xs font-semibold text-slate-700">Ketentuan password</p>
          <ul className="space-y-1.5">
            {checks.map((check) => <li key={check.label} className={`flex items-center gap-2 text-xs ${check.valid ? 'text-emerald-700' : 'text-slate-500'}`}>{check.valid ? <Check size={14} aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />}{check.label}</li>)}
          </ul>
        </div>
        {error && <div role="alert" className="flex items-start gap-3 border-l-4 border-rose-600 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"><AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" /><span>{error}</span></div>}
        <Button type="submit" size="lg" className="w-full rounded-lg bg-[#0b4a78] hover:bg-[#083b60] focus-visible:ring-[#0b4a78]" disabled={busy || !valid}>{busy ? <><LoaderCircle className="animate-spin" size={18} aria-hidden="true" />Menyimpan password</> : 'Simpan dan buka aplikasi'}</Button>
        <Button variant="ghost" className="auth-light-secondary w-full rounded-lg" disabled={busy} onClick={() => void logout()}>Keluar dan gunakan akun lain</Button>
      </form>
    </AuthLayout>
  )
}
