import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, ChevronDown, Eye, EyeOff, LoaderCircle, X } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage'
import { cn } from '../lib/utils'
import { DatePicker } from './DatePicker'

const variants = {
  primary: 'border border-[var(--brand-blue-strong)] bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue-strong)]',
  secondary: 'border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text)] hover:bg-[var(--surface-muted)]',
  ghost: 'border border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]',
  danger: 'border border-[#8f2f3a] bg-[#a33945] text-white hover:bg-[#8f2f3a]',
  subtle: 'border border-[#9ab9cc] bg-[#e8f0f5] text-[#164c70] hover:bg-[#dce9f1] dark:border-[#365d74] dark:bg-[#143247] dark:text-[#b9d9eb]',
} as const

export function Button({ children, className, variant = 'primary', size = 'md', type = 'button', disabled, onClick, ariaLabel }: { children: ReactNode; className?: string; variant?: keyof typeof variants; size?: 'sm' | 'md' | 'lg'; type?: 'button' | 'submit' | 'reset'; disabled?: boolean; onClick?: () => void; ariaLabel?: string }) {
  return <button type={type} className={cn('inline-flex items-center justify-center gap-2 rounded-[8px] font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0', variants[variant], size === 'sm' ? 'min-h-9 px-3 text-xs' : size === 'lg' ? 'min-h-12 px-5 text-sm' : 'min-h-10 px-4 text-sm', className)} disabled={disabled} onClick={onClick} aria-label={ariaLabel}>{children}</button>
}

export function IconButton({ children, label, className, variant = 'ghost', onClick }: { children: ReactNode; label: string; className?: string; variant?: keyof typeof variants; onClick?: () => void }) {
  return <button type='button' className={cn('inline-flex h-10 w-10 items-center justify-center rounded-[8px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]', variants[variant], className)} aria-label={label} title={label} onClick={onClick}>{children}</button>
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
  return <span className={cn('status-badge inline-flex min-h-6 items-center rounded-[5px] border px-2 py-0.5 text-[11px] font-semibold leading-4', statusStyles[status])}>{children}</span>
}

export function FieldLabel({ htmlFor, children, required, hint }: { htmlFor: string; children: ReactNode; required?: boolean; hint?: string }) {
  return <label htmlFor={htmlFor} className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]'>{children}{required && <span className='ml-1 text-[var(--brand-orange)]' aria-hidden='true'>*</span>}{hint && <span className='ml-2 font-normal normal-case text-[var(--text-subtle)]'>{hint}</span>}</label>
}

export const fieldBase = 'min-h-10 w-full border-0 border-b-2 border-[var(--border-strong)] bg-transparent px-0 pb-1.5 pt-0 text-sm text-[var(--text)] outline-none transition-[border-color] placeholder:text-[var(--text-subtle)] focus:border-[var(--brand-orange)] disabled:cursor-not-allowed disabled:opacity-60'



export function TextField({ id, label, value, onChange, placeholder, required, hint, type = 'text', error, disabled }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; hint?: string; type?: 'text' | 'date' | 'search' | 'email'; error?: string; disabled?: boolean }) {
  if (type === 'date') return <DatePicker id={id} label={label} value={value} onChange={onChange} required={required} hint={hint} disabled={disabled} error={error} />
  return <div>{label && <FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel>}<input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder ?? ' '} required={required} disabled={disabled} className={cn(fieldBase, error && 'border-[var(--danger)]')} />{error && <p className='mt-1 text-[11px] text-[var(--danger)]'>{error}</p>}</div>
}

export function NumberField({ id, label, value, onChange, min = 0, max, required, hint, disabled }: { id: string; label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; required?: boolean; hint?: string; disabled?: boolean }) {
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><input id={id} type='number' value={value} onChange={(event) => onChange(Number(event.target.value))} min={min} max={max} required={required} disabled={disabled} className={fieldBase} /></div>
}

export function SelectField({ id, label, value, onChange, options, required, hint, disabled }: { id: string; label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; required?: boolean; hint?: string; disabled?: boolean }) {
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><div className='relative'><select id={id} value={value} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled} className={cn(fieldBase, 'appearance-none pr-6')}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className='pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' size={14} aria-hidden='true' /></div></div>
}

export function TextAreaField({ id, label, value, onChange, placeholder, hint, rows = 3, disabled }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string; rows?: number; disabled?: boolean }) {
  return <div><FieldLabel htmlFor={id} hint={hint}>{label}</FieldLabel><textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} disabled={disabled} className={cn(fieldBase, 'resize-none')} /></div>
}

export function FormRow({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  return <div className={cn('grid gap-x-8 gap-y-6', cols === 1 ? 'grid-cols-1' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>{children}</div>
}

export function FormDivider({ label }: { label?: string }) {
  return (
    <div className='flex items-center gap-3 py-1'>
      {label && <span className='whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]'>{label}</span>}
      <div className='h-px flex-1 bg-[var(--border)]' />
    </div>
  )
}

const focusableSelector = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"

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
      <div ref={dialogRef} tabIndex={-1} role='dialog' aria-modal='true' aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={cn('max-h-[92vh] w-full overflow-y-auto rounded-t-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl outline-none sm:rounded-[14px]', size === 'sm' && 'max-w-md', size === 'lg' ? 'max-w-4xl' : 'max-w-xl')}>
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

export function Drawer({ open, onClose, title, description, children, footer, width = 'md' }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; width?: 'sm' | 'md' | 'lg' }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const { t } = useLanguage()
  const [shouldRender, setShouldRender] = useState(open)

  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    if (open) setShouldRender(true)
    else {
      const timer = setTimeout(() => setShouldRender(false), 220)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFirst = () => (panelRef.current?.querySelector<HTMLElement>(focusableSelector) ?? panelRef.current)?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      if (!focusable.length) { event.preventDefault(); panelRef.current.focus(); return }
      const first = focusable[0]; const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.requestAnimationFrame(focusFirst)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = prevOverflow; previousFocus.current?.focus() }
  }, [open])

  return createPortal(
    <div
      aria-hidden={!open}
      className={cn('fixed inset-0 z-50 flex justify-end transition-[visibility] duration-200', open ? 'visible' : 'invisible')}
    >
      <div
        className={cn('absolute inset-0 bg-[#07131d]/60 transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0')}
        aria-hidden='true'
        onClick={() => onCloseRef.current()}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        className={cn(
          'relative flex h-full flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl outline-none will-change-transform transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
          width === 'sm' ? 'w-full max-w-sm' : width === 'lg' ? 'w-full max-w-2xl' : 'w-full max-w-xl',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className='flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface-muted)] px-6 py-5'>
          <div>
            <h2 id={titleId} className='text-base font-semibold tracking-tight text-[var(--text)]'>{title}</h2>
            {description && <p className='mt-1 text-xs leading-5 text-[var(--text-muted)]'>{description}</p>}
          </div>
          <button type='button' onClick={() => onCloseRef.current()} aria-label={t('common.close')} className='flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[var(--text-muted)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]'>
            <X size={16} />
          </button>
        </div>
        <div className='flex-1 overflow-y-auto px-6 py-6'>{shouldRender ? children : null}</div>
        {footer && (
          <div className='shrink-0 border-t border-[var(--border)] bg-[var(--surface-muted)] px-6 py-4'>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className='flex items-start gap-2.5 rounded-[8px] border border-[#dab0b5] bg-[#f8e9eb] px-3.5 py-3' role='alert'>
      <AlertCircle size={15} className='mt-px shrink-0 text-[var(--danger)]' aria-hidden='true' />
      <p className='text-sm leading-5 text-[#7f2834]'>{message}</p>
    </div>
  )
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className='mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end'><div>{eyebrow && <p className='mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-orange)]'><span className='h-1.5 w-5 bg-[var(--brand-orange)]' aria-hidden='true' />{eyebrow}</p>}<h1 className='text-[25px] font-semibold tracking-[-0.02em] text-[var(--text)] sm:text-[28px]'>{title}</h1>{description && <p className='mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]'>{description}</p>}</div>{action && <div className='shrink-0'>{action}</div>}</div>
}

export function PasswordField({ id, label, value, onChange, required, hint, placeholder, disabled, error, autoComplete = 'current-password' }: { id: string; label: string; value: string; onChange: (value: string) => void; required?: boolean; hint?: string; placeholder?: string; disabled?: boolean; error?: string; autoComplete?: string }) {
  const [show, setShow] = useState(false)
  const { t } = useLanguage()
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><div className='relative'><input id={id} type={show ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder ?? ' '} required={required} disabled={disabled} autoComplete={autoComplete} className={cn(fieldBase, 'pr-10', error && 'border-[var(--danger)]')} /><button type='button' onClick={() => setShow((prev) => !prev)} aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')} className='absolute right-0 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] focus:outline-none'>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{error && <p className='mt-1 text-[11px] text-[var(--danger)]'>{error}</p>}</div>
}

export function LoadingState() {
  const { t } = useLanguage()
  return <div className='flex min-h-48 items-center justify-center gap-3 text-sm text-[var(--text-muted)]'><LoaderCircle className='animate-spin' size={19} aria-hidden='true' /><span>{t('common.loading')}</span></div>
}

