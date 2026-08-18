import { FileText, Printer } from 'lucide-react'
import { Button, SectionHeader, StatusBadge } from '../components/ui'
import { useLanguage } from '../i18n/useLanguage'
import { calculateInventory, downloadCsv, todayIso } from '../lib/utils'
import { useAppStore } from '../store/appStore'

export default function RefillPage() {
  const { language, t, formatNumber } = useLanguage()
  const { parts, outbound, inbound, adjustments } = useAppStore()
  const inventory = calculateInventory(parts, outbound, inbound, adjustments)
  const needsRefill = inventory.filter((item) => item.refillRecommendation > 0).sort((a, b) => b.refillRecommendation - a.refillRecommendation)
  const totalRefill = needsRefill.reduce((total, item) => total + item.refillRecommendation, 0)

  const exportRefill = () => downloadCsv(`Item_Refill_TO_${todayIso()}.csv`, needsRefill.map((item) => ({
    [language === 'id' ? 'Nomor Part' : 'Part Number']: item.partNumber,
    [t('common.description')]: item.description,
    [t('refill.currentStock')]: item.availableStock,
    [t('refill.recommendedQty')]: item.refillRecommendation,
    [t('common.location')]: item.location,
    [language === 'id' ? 'Catatan' : 'Notes']: '',
  })))
  const exportVoucher = () => downloadCsv(`Parts_Voucher_${todayIso()}.csv`, inventory.map((item) => ({
    [language === 'id' ? 'Nomor Part' : 'Part Number']: item.partNumber,
    [t('common.description')]: item.description,
    [t('common.location')]: item.location,
    [language === 'id' ? 'Stok fisik' : 'Physical stock']: item.physicalStock,
    [language === 'id' ? 'Catatan' : 'Notes']: '',
  })))

  return (
    <div className='operational-view'>
      <SectionHeader title={t('refill.title')} description={t('refill.description')} />
      <section className='app-panel mb-6 grid overflow-hidden lg:grid-cols-2'>
        <div className='flex flex-col gap-5 border-b border-[var(--border)] p-5 sm:p-6 lg:border-b-0 lg:border-r'><div className='flex items-start gap-4'><span className='flex h-10 w-10 shrink-0 items-center justify-center bg-[#fbf2df] text-[var(--warning)]'><FileText size={19} aria-hidden='true' /></span><div><h2 className='text-base font-semibold text-[var(--text)]'>{t('refill.refillTitle')}</h2><p className='mt-1 text-sm leading-5 text-[var(--text-muted)]'>{t('refill.refillDescription')}</p></div></div><div className='mt-auto flex items-end justify-between gap-4 border-t border-[var(--border)] pt-4'><div><p className='text-2xl font-semibold text-[var(--text)]'>{formatNumber(needsRefill.length)}</p><p className='mt-1 text-xs text-[var(--text-muted)]'>{t('refill.itemsRequired')}</p></div><div className='text-right'><p className='text-2xl font-semibold text-[var(--brand-blue)]'>{formatNumber(totalRefill)}</p><p className='mt-1 text-xs text-[var(--text-muted)]'>{t('refill.totalQuantity')}</p></div></div><Button onClick={exportRefill} disabled={!needsRefill.length}><Printer size={16} aria-hidden='true' />{t('refill.exportRefill')}</Button></div>
        <div className='flex flex-col gap-5 p-5 sm:p-6'><div className='flex items-start gap-4'><span className='flex h-10 w-10 shrink-0 items-center justify-center bg-[#e8f0f5] text-[var(--brand-blue)]'><FileText size={19} aria-hidden='true' /></span><div><h2 className='text-base font-semibold text-[var(--text)]'>{t('refill.voucherTitle')}</h2><p className='mt-1 text-sm leading-5 text-[var(--text-muted)]'>{t('refill.voucherDescription')}</p></div></div><div className='mt-auto border-t border-[var(--border)] pt-4'><p className='text-2xl font-semibold text-[var(--text)]'>{formatNumber(parts.length)}</p><p className='mt-1 text-xs text-[var(--text-muted)]'>{t('refill.masterParts')}</p></div><Button variant='secondary' onClick={exportVoucher} disabled={!inventory.length}><Printer size={16} aria-hidden='true' />{t('refill.exportVoucher')}</Button></div>
      </section>

      <section className='app-panel overflow-hidden' aria-labelledby='refill-table-title'><div className='app-panel-header flex items-start justify-between gap-4'><div><h2 id='refill-table-title' className='text-base font-semibold text-[var(--text)]'>{t('refill.tableTitle')}</h2><p className='mt-1 text-xs leading-5 text-[var(--text-muted)]'>{t('refill.tableDescription')}</p></div><StatusBadge status={needsRefill.length ? 'warning' : 'ready'}>{formatNumber(needsRefill.length)} {t('common.parts')}</StatusBadge></div><div className='overflow-x-auto'><table className='data-table min-w-[680px]'><caption className='sr-only'>{t('refill.tableCaption')}</caption><thead><tr><th scope='col'>{t('common.partNumber')}</th><th scope='col'>{t('common.description')}</th><th scope='col'>{t('common.location')}</th><th scope='col' className='text-right'>{t('refill.currentStock')}</th><th scope='col' className='text-right'>{t('refill.recommendedQty')}</th></tr></thead><tbody>{needsRefill.map((item) => <tr key={item.id}><td className='font-semibold text-[var(--text)]'>{item.partNumber}</td><td><p className='max-w-[360px] truncate text-[var(--text)]'>{item.description}</p></td><td className='text-[var(--text-muted)]'>{item.location}</td><td className='text-right font-semibold text-[var(--danger)]'>{formatNumber(item.availableStock)}</td><td className='text-right font-semibold text-[var(--brand-blue)]'>+{formatNumber(item.refillRecommendation)}</td></tr>)}{needsRefill.length === 0 && <tr><td colSpan={5} className='py-16 text-center text-sm text-[var(--text-muted)]'>{t('refill.noData')}</td></tr>}</tbody></table></div></section>
    </div>
  )
}
