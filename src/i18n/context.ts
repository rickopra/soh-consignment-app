import { createContext } from 'react'
import type { Language, TranslationKey, TranslationParams } from './translations'

export interface LanguageContextValue {
  language: Language
  locale: 'id-ID' | 'en-US'
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, params?: TranslationParams) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string
  formatDateTime: (value: string | Date) => string
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)
