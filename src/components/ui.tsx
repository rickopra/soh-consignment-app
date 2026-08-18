import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, ChevronDown, Eye, EyeOff, LoaderCircle, X } from 'lucide-react'
import { cn } from '../lib/utils'

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 focus-visible:ring-blue-500 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500',
  subtle: 'bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:ring-blue-500 dark:bg-blue-950/50 dark:text-blue-300',
} as const

export function Button({ children, className, variant = 'primary', size = 'md', type = 'button', disabled, onClick, ariaLabel }: { children: ReactNode; className?: string; variant?: keyof typeof variants; size?: 'sm' | 'md' | 'lg'; type?: 'button' | 'submit' | 'reset'; disabled?: boolean; onClick?: () => void; ariaLabel?: string }) {
  return <button type={type} className={cn('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950', variants[variant], size === 'sm' ? 'min-h-9 px-3 text-xs' : size === 'lg' ? 'min-h-12 px-5 text-sm' : 'min-h-11 px-4 text-sm', className)} disabled={disabled} onClick={onClick} aria-label={ariaLabel}>{children}</button>
}

export function IconButton({ children, label, className, variant = 'ghost', onClick }: { children: ReactNode; label: string; className?: string; variant?: keyof typeof variants; onClick?: () => void }) {
  return <button type="button" className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950', variants[variant], className)} aria-label={label} title={label} onClick={onClick}>{children}</button>
}

export function Card({ children, className, as = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  const Component = as
  return <Component className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}>{children}</Component>
}

export function StatusBadge({ status, children, surface = 'light' }: { status: 'ready' | 'warning' | 'danger' | 'neutral' | 'info'; children: ReactNode; surface?: 'adaptive' | 'light' }) {
  const lightStyles = { ready: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', warning: 'bg-amber-50 text-amber-700 ring-amber-600/20', danger: 'bg-rose-50 text-rose-700 ring-rose-600/20', neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20', info: 'bg-blue-50 text-blue-700 ring-blue-600/20' }
  const darkStyles = { ready: 'dark:bg-emerald-950/40 dark:text-emerald-300', warning: 'dark:bg-amber-950/40 dark:text-amber-300', danger: 'dark:bg-rose-950/40 dark:text-rose-300', neutral: 'dark:bg-slate-800 dark:text-slate-300', info: 'dark:bg-blue-950/40 dark:text-blue-300' }
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', lightStyles[status], surface === 'adaptive' && darkStyles[status])}>{children}</span>
}

export function FieldLabel({ htmlFor, children, required, hint }: { htmlFor: string; children: ReactNode; required?: boolean; hint?: string }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{children} {required && <span className="text-rose-500" aria-hidden="true">*</span>}{hint && <span className="ml-2 font-normal text-slate-400">{hint}</span>}</label>
}

export const fieldBase = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500'

export function TextField({ id, label, value, onChange, placeholder, required, hint, type = 'text', error, disabled }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; hint?: string; type?: 'text' | 'date' | 'search'; error?: string; disabled?: boolean }) {
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} disabled={disabled} className={cn(fieldBase, error && 'border-rose-400 focus:border-rose-500')} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />{error && <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={13} aria-hidden="true" />{error}</p>}</div>
}

export function PasswordField({ id, label, value, onChange, autoComplete, required, hint, error, disabled, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: 'current-password' | 'new-password'; required?: boolean; hint?: string; error?: string; disabled?: boolean; placeholder?: string }) {
  const [visible, setVisible] = useState(false)
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><div className="relative"><input id={id} type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} placeholder={placeholder} required={required} disabled={disabled} className={cn(fieldBase, 'pr-12', error && 'border-rose-400 focus:border-rose-500')} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} /><button type="button" className="absolute inset-y-0 right-0 flex min-h-11 w-11 items-center justify-center text-slate-500 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:text-slate-400 dark:hover:text-white" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={visible}>{visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div>{error && <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={13} aria-hidden="true" />{error}</p>}</div>
}

export function NumberField({ id, label, value, onChange, min = 0, required, hint }: { id: string; label: string; value: number; onChange: (value: number) => void; min?: number; required?: boolean; hint?: string }) {
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><input id={id} type="number" min={min} value={value} onChange={(event) => onChange(Number(event.target.value))} required={required} className={fieldBase} /></div>
}

export function SelectField({ id, label, value, onChange, options, required, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; required?: boolean; hint?: string }) {
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><div className="relative"><select id={id} value={value} onChange={(event) => onChange(event.target.value)} required={required} className={cn(fieldBase, 'appearance-none pr-10')}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden="true" /></div></div>
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement
    const previousOverflow = document.body.style.overflow
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusFirst = () => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector)
      ;(firstFocusable ?? dialogRef.current)?.focus()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      if (!focusable.length) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.requestAnimationFrame(focusFirst)
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus.current?.focus()
    }
  }, [open])
  if (!open) return null
  return createPortal(<div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseRef.current() }}><div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={cn('max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-xl outline-none dark:bg-slate-900 sm:rounded-xl', size === 'sm' && 'max-w-md', size === 'lg' ? 'max-w-3xl' : 'max-w-xl')}><div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6"><div><h2 id={titleId} className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}</div><IconButton label="Tutup dialog" onClick={() => onCloseRef.current()}><X size={18} /></IconButton></div><div className="p-5 sm:p-6">{children}</div></div></div>, document.body)
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">{eyebrow}</p>}<h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div>
}

export function LoadingState() { return <div className="flex min-h-48 items-center justify-center text-slate-400"><LoaderCircle className="animate-spin" size={24} aria-label="Memuat" /></div> }


