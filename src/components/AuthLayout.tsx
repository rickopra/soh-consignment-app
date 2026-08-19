import type { ReactNode } from 'react'
import brandMark from '../assets/brand/brand-mark-512.png'
import { useLanguage } from '../i18n/useLanguage'
import { LanguageSwitcher } from './LanguageSwitcher'

export function AuthLayout({ children, contextTitle, contextDescription }: { children: ReactNode; contextTitle: string; contextDescription: string }) {
  const { t } = useLanguage()
  const principles = [t('auth.principleAccurate'), t('auth.principleTraceable'), t('auth.principleReady')]

  return (
    <div className='auth-surface'>
      <a href='#auth-form' className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[#07131d]'>
        {t('shell.skipToContent')}
      </a>

      <header className='auth-header' aria-label={t('auth.systemLabel')}>
        <div className='auth-brand-lockup' aria-label={t('common.appName')}>
          <span className='auth-brand-mark'><img src={brandMark} alt='' aria-hidden='true' /></span>
          <span className='auth-brand-name'><strong>SOH</strong><span>Consignment</span></span>
        </div>
        <div className='auth-header-actions'>
          <span className='auth-system-status'><span aria-hidden='true' />{t('auth.systemLabel')}</span>
          <LanguageSwitcher inverse />
        </div>
      </header>

      <main className='auth-layout'>
        <aside className='auth-hero' aria-labelledby='auth-context-title'>
          <div className='auth-flow' aria-hidden='true'>
            <span className='auth-flow-line auth-flow-line-one'><i /></span>
            <span className='auth-flow-line auth-flow-line-two'><i /></span>
            <span className='auth-flow-line auth-flow-line-three'><i /></span>
            <span className='auth-flow-axis' />
          </div>

          <div className='auth-hero-copy'>
            <p className='auth-kicker'>{t('auth.brandEyebrow')}</p>
            <h1 id='auth-context-title'>{contextTitle}</h1>
            <p>{contextDescription}</p>
          </div>

          <div className='auth-principles' aria-label={t('auth.principlesLabel')}>
            <p>{t('auth.principlesLabel')}</p>
            <ol>
              {principles.map((principle, index) => <li key={principle}><span>0{index + 1}</span>{principle}</li>)}
            </ol>
          </div>
        </aside>

        <section id='auth-form' className='auth-form-area' aria-label={t('auth.accountAccess')}>
          <div className='auth-form-card'>{children}</div>
        </section>
      </main>
    </div>
  )
}
