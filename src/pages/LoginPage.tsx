import { useState, type FormEvent } from 'react'
import { AlertCircle, ArrowRight, LoaderCircle, LockKeyhole } from 'lucide-react'
import { AuthLayout } from '../components/AuthLayout'
import { Button, FieldLabel, PasswordField, fieldBase } from '../components/ui'
import { useLanguage } from '../i18n/useLanguage'
import { apiIsConfigured } from '../lib/api'
import { localizedError } from '../lib/localizedError'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const { language, t } = useLanguage()
  const login = useAuthStore((state) => state.login)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const configured = apiIsConfigured()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!configured) { setError(t('auth.backendNotConfigured')); return }
    setBusy(true)
    try {
      await login(identifier, password)
    } catch (requestError) {
      setError(localizedError(requestError, language, t, 'auth.loginFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout contextTitle={t('auth.contextTitle')} contextDescription={t('auth.contextDescription')}>
      <div className='mb-8 border-b border-[var(--border)] pb-6'>
        <div className='mb-5 flex items-center gap-3'><span className='flex h-10 w-10 items-center justify-center border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--brand-blue)]' aria-hidden='true'><LockKeyhole size={19} /></span><span className='h-px flex-1 bg-[var(--border)]' aria-hidden='true' /></div>
        <h2 className='text-[28px] font-semibold tracking-[-0.025em] text-[var(--text)]'>{t('auth.loginTitle')}</h2>
        <p className='mt-2 text-sm leading-6 text-[var(--text-muted)]'>{t('auth.loginDescription')}</p>
      </div>

      <form onSubmit={submit} className='space-y-5' noValidate>
        <div>
          <FieldLabel htmlFor='login-identifier' required>{t('auth.identifierLabel')}</FieldLabel>
          <input id='login-identifier' name='username' type='text' autoComplete='username' autoCapitalize='none' spellCheck={false} value={identifier} onChange={(event) => setIdentifier(event.target.value)} disabled={busy} className={fieldBase} required autoFocus />
        </div>
        <PasswordField id='login-password' label={t('common.password')} value={password} onChange={setPassword} autoComplete='current-password' required disabled={busy} />
        {error && <div role='alert' className='flex items-start gap-3 border-l-4 border-[#a33945] bg-[#f8e9eb] px-4 py-3 text-sm leading-6 text-[#7f2834]'><AlertCircle className='mt-0.5 shrink-0' size={18} aria-hidden='true' /><span>{error}</span></div>}
        <Button type='submit' size='lg' className='w-full justify-between px-5' disabled={busy || !configured || !identifier.trim() || !password}><span>{busy ? t('auth.verifying') : t('auth.signIn')}</span>{busy ? <LoaderCircle className='animate-spin' size={18} aria-hidden='true' /> : <ArrowRight size={18} aria-hidden='true' />}</Button>
      </form>

      <p className='mt-7 border-t border-[var(--border)] pt-5 text-xs leading-5 text-[var(--text-muted)]'>{t('auth.firstLoginNote')}</p>
    </AuthLayout>
  )
}
