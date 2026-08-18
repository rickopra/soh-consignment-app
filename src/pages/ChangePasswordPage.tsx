import { useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, Check, LoaderCircle, Minus, ShieldCheck } from 'lucide-react'
import { AuthLayout } from '../components/AuthLayout'
import { Button, PasswordField } from '../components/ui'
import { useLanguage } from '../i18n/useLanguage'
import { localizedError } from '../lib/localizedError'
import { useAuthStore } from '../store/authStore'

export default function ChangePasswordPage() {
  const { language, t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const changePassword = useAuthStore((state) => state.changePassword)
  const logout = useAuthStore((state) => state.logout)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const normalizedUsername = user?.username.trim().toLowerCase() ?? ''
  const checks = useMemo(() => [
    { label: t('auth.passwordLength'), valid: newPassword.length >= 12 },
    { label: t('auth.passwordCase'), valid: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) },
    { label: t('auth.passwordCharacter'), valid: /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword) },
    { label: t('auth.passwordUsername'), valid: Boolean(newPassword) && (!normalizedUsername || !newPassword.toLowerCase().includes(normalizedUsername)) },
    { label: t('auth.passwordConfirmation'), valid: Boolean(confirmPassword) && newPassword === confirmPassword },
  ], [confirmPassword, newPassword, normalizedUsername, t])
  const valid = checks.every((check) => check.valid)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!valid) { setError(t('auth.completeRequirements')); return }
    setBusy(true)
    try {
      await changePassword({ newPassword, confirmPassword })
    } catch (requestError) {
      setError(localizedError(requestError, language, t, 'auth.passwordChangeFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout contextTitle={t('auth.changeContextTitle')} contextDescription={t('auth.changeContextDescription')}>
      <div className='mb-8 border-b border-[var(--border)] pb-6'>
        <div className='mb-5 flex items-center gap-3'><span className='flex h-10 w-10 items-center justify-center border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--brand-blue)]' aria-hidden='true'><ShieldCheck size={20} /></span><span className='h-px flex-1 bg-[var(--border)]' aria-hidden='true' /></div>
        <p className='mb-1 text-sm font-medium text-[var(--brand-blue)]'>{user?.displayName}</p>
        <h2 className='text-[28px] font-semibold tracking-[-0.025em] text-[var(--text)]'>{t('auth.changeTitle')}</h2>
        <p className='mt-2 text-sm leading-6 text-[var(--text-muted)]'>{t('auth.changeDescription')}</p>
      </div>

      <form onSubmit={submit} className='space-y-5' noValidate>
        <PasswordField id='new-password' label={t('common.newPassword')} value={newPassword} onChange={setNewPassword} autoComplete='new-password' required disabled={busy} />
        <PasswordField id='confirm-password' label={t('common.confirmPassword')} value={confirmPassword} onChange={setConfirmPassword} autoComplete='new-password' required disabled={busy} />
        <div className='border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3' aria-live='polite'><p className='mb-2 text-xs font-semibold text-[var(--text)]'>{t('auth.passwordRequirements')}</p><ul className='space-y-1.5'>{checks.map((check) => <li key={check.label} className={`flex items-center gap-2 text-xs ${check.valid ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>{check.valid ? <Check size={14} aria-hidden='true' /> : <Minus size={14} aria-hidden='true' />}{check.label}</li>)}</ul></div>
        {error && <div role='alert' className='flex items-start gap-3 border-l-4 border-[#a33945] bg-[#f8e9eb] px-4 py-3 text-sm leading-6 text-[#7f2834]'><AlertCircle className='mt-0.5 shrink-0' size={18} aria-hidden='true' /><span>{error}</span></div>}
        <Button type='submit' size='lg' className='w-full justify-between px-5' disabled={busy || !valid}><span>{busy ? t('auth.savingPassword') : t('auth.saveAndContinue')}</span>{busy && <LoaderCircle className='animate-spin' size={18} aria-hidden='true' />}</Button>
        <Button variant='ghost' className='w-full' disabled={busy} onClick={() => void logout()}>{t('auth.useAnotherAccount')}</Button>
      </form>
    </AuthLayout>
  )
}
