import { createContext, useContext } from 'react'

export type Toast = {
  id: number
  title: string
  description?: string
  tone: 'success' | 'info' | 'error'
}

export const ToastContext = createContext<{ push: (toast: Omit<Toast, 'id'>) => void } | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
