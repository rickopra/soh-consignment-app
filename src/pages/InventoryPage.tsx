import { useState } from 'react'
import { Download, Search } from 'lucide-react'
import { Button, SectionHeader, StatusBadge } from '../components/ui'
import { useLanguage } from '../i18n/useLanguage'
import { calculateInventory, downloadCsv } from '../lib/utils'
import { useAppStore } from '../store/appStore'

type StockFilter = 'ALL' | 'READY' | 'NOT_READY'

export default function InventoryPage() {
  const { language, t, formatNumber } = useLanguage()
  const { parts, outbound, inbound, adjustments } = useAppStore()
  const inventory = calculateInventory(parts, outbound, inbound, adjustments)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StockFilter>('ALL')
  const filtered = inventory.filter((item) => `${item.partNumber} ${item.description} ${item.location}`.toLowerCase().includes(search.toLowerCase()) && (status === 'ALL' || item.status === status))
  const labels = language === 'id' ? { part: 'Nomor Part', description: 'Deskripsi', location: 'Lokasi', min: 'Minimum', max: 'Maksimum', status: 'Status' } : { part: 'Part Number', description: 'Description', location: 'Location', min: 'Minimum', max: 'Maximum', status: 'Status' }

  const exportInventory = () => downloadCsv('soh-inventory.csv', filtered.map((item) => ({
    [labels.part]: item.partNumber,
    [labels.description]: item.description,
    [labels.location]: item.location,
    [t('inventory.exportPhysical')]: item.physicalStock,
    [t('inventory.exportAvailable')]: item.availableStock,
    [labels.min]: item.minStock,
    [labels.max]: item.maxStock,
    [labels.status]: item.status === 'READY' ? t('common.ready') : t('common.notReady'),
    [t('inventory.exportRecommendation')]: item.refillRecommendation,
  })))

  const filters: Array<{ value: StockFilter; label: string }> = [
    { value: 'ALL', label: t('common.all') },
    { value: 'READY', label: t('common.ready') },
    { value: 'NOT_READY', label: t('common.notReady') },
  ]

  return (
    <div className='operational-view'>
      <SectionHeader title={t('inventory.title')} description={t('inventory.description')} action={<Button variant='secondary' onClick={exportInventory} disabled={!filtered.length}><Download size={16} aria-hidden='true' />{t('inventory.export')}</Button>} />
      <section className='app-panel overflow-hidden' aria-labelledby='inventory-table-title'>
        <div className='flex flex-col gap-4 border-b border-[var(--border)] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between'>
          <div className='relative w-full max-w-xl'><label htmlFor='inventory-search' className='sr-only'>{t('inventory.searchLabel')}</label><Search size={17} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' aria-hidden='true' /><input id='inventory-search' type='search' placeholder={t('inventory.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} className='min-h-11 w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--surface-raised)] pl-10 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)] focus:border-[var(--brand-orange)] focus:ring-4 focus:ring-[var(--brand-orange)]/10' /></div>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'><p id='inventory-table-title' className='whitespace-nowrap text-xs font-medium text-[var(--text-muted)]'>{t('inventory.resultCount', { count: formatNumber(filtered.length) })}</p><div className='inline-flex border border-[var(--border-strong)] bg-[var(--surface-muted)] p-1' role='group' aria-label={t('inventory.filterLabel')}>{filters.map((filter) => <button key={filter.value} type='button' onClick={() => setStatus(filter.value)} className={`min-h-8 px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${status === filter.value ? 'bg-[var(--brand-blue)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]'}`} aria-pressed={status === filter.value}>{filter.label}</button>)}</div></div>
        </div>

        <div className='overflow-x-auto'><table className='data-table min-w-[820px]'><caption className='sr-only'>{t('inventory.tableCaption')}</caption><thead><tr><th scope='col'>{t('inventory.partColumn')}</th><th scope='col'>{t('common.status')}</th><th scope='col' className='text-right'>{t('inventory.physicalStock')}</th><th scope='col' className='text-right'>{t('inventory.availableStock')}</th><th scope='col' className='text-right'>{t('inventory.minMax')}</th><th scope='col' className='text-right'>{t('inventory.refill')}</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><p className='font-semibold text-[var(--text)]'>{item.partNumber}</p><p className='mt-1 max-w-[420px] truncate text-xs text-[var(--text-muted)]' title={item.description}>{item.description}</p><p className='mt-1 text-[11px] text-[var(--text-subtle)]'>{item.location}</p></td><td><StatusBadge status={item.status === 'READY' ? 'ready' : 'danger'}>{item.status === 'READY' ? t('common.ready') : t('common.notReady')}</StatusBadge></td><td className='text-right'><p className='font-semibold text-[var(--text)]'>{formatNumber(item.physicalStock)}</p><p className='mt-1 text-[10px] text-[var(--text-subtle)]'>{t('inventory.actual')}</p></td><td className='text-right'><p className='font-semibold text-[var(--text)]'>{formatNumber(item.availableStock)}</p><p className='mt-1 text-[10px] text-[var(--text-subtle)]'>{t('inventory.afterRequest')}</p></td><td className='text-right text-[var(--text-muted)]'>{formatNumber(item.minStock)} / {formatNumber(item.maxStock)}</td><td className='text-right'>{item.refillRecommendation > 0 ? <span className='font-semibold text-[var(--brand-blue)]'>+{formatNumber(item.refillRecommendation)}</span> : <span className='text-[var(--text-subtle)]'>—</span>}</td></tr>)}{filtered.length === 0 && <tr><td colSpan={6} className='py-16 text-center text-sm text-[var(--text-muted)]'>{t('inventory.noMatch')}</td></tr>}</tbody></table></div>
      </section>
    </div>
  )
}
