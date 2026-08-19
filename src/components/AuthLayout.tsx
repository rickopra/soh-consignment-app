import type { ReactNode } from 'react'
import brandMark from '../assets/brand/brand-mark-512.png'
import logoHorizontal from '../assets/brand/logo-horizontal.webp'
import { useLanguage } from '../i18n/useLanguage'
import { LanguageSwitcher } from './LanguageSwitcher'

export function AuthLayout({ children, contextTitle, contextDescription }: { children: ReactNode; contextTitle: string; contextDescription: string }) {
  const { t } = useLanguage()
  const principles = [t('auth.principleAccurate'), t('auth.principleTraceable'), t('auth.principleReady')]

  return (
    <div className='auth-surface min-h-screen bg-[var(--canvas)] text-[var(--text)]'>
      <header className='flex h-16 items-center border-b border-[var(--border)] bg-[var(--surface)] px-5 sm:px-8' aria-label={t('auth.systemLabel')}>
        <img src={logoHorizontal} alt={t('common.appName')} className='h-8 w-auto object-contain sm:h-9' />
        <div className='ml-auto flex items-center gap-4'>
          <span className='hidden items-center gap-2 text-xs font-medium text-[var(--text-muted)] md:flex'><span className='h-2 w-2 bg-[#237354]' aria-hidden='true' />{t('auth.systemLabel')}</span>
          <LanguageSwitcher />
        </div>
      </header>

      <main className='mx-auto grid min-h-[calc(100vh-64px)] max-w-[1600px] lg:grid-cols-[minmax(360px,0.78fr)_minmax(600px,1.22fr)]'>
        <aside className='relative hidden overflow-hidden bg-[var(--sidebar)] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-14' aria-labelledby='auth-context-title'>
          <span className='absolute right-0 top-0 h-full w-1 bg-[var(--brand-orange-bright)]' aria-hidden='true' />
          <div>
            <div className='mb-16 flex items-center gap-4'>
              <span className='flex h-12 w-12 items-center justify-center bg-white'><img src={brandMark} alt='' className='h-10 w-10 object-cover' aria-hidden='true' /></span>
              <span className='h-px flex-1 bg-white/20' aria-hidden='true' />
              <span className='h-2.5 w-2.5 bg-[var(--brand-orange-bright)]' aria-hidden='true' />
            </div>
            <p className='mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9eb8c8]'>{t('auth.brandEyebrow')}</p>
            <h2 id='auth-context-title' className='max-w-md text-[34px] font-semibold leading-[1.14] tracking-[-0.03em]'>{contextTitle}</h2>
            <p className='mt-5 max-w-md text-[15px] leading-7 text-[#c2d1da]'>{contextDescription}</p>
          </div>

          <div className='mt-16'>
            <p className='mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8faaba]'>{t('auth.principlesLabel')}</p>
            <ul className='grid grid-cols-3 border-y border-white/15' aria-label={t('auth.principlesLabel')}>
              {principles.map((principle, index) => <li key={principle} className={`py-4 text-sm font-semibold ${index > 0 ? 'border-l border-white/15 pl-5' : ''}`}>{principle}</li>)}
            </ul>
          </div>
        </aside>

        <section className='flex items-center justify-center bg-[var(--canvas)] px-5 py-10 sm:px-10 lg:px-16' aria-label={t('auth.accountAccess')}>
          <div className='w-full max-w-[500px] border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-7 shadow-[0_16px_40px_rgba(16,50,70,0.08)] sm:px-9 sm:py-9'>{children}</div>
        </section>
      </main>
    </div>
  )
}
