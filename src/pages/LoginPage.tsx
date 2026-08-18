import { useState, type FormEvent } from 'react'
import { AlertCircle, LoaderCircle, LockKeyhole } from 'lucide-react'
import { AuthLayout } from '../components/AuthLayout'
import { Button, FieldLabel, PasswordField, fieldBase } from '../components/ui'
import { apiIsConfigured, ApiError } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const login = useAuthStore((state) => state.login)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const configured = apiIsConfigured()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!configured) {
      setError('Backend autentikasi belum dikonfigurasi.')
      return
    }
    setBusy(true)
    try {
      await login(identifier, password)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Login gagal diproses.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout contextTitle="Kontrol stok konsinyasi dalam satu alur kerja." contextDescription="Akses dibatasi untuk pengguna yang terdaftar. Setiap login, perubahan password, dan aktivitas administrator dicatat pada database operasional.">
      <div className="mb-8">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#0b4a78]" aria-hidden="true"><LockKeyhole size={20} /></div>
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-950">Masuk ke SOH Consignment</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Gunakan email atau username yang diberikan administrator.</p>
      </div>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <FieldLabel htmlFor="login-identifier" required>Email atau username</FieldLabel>
          <input id="login-identifier" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} value={identifier} onChange={(event) => setIdentifier(event.target.value)} disabled={busy} className={fieldBase} required autoFocus />
        </div>
        <PasswordField id="login-password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" required disabled={busy} />
        {error && <div role="alert" className="flex items-start gap-3 border-l-4 border-rose-600 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"><AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" /><span>{error}</span></div>}
        <Button type="submit" size="lg" className="w-full rounded-lg bg-[#0b4a78] hover:bg-[#083b60] focus-visible:ring-[#0b4a78]" disabled={busy || !configured || !identifier.trim() || !password}>{busy ? <><LoaderCircle className="animate-spin" size={18} aria-hidden="true" />Memverifikasi akun</> : 'Masuk'}</Button>
      </form>
      <div className="mt-8 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-600">
        Login pertama mewajibkan perubahan password. Hubungi administrator jika akun terkunci atau kredensial belum tersedia.
      </div>
    </AuthLayout>
  )
}
