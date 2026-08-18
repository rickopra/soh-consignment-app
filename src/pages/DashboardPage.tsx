import { AlertTriangle, ArrowRight, ArrowUpFromLine, Boxes, ClipboardClock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionHeader, StatusBadge } from '../components/ui'
import { useLanguage } from '../i18n/useLanguage'
import { calculateInventory } from '../lib/utils'
import { useAppStore } from '../store/appStore'

export default function DashboardPage() {
  const { t, formatDate, formatNumber } = useLanguage()
  const { parts, outbound, inbound, adjustments } = useAppStore()
  const inventory = calculateInventory(parts, outbound, inbound, adjustments)
  const readinessCount = inventory.filter((item) => item.status === 'READY').length
  const readinessPercent = inventory.length ? (readinessCount / inventory.length) * 100 : 0
  const needsRefill = inventory.filter((item) => item.refillRecommendation > 0).sort((a, b) => b.refillRecommendation - a.refillRecommendation)
  const outstandingCount = inventory.reduce((total, item) => total + item.outstanding, 0)
  const pendingInbound = inbound.filter((item) => item.grStatus !== 'Done GR').length
  const target = 95
  const readinessLabel = t('dashboard.readyParts', { ready: formatNumber(readinessCount), total: formatNumber(inventory.length) })

  const attention = [
    { icon: AlertTriangle, label: t('dashboard.refillItems'), value: needsRefill.length, tone: 'text-[var(--warning)]' },
    { icon: Boxes, label: t('dashboard.outstandingUnits'), value: outstandingCount, tone: 'text-[var(--danger)]' },
    { icon: ClipboardClock, label: t('dashboard.pendingInbound'), value: pendingInbound, tone: 'text-[var(--brand-blue)]' },
    { icon: ArrowUpFromLine, label: t('dashboard.outboundRecords'), value: outbound.length, tone: 'text-[var(--text-muted)]' },
  ]

  return (
    <div className='operational-view'>
      <SectionHeader title={t('dashboard.title')} description={t('dashboard.description')} />

      <section className='app-panel mb-6 overflow-hidden' aria-labelledby='readiness-title'>
        <div className='grid lg:grid-cols-[minmax(360px,1.15fr)_minmax(0,1.85fr)]'>
          <div className='border-b border-[var(--border)] p-6 lg:border-b-0 lg:border-r lg:p-8'>
            <div className='flex items-start justify-between gap-4'><div><p id='readiness-title' className='text-sm font-semibold text-[var(--text)]'>{t('dashboard.readiness')}</p><p className='mt-1 text-xs text-[var(--text-muted)]'>{t('dashboard.readinessTarget', { target })}</p></div><StatusBadge status={readinessPercent >= target ? 'ready' : 'warning'}>{readinessPercent >= target ? t('common.ready') : t('common.notReady')}</StatusBadge></div>
            <div className='mt-7 flex items-end justify-between gap-4'><p className='text-[46px] font-semibold leading-none tracking-[-0.04em] text-[var(--text)]'>{formatNumber(readinessPercent, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<span className='ml-1 text-2xl text-[var(--text-muted)]'>%</span></p><p className='pb-1 text-right text-xs leading-5 text-[var(--text-muted)]'>{readinessLabel}</p></div>
            <div className='mt-6 h-3 overflow-hidden bg-[var(--surface-strong)]' role='img' aria-label={readinessLabel}><span className='block h-full bg-[var(--brand-blue)]' style={{ width: `${Math.min(100, readinessPercent)}%` }} /></div>
            <div className='mt-3 flex justify-between text-[11px] text-[var(--text-muted)]'><span>{t('dashboard.readyParts', { ready: readinessCount, total: inventory.length })}</span><span>{t('dashboard.notReadyParts', { count: Math.max(0, inventory.length - readinessCount) })}</span></div>
          </div>

          <div className='grid sm:grid-cols-2' aria-label={t('dashboard.requiresAction')}>
            {attention.map(({ icon: Icon, label, value, tone }, index) => <div key={label} className={`flex min-h-[116px] items-center gap-4 p-5 ${index % 2 === 0 ? 'sm:border-r sm:border-[var(--border)]' : ''} ${index < 2 ? 'border-b border-[var(--border)]' : ''}`}><Icon size={21} className={tone} aria-hidden='true' /><div><p className='text-2xl font-semibold text-[var(--text)]'>{formatNumber(value)}</p><p className='mt-1 text-xs leading-5 text-[var(--text-muted)]'>{label}</p></div></div>)}
          </div>
        </div>
      </section>

      <div className='grid gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
        <section className='app-panel overflow-hidden' aria-labelledby='stock-priority-title'>
          <div className='app-panel-header flex items-start justify-between gap-4'><div><h2 id='stock-priority-title' className='text-base font-semibold text-[var(--text)]'>{t('dashboard.stockPriority')}</h2><p className='mt-1 text-xs leading-5 text-[var(--text-muted)]'>{t('dashboard.stockPriorityDescription')}</p></div><Link to='/inventory' className='inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-blue)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]'>{t('dashboard.viewInventory')}<ArrowRight size={14} aria-hidden='true' /></Link></div>
          <div className='overflow-x-auto'><table className='data-table min-w-[620px]'><caption className='sr-only'>{t('dashboard.stockPriority')}</caption><thead><tr><th scope='col'>{t('inventory.partColumn')}</th><th scope='col' className='text-right'>{t('dashboard.available')}</th><th scope='col' className='text-right'>{t('inventory.minMax')}</th><th scope='col' className='text-right'>{t('dashboard.refill')}</th></tr></thead><tbody>{needsRefill.slice(0, 6).map((part) => <tr key={part.id}><td><p className='font-semibold text-[var(--text)]'>{part.partNumber}</p><p className='mt-1 max-w-[380px] truncate text-xs text-[var(--text-muted)]'>{part.description}</p></td><td className='text-right font-semibold text-[var(--danger)]'>{formatNumber(part.availableStock)}</td><td className='text-right text-[var(--text-muted)]'>{formatNumber(part.minStock)} / {formatNumber(part.maxStock)}</td><td className='text-right font-semibold text-[var(--brand-blue)]'>+{formatNumber(part.refillRecommendation)}</td></tr>)}{needsRefill.length === 0 && <tr><td colSpan={4} className='py-12 text-center text-sm text-[var(--text-muted)]'>{t('dashboard.noRefill')}</td></tr>}</tbody></table></div>
        </section>

        <section className='app-panel overflow-hidden' aria-labelledby='recent-outbound-title'>
          <div className='app-panel-header flex items-start justify-between gap-4'><div><h2 id='recent-outbound-title' className='text-base font-semibold text-[var(--text)]'>{t('dashboard.recentOutbound')}</h2><p className='mt-1 text-xs leading-5 text-[var(--text-muted)]'>{t('dashboard.recentOutboundDescription')}</p></div><Link to='/outbound' className='inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-blue)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]'>{t('dashboard.viewOutbound')}<ArrowRight size={14} aria-hidden='true' /></Link></div>
          <div>{outbound.slice(0, 6).map((transaction) => <div key={transaction.id} className='grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--border)] px-5 py-4 last:border-b-0'><div className='min-w-0'><p className='truncate text-sm font-semibold text-[var(--text)]'>{transaction.partNumber}</p><p className='mt-1 truncate text-xs text-[var(--text-muted)]'>{transaction.requester} · {formatDate(transaction.requestDate)}</p></div><div className='text-right'><p className='text-sm font-semibold text-[var(--text)]'>{formatNumber(transaction.qtyRequest)}</p><p className='mt-1 text-[10px] text-[var(--text-muted)]'>{t('dashboard.requested')}</p></div></div>)}{outbound.length === 0 && <p className='px-5 py-12 text-center text-sm text-[var(--text-muted)]'>{t('dashboard.noOutbound')}</p>}</div>
        </section>
      </div>
    </div>
  )
}
