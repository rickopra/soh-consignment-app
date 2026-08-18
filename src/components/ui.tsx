import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, ChevronDown, Eye, EyeOff, LoaderCircle, X } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage'
import { cn } from '../lib/utils'

const variants = {
  primary: 'border border-[var(--brand-blue-strong)] bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue-strong)]',
  secondary: 'border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text)] hover:bg-[var(--surface-muted)]',
  ghost: 'border border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]',
  danger: 'border border-[#8f2f3a] bg-[#a33945] text-white hover:bg-[#8f2f3a]',
  subtle: 'border border-[#9ab9cc] bg-[#e8f0f5] text-[#164c70] hover:bg-[#dce9f1] dark:border-[#365d74] dark:bg-[#143247] dark:text-[#b9d9eb]',
} as const

export function Button({ children, className, variant = 'primary', size = 'md', type = 'button', disabled, onClick, ariaLabel }: { children: ReactNode; className?: string; variant?: keyof typeof variants; size?: 'sm' | 'md' | 'lg'; type?: 'button' | 'submit' | 'reset'; disabled?: boolean; onClick?: () => void; ariaLabel?: string }) {
  return <button type={type} className={cn('inline-flex items-center justify-center gap-2 rounded-[6px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50', variants[variant], size === 'sm' ? 'min-h-9 px-3 text-xs' : size === 'lg' ? 'min-h-12 px-5 text-sm' : 'min-h-10 px-4 text-sm', className)} disabled={disabled} onClick={onClick} aria-label={ariaLabel}>{children}</button>
}

export function IconButton({ children, label, className, variant = 'ghost', onClick }: { children: ReactNode; label: string; className?: string; variant?: keyof typeof variants; onClick?: () => void }) {
  return <button type='button' className={cn('inline-flex h-10 w-10 items-center justify-center rounded-[6px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]', variants[variant], className)} aria-label={label} title={label} onClick={onClick}>{children}</button>
}

export function Card({ children, className, as = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  const Component = as
  return <Component className={cn('app-panel', className)}>{children}</Component>
}

const statusStyles = {
  ready: 'border-[#9bc8b5] bg-[#e8f3ee] text-[#1f654b] dark:border-[#356a56] dark:bg-[#123629] dark:text-[#8ed0b4]',
  warning: 'border-[#dfbf8a] bg-[#fbf2df] text-[#80500c] dark:border-[#755829] dark:bg-[#3b2c13] dark:text-[#e9bd74]',
  danger: 'border-[#dab0b5] bg-[#f8e9eb] text-[#8d303b] dark:border-[#70404a] dark:bg-[#3a1f26] dark:text-[#efa0a9]',
  neutral: 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]',
} as const

export function StatusBadge({ status, children }: { status: keyof typeof statusStyles; children: ReactNode; surface?: 'light' | 'adaptive' }) {
  return <span className={cn('inline-flex min-h-6 items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-semibold leading-4', statusStyles[status])}>{children}</span>
}

export function FieldLabel({ htmlFor, children, required, hint }: { htmlFor: string; children: ReactNode; required?: boolean; hint?: string }) {
  return <label htmlFor={htmlFor} className='mb-2 block text-sm font-semibold text-[var(--text)]'>{children} {required && <span className='text-[var(--brand-orange)]' aria-hidden='true'>*</span>}{hint && <span className='ml-2 font-normal text-[var(--text-subtle)]'>{hint}</span>}</label>
}

export const fieldBase = 'min-h-11 w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-subtle)] focus:border-[var(--brand-orange)] focus:ring-4 focus:ring-[var(--brand-orange)]/10 disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-70'

export function TextField({ id, label, value, onChange, placeholder, required, hint, type = 'text', error, disabled }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; hint?: string; type?: 'text' | 'date' | 'search' | 'email'; error?: string; disabled?: boolean }) {
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} disabled={disabled} className={cn(fieldBase, error && 'border-[#a33945] focus:border-[#a33945]')} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />{error && <p id={`${id}-error`} className='mt-1.5 flex items-center gap-1 text-xs text-[#a33945]'><AlertCircle size={13} aria-hidden='true' />{error}</p>}</div>
}

export function TextAreaField({ id, label, value, onChange, placeholder, required, hint, rows = 3, disabled }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; hint?: string; rows?: number; disabled?: boolean }) {
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} disabled={disabled} rows={rows} className={cn(fieldBase, 'h-auto py-3')} /></div>
}

export function PasswordField({ id, label, value, onChange, autoComplete, required, hint, error, disabled, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: 'current-password' | 'new-password'; required?: boolean; hint?: string; error?: string; disabled?: boolean; placeholder?: string }) {
  const [visible, setVisible] = useState(false)
  const { t } = useLanguage()
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><div className='relative'><input id={id} type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} placeholder={placeholder} required={required} disabled={disabled} className={cn(fieldBase, 'pr-12', error && 'border-[#a33945] focus:border-[#a33945]')} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} /><button type='button' className='absolute inset-y-0 right-0 flex min-h-11 w-11 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)]' onClick={() => setVisible((current) => !current)} aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')} aria-pressed={visible}>{visible ? <EyeOff size={18} aria-hidden='true' /> : <Eye size={18} aria-hidden='true' />}</button></div>{error && <p id={`${id}-error`} className='mt-1.5 flex items-center gap-1 text-xs text-[#a33945]'><AlertCircle size={13} aria-hidden='true' />{error}</p>}</div>
}

export function NumberField({ id, label, value, onChange, min = 0, required, hint }: { id: string; label: string; value: number; onChange: (value: number) => void; min?: number; required?: boolean; hint?: string }) {
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><input id={id} type='number' min={min} value={value} onChange={(event) => onChange(Number(event.target.value))} required={required} className={fieldBase} /></div>
}

export function SelectField({ id, label, value, onChange, options, required, hint, disabled }: { id: string; label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; required?: boolean; hint?: string; disabled?: boolean }) {
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><div className='relative'><select id={id} value={value} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled} className={cn(fieldBase, 'appearance-none pr-10')}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' size={17} aria-hidden='true' /></div></div>
}

const focusableSelector = `a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])`

export function Modal({ open, onClose, title, description, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()
  const { t } = useLanguage()

  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement
    const previousOverflow = document.body.style.overflow
    const focusFirst = () => (dialogRef.current?.querySelector<HTMLElement>(focusableSelector) ?? dialogRef.current)?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      if (!focusable.length) { event.preventDefault(); dialogRef.current.focus(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.requestAnimationFrame(focusFirst)
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; previousFocus.current?.focus() }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className='fixed inset-0 z-50 flex items-end justify-center bg-[#07131d]/65 p-0 sm:items-center sm:p-4' role='presentation' onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseRef.current() }}>
      <div ref={dialogRef} tabIndex={-1} role='dialog' aria-modal='true' aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={cn('max-h-[92vh] w-full overflow-y-auto rounded-[8px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl outline-none', size === 'sm' && 'max-w-md', size === 'lg' ? 'max-w-4xl' : 'max-w-xl')}>
        <div className='sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-6'>
          <div><h2 id={titleId} className='text-lg font-semibold tracking-tight text-[var(--text)]'>{title}</h2>{description && <p id={descriptionId} className='mt-1 text-sm leading-5 text-[var(--text-muted)]'>{description}</p>}</div>
          <IconButton label={t('common.close')} onClick={() => onCloseRef.current()}><X size={18} /></IconButton>
        </div>
        <div className='p-5 sm:p-6'>{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className='mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end'><div>{eyebrow && <p className='mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-orange)]'><span className='h-1.5 w-5 bg-[var(--brand-orange)]' aria-hidden='true' />{eyebrow}</p>}<h1 className='text-[25px] font-semibold tracking-[-0.02em] text-[var(--text)] sm:text-[28px]'>{title}</h1>{description && <p className='mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]'>{description}</p>}</div>{action && <div className='shrink-0'>{action}</div>}</div>
}

export function LoadingState() {
  const { t } = useLanguage()
  return <div className='flex min-h-48 items-center justify-center gap-3 text-sm text-[var(--text-muted)]'><LoaderCircle className='animate-spin' size={19} aria-hidden='true' /><span>{t('common.loading')}</span></div>
}
