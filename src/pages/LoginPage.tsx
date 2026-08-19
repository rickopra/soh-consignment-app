import { useState, type FormEvent } from 'react'
import { AlertCircle, ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react'
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
      <div className='auth-form-heading'>
        <span className='auth-form-icon' aria-hidden='true'><ShieldCheck size={20} /></span>
        <p className='auth-form-kicker'>{t('auth.accountAccess')}</p>
        <h2>{t('auth.loginTitle')}</h2>
        <p>{t('auth.loginDescription')}</p>
      </div>

      <form onSubmit={submit} className='auth-login-form' noValidate>
        <div className='auth-field-group'>
          <FieldLabel htmlFor='login-identifier' required>{t('auth.identifierLabel')}</FieldLabel>
          <input id='login-identifier' name='username' type='text' autoComplete='username' autoCapitalize='none' spellCheck={false} value={identifier} onChange={(event) => setIdentifier(event.target.value)} disabled={busy} className={fieldBase} required autoFocus />
        </div>
        <PasswordField id='login-password' label={t('common.password')} value={password} onChange={setPassword} autoComplete='current-password' required disabled={busy} />
        {error && <div role='alert' className='auth-error'><AlertCircle size={18} aria-hidden='true' /><span>{error}</span></div>}
        <Button type='submit' size='lg' className='auth-submit w-full justify-between px-5' disabled={busy || !configured || !identifier.trim() || !password}><span>{busy ? t('auth.verifying') : t('auth.signIn')}</span>{busy ? <LoaderCircle className='animate-spin' size={18} aria-hidden='true' /> : <ArrowRight size={18} aria-hidden='true' />}</Button>
      </form>

      <p className='auth-first-login-note'>{t('auth.firstLoginNote')}</p>
    </AuthLayout>
  )
}
