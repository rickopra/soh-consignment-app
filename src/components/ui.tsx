import { createPortal } from 'react-dom'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, Check, ChevronDown, Info, LoaderCircle, X } from 'lucide-react'
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

export function StatusBadge({ status, children }: { status: 'ready' | 'warning' | 'danger' | 'neutral' | 'info'; children: ReactNode }) {
  const styles = { ready: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300', warning: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300', danger: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300', neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300', info: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300' }
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', styles[status])}>{children}</span>
}

export function FieldLabel({ htmlFor, children, required, hint }: { htmlFor: string; children: ReactNode; required?: boolean; hint?: string }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{children} {required && <span className="text-rose-500" aria-hidden="true">*</span>}{hint && <span className="ml-2 font-normal text-slate-400">{hint}</span>}</label>
}

export const fieldBase = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500'

export function TextField({ id, label, value, onChange, placeholder, required, hint, type = 'text', error, disabled }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; hint?: string; type?: 'text' | 'date' | 'search'; error?: string; disabled?: boolean }) {
  return <div><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} disabled={disabled} className={cn(fieldBase, error && 'border-rose-400 focus:border-rose-500')} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />{error && <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={13} aria-hidden="true" />{error}</p>}</div>
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
  useEffect(() => { if (!open) return; previousFocus.current = document.activeElement as HTMLElement; dialogRef.current?.focus(); const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', onKeyDown); document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = ''; previousFocus.current?.focus() } }, [open, onClose])
  if (!open) return null
  return createPortal(<div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description ? 'modal-description' : undefined} className={cn('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl outline-none dark:bg-slate-900 sm:rounded-3xl', size === 'sm' && 'max-w-md', size === 'lg' ? 'max-w-3xl' : 'max-w-xl')}><div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-6"><div><h2 id="modal-title" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>{description && <p id="modal-description" className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}</div><IconButton label="Tutup dialog" onClick={onClose}><X size={18} /></IconButton></div><div className="p-5 sm:p-6">{children}</div></div></div>, document.body)
}

type Toast = { id: number; title: string; description?: string; tone: 'success' | 'info' | 'error' }
const ToastContext = createContext<{ push: (toast: Omit<Toast, 'id'>) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = (toast: Omit<Toast, 'id'>) => { const id = Date.now() + Math.random(); setToasts((current) => [...current, { ...toast, id }]); window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4200) }
  return <ToastContext.Provider value={{ push }}>{children}{createPortal(<div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3" aria-live="polite" aria-atomic="true">{toasts.map((toast) => <div key={toast.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900" role={toast.tone === 'error' ? 'alert' : 'status'}><span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', toast.tone === 'success' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300', toast.tone === 'info' && 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300', toast.tone === 'error' && 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300')}>{toast.tone === 'success' && <Check size={16} aria-hidden="true" />}{toast.tone === 'info' && <Info size={16} aria-hidden="true" />}{toast.tone === 'error' && <AlertCircle size={16} aria-hidden="true" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900 dark:text-white">{toast.title}</p>{toast.description && <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{toast.description}</p>}</div></div>)}</div>, document.body)}</ToastContext.Provider>
}

export function useToast() { const context = useContext(ToastContext); if (!context) throw new Error('useToast must be used inside ToastProvider'); return context }

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">{eyebrow}</p>}<h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div>
}

export function LoadingState() { return <div className="flex min-h-48 items-center justify-center text-slate-400"><LoaderCircle className="animate-spin" size={24} aria-label="Memuat" /></div> }
