import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Check, Info, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { useLanguage } from '../i18n/useLanguage'
import { ToastContext, type Toast } from './toast'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const { t } = useLanguage()
  const push = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { ...toast, id }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4200)
  }
  const dismiss = (id: number) => setToasts((current) => current.filter((item) => item.id !== id))

  return <ToastContext.Provider value={{ push }}>
    {children}
    {createPortal(<div className='fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2' aria-live='polite' aria-atomic='true'>
      {toasts.map((toast) => <div key={toast.id} className='flex gap-3 border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl' role={toast.tone === 'error' ? 'alert' : 'status'}>
        <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border', toast.tone === 'success' && 'border-[#9bc8b5] text-[var(--success)]', toast.tone === 'info' && 'border-[#9ab9cc] text-[var(--brand-blue)]', toast.tone === 'error' && 'border-[#dab0b5] text-[var(--danger)]')}>
          {toast.tone === 'success' && <Check size={15} aria-hidden='true' />}{toast.tone === 'info' && <Info size={15} aria-hidden='true' />}{toast.tone === 'error' && <AlertCircle size={15} aria-hidden='true' />}
        </span>
        <div className='min-w-0 flex-1'><p className='text-sm font-semibold text-[var(--text)]'>{toast.title}</p>{toast.description && <p className='mt-0.5 text-xs leading-5 text-[var(--text-muted)]'>{toast.description}</p>}</div>
        <button type='button' className='flex h-7 w-7 shrink-0 items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]' aria-label={t('common.closeNotification')} onClick={() => dismiss(toast.id)}><X size={14} aria-hidden='true' /></button>
      </div>)}
    </div>, document.body)}
  </ToastContext.Provider>
}
