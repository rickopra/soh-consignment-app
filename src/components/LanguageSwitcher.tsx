import { Languages } from 'lucide-react'
import { cn } from '../lib/utils'
import { useLanguage } from '../i18n/useLanguage'

export function LanguageSwitcher({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  const { language, setLanguage, t } = useLanguage()
  return (
    <div className={cn('inline-flex items-center gap-1', !compact && 'border border-[var(--border-strong)] bg-[var(--surface-muted)] p-1')} role='group' aria-label={t('language.label')}>
      {!compact && <Languages size={15} className={inverse ? 'ml-1 text-slate-300' : 'ml-1 text-[var(--text-muted)]'} aria-hidden='true' />}
      {(['id', 'en'] as const).map((value) => (
        <button key={value} type='button' lang={value} onClick={() => setLanguage(value)} aria-pressed={language === value} aria-label={value === 'id' ? t('language.switchToIndonesian') : t('language.switchToEnglish')} className={cn('min-h-8 min-w-9 px-2 text-[11px] font-semibold tracking-[0.08em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2', language === value ? inverse ? 'bg-white text-[#123b61]' : 'bg-[var(--brand-blue)] text-white' : inverse ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]')}>
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
