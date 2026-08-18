import type { ReactNode } from 'react'
import brandMark from '../assets/brand/brand-mark-512.png'
import logoHorizontal from '../assets/brand/logo-horizontal.webp'

export function AuthLayout({ children, contextTitle, contextDescription }: { children: ReactNode; contextTitle: string; contextDescription: string }) {
  return (
    <div className="auth-light min-h-screen bg-[#f3f5f7] text-slate-950">
      <header className="flex h-16 items-center border-b border-slate-200 bg-white px-5 sm:px-8" aria-label="Identitas aplikasi">
        <img src={logoHorizontal} alt="SOH Consignment" className="h-9 w-auto object-contain" />
        <div className="ml-auto hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
          Sistem operasional internal
        </div>
      </header>
      <main className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(360px,0.78fr)_minmax(560px,1.22fr)]">
        <section className="relative order-2 overflow-hidden bg-[#0b1f33] px-6 py-10 text-white sm:px-10 lg:order-1 lg:flex lg:items-center lg:px-14" aria-labelledby="auth-context-title">
          <div className="relative z-10 max-w-lg">
            <img src={brandMark} alt="" className="mb-8 h-14 w-14 rounded-lg object-cover" aria-hidden="true" />
            <div className="mb-5 h-1 w-12 bg-[#f28c28]" aria-hidden="true" />
            <h1 id="auth-context-title" className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">{contextTitle}</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300 sm:text-base">{contextDescription}</p>
            <dl className="mt-10 grid max-w-md grid-cols-[112px_1fr] gap-x-4 gap-y-4 border-t border-white/15 pt-6 text-sm">
              <dt className="text-slate-400">Lokasi</dt><dd className="font-medium text-white">Jambi / Mendalo</dd>
              <dt className="text-slate-400">Cakupan</dt><dd className="font-medium text-white">Inventory, inbound, outbound, dan refill</dd>
              <dt className="text-slate-400">Data</dt><dd className="font-medium text-white">Google Sheets melalui Apps Script</dd>
            </dl>
          </div>
          <div className="absolute bottom-0 right-0 h-40 w-2 bg-[#f28c28]" aria-hidden="true" />
        </section>
        <section className="order-1 flex items-center justify-center px-5 py-10 sm:px-10 lg:order-2 lg:px-16">
          <div className="w-full max-w-[430px]">{children}</div>
        </section>
      </main>
    </div>
  )
}
