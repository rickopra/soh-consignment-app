import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LanguageContext, type LanguageContextValue } from './context'
import { translate, type Language, type TranslationKey, type TranslationParams } from './translations'

const storageKey = 'soh-language'

function initialLanguage(): Language {
  const stored = window.localStorage.getItem(storageKey)
  if (stored === 'id' || stored === 'en') return stored
  return window.navigator.language.toLowerCase().startsWith('en') ? 'en' : 'id'
}

function parseDate(value: string | Date) {
  if (value instanceof Date) return value
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage)
  const locale = language === 'id' ? 'id-ID' : 'en-US'

  useEffect(() => {
    document.documentElement.lang = language
    window.localStorage.setItem(storageKey, language)
    document.title = language === 'id' ? 'SOH Consignment | Monitoring Stok' : 'SOH Consignment | Stock Monitoring'
  }, [language])

  const setLanguage = useCallback((nextLanguage: Language) => setLanguageState(nextLanguage), [])
  const t = useCallback((key: TranslationKey, params?: TranslationParams) => translate(language, key, params), [language])
  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, options).format(value), [locale])
  const formatDate = useCallback((value: string | Date, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options ?? { day: '2-digit', month: 'short', year: 'numeric' }).format(parseDate(value)), [locale])
  const formatDateTime = useCallback((value: string | Date) => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(parseDate(value)), [locale])

  const contextValue = useMemo<LanguageContextValue>(() => ({ language, locale, setLanguage, t, formatNumber, formatDate, formatDateTime }), [formatDate, formatDateTime, formatNumber, language, locale, setLanguage, t])
  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>
}
