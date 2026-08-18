import type { ReactNode } from 'react'
import { Boxes, Database, MapPinned } from 'lucide-react'
import brandMark from '../assets/brand/brand-mark-512.png'
import logoHorizontal from '../assets/brand/logo-horizontal.webp'
import { useLanguage } from '../i18n/useLanguage'
import { LanguageSwitcher } from './LanguageSwitcher'

export function AuthLayout({ children, contextTitle, contextDescription }: { children: ReactNode; contextTitle: string; contextDescription: string }) {
  const { t } = useLanguage()
  const contextItems = [
    { icon: MapPinned, label: t('auth.locationLabel'), value: t('auth.locationValue') },
    { icon: Boxes, label: t('auth.scopeLabel'), value: t('auth.scopeValue') },
    { icon: Database, label: t('auth.dataLabel'), value: t('auth.dataValue') },
  ]

  return (
    <div className='auth-surface min-h-screen bg-[var(--canvas)] text-[var(--text)]'>
      <header className='flex h-[72px] items-center border-b border-[var(--border)] bg-[var(--surface)] px-5 sm:px-8' aria-label={t('auth.systemLabel')}>
        <img src={logoHorizontal} alt={t('common.appName')} className='h-9 w-auto object-contain sm:h-10' />
        <div className='ml-auto flex items-center gap-4'>
          <span className='hidden items-center gap-2 text-xs font-medium text-[var(--text-muted)] md:flex'><span className='h-2 w-2 bg-[#237354]' aria-hidden='true' />{t('auth.systemLabel')}</span>
          <LanguageSwitcher />
        </div>
      </header>

      <main className='mx-auto grid min-h-[calc(100vh-72px)] max-w-[1480px] lg:grid-cols-[400px_minmax(0,1fr)]'>
        <aside className='order-2 bg-[var(--sidebar)] px-6 py-8 text-white sm:px-10 lg:order-1 lg:flex lg:flex-col lg:justify-between lg:px-11 lg:py-12' aria-labelledby='auth-context-title'>
          <div>
            <div className='mb-9 flex items-center gap-3'>
              <span className='flex h-11 w-11 items-center justify-center bg-white'><img src={brandMark} alt='' className='h-9 w-9 object-cover' aria-hidden='true' /></span>
              <span className='h-px flex-1 bg-white/20' aria-hidden='true' />
              <span className='h-2 w-2 bg-[var(--brand-orange-bright)]' aria-hidden='true' />
            </div>
            <p className='mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9eb8c8]'>{t('auth.systemLabel')}</p>
            <h1 id='auth-context-title' className='max-w-sm text-[27px] font-semibold leading-[1.2] tracking-[-0.02em]'>{contextTitle}</h1>
            <p className='mt-4 max-w-sm text-sm leading-6 text-[#c2d1da]'>{contextDescription}</p>
          </div>

          <dl className='mt-10 border-t border-white/15 lg:mt-16'>
            {contextItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className='grid grid-cols-[28px_92px_1fr] gap-3 border-b border-white/10 py-4 text-xs'>
                <Icon size={16} className='mt-0.5 text-[var(--brand-orange-bright)]' aria-hidden='true' />
                <dt className='text-[#93adbd]'>{label}</dt>
                <dd className='font-medium leading-5 text-white'>{value}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <section className='relative order-1 flex items-center justify-center bg-[var(--surface)] px-5 py-10 sm:px-10 lg:order-2 lg:px-16' aria-label={t('auth.loginTitle')}>
          <span className='absolute left-0 top-0 hidden h-full w-1 bg-[var(--brand-orange-bright)] lg:block' aria-hidden='true' />
          <div className='w-full max-w-[440px]'>{children}</div>
        </section>
      </main>
    </div>
  )
}
