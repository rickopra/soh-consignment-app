import { AlertTriangle, ArrowRight, ArrowUpFromLine, Boxes, ClipboardClock, Gauge } from 'lucide-react'
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
    { icon: AlertTriangle, label: t('dashboard.refillItems'), value: needsRefill.length, tone: 'is-warning' },
    { icon: Boxes, label: t('dashboard.outstandingUnits'), value: outstandingCount, tone: 'is-danger' },
    { icon: ClipboardClock, label: t('dashboard.pendingInbound'), value: pendingInbound, tone: 'is-blue' },
    { icon: ArrowUpFromLine, label: t('dashboard.outboundRecords'), value: outbound.length, tone: 'is-neutral' },
  ]

  return (
    <div className='operational-view dashboard-view'>
      <SectionHeader title={t('dashboard.title')} description={t('dashboard.description')} />

      <section className='dashboard-hero app-panel' aria-labelledby='readiness-title'>
        <div className='dashboard-hero-main'>
          <div className='dashboard-heading-row'>
            <div><p className='data-kicker'>{t('dashboard.readiness')}</p><h2 id='readiness-title'>{t('dashboard.readinessTarget', { target })}</h2></div>
            <StatusBadge status={readinessPercent >= target ? 'ready' : 'warning'}>{readinessPercent >= target ? t('common.ready') : t('common.notReady')}</StatusBadge>
          </div>
          <div className='dashboard-score-row'><p className='dashboard-score'>{formatNumber(readinessPercent, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<span>%</span></p><p className='dashboard-score-caption'>{readinessLabel}</p></div>
          <div className='dashboard-progress' role='img' aria-label={readinessLabel}><span style={{ width: `${Math.min(100, readinessPercent)}%` }} /></div>
          <div className='dashboard-progress-labels'><span>{t('dashboard.readyParts', { ready: readinessCount, total: inventory.length })}</span><span>{t('dashboard.notReadyParts', { count: Math.max(0, inventory.length - readinessCount) })}</span></div>
        </div>
        <div className='dashboard-hero-aside'>
          <div className='dashboard-signal'><Gauge size={17} aria-hidden='true' /><span>{t('dashboard.requiresAction')}</span><b>{formatNumber(needsRefill.length + pendingInbound + (outstandingCount > 0 ? 1 : 0))}</b></div>
          <div className='dashboard-hero-rule' aria-hidden='true' />
          <p>{t('dashboard.stockPriorityDescription')}</p>
        </div>
      </section>

      <section className='dashboard-metrics app-panel' aria-label={t('dashboard.requiresAction')}>
        {attention.map(({ icon: Icon, label, value, tone }) => <div key={label} className='dashboard-metric'><span className={`dashboard-metric-icon ${tone}`}><Icon size={18} aria-hidden='true' /></span><div><p>{formatNumber(value)}</p><span>{label}</span></div></div>)}
      </section>

      <div className='dashboard-panels'>
        <section className='app-panel dashboard-list-panel' aria-labelledby='stock-priority-title'>
          <div className='app-panel-header dashboard-panel-header'><div><p className='data-kicker'>{t('dashboard.stockPriority')}</p><h2 id='stock-priority-title'>{t('dashboard.stockPriorityDescription')}</h2></div><Link to='/inventory' className='app-inline-link'>{t('dashboard.viewInventory')}<ArrowRight size={14} aria-hidden='true' /></Link></div>
          <div className='overflow-x-auto'><table className='data-table min-w-[620px]'><caption className='sr-only'>{t('dashboard.stockPriority')}</caption><thead><tr><th scope='col'>{t('inventory.partColumn')}</th><th scope='col' className='text-right'>{t('dashboard.available')}</th><th scope='col' className='text-right'>{t('inventory.minMax')}</th><th scope='col' className='text-right'>{t('dashboard.refill')}</th></tr></thead><tbody>{needsRefill.slice(0, 6).map((part) => <tr key={part.id}><td><p className='font-semibold text-[var(--text)]'>{part.partNumber}</p><p className='mt-1 max-w-[380px] truncate text-xs text-[var(--text-muted)]'>{part.description}</p></td><td className='text-right font-semibold text-[var(--danger)]'>{formatNumber(part.availableStock)}</td><td className='text-right text-[var(--text-muted)]'>{formatNumber(part.minStock)} / {formatNumber(part.maxStock)}</td><td className='text-right font-semibold text-[var(--brand-blue)]'>+{formatNumber(part.refillRecommendation)}</td></tr>)}{needsRefill.length === 0 && <tr><td colSpan={4} className='py-12 text-center text-sm text-[var(--text-muted)]'>{t('dashboard.noRefill')}</td></tr>}</tbody></table></div>
        </section>

        <section className='app-panel dashboard-list-panel' aria-labelledby='recent-outbound-title'>
          <div className='app-panel-header dashboard-panel-header'><div><p className='data-kicker'>{t('dashboard.recentOutbound')}</p><h2 id='recent-outbound-title'>{t('dashboard.recentOutboundDescription')}</h2></div><Link to='/outbound' className='app-inline-link'>{t('dashboard.viewOutbound')}<ArrowRight size={14} aria-hidden='true' /></Link></div>
          <div>{outbound.slice(0, 6).map((transaction) => <div key={transaction.id} className='dashboard-activity-row'><div className='min-w-0'><p className='truncate text-sm font-semibold text-[var(--text)]'>{transaction.partNumber}</p><p className='mt-1 truncate text-xs text-[var(--text-muted)]'>{transaction.requester} · {formatDate(transaction.requestDate)}</p></div><div className='text-right'><p className='text-sm font-semibold text-[var(--text)]'>{formatNumber(transaction.qtyRequest)}</p><p className='mt-1 text-[10px] text-[var(--text-muted)]'>{t('dashboard.requested')}</p></div></div>)}{outbound.length === 0 && <p className='px-5 py-12 text-center text-sm text-[var(--text-muted)]'>{t('dashboard.noOutbound')}</p>}</div>
        </section>
      </div>
    </div>
  )
}
