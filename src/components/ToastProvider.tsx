import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Check, Info } from 'lucide-react'
import { cn } from '../lib/utils'
import { ToastContext, type Toast } from './toast'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { ...toast, id }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 4200)
  }

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3" aria-live="polite" aria-atomic="true">
          {toasts.map((toast) => (
            <div key={toast.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900" role={toast.tone === 'error' ? 'alert' : 'status'}>
              <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', toast.tone === 'success' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300', toast.tone === 'info' && 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300', toast.tone === 'error' && 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300')}>
                {toast.tone === 'success' && <Check size={16} aria-hidden="true" />}
                {toast.tone === 'info' && <Info size={16} aria-hidden="true" />}
                {toast.tone === 'error' && <AlertCircle size={16} aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{toast.description}</p>}
              </div>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
