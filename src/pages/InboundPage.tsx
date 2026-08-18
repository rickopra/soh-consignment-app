import { useState } from 'react'
import { ArrowDownToLine, Plus, Search } from 'lucide-react'
import { useToast } from '../components/toast'
import { Button, Modal, NumberField, SectionHeader, SelectField, StatusBadge, TextAreaField, TextField } from '../components/ui'
import { useLanguage } from '../i18n/useLanguage'
import { localizedError } from '../lib/localizedError'
import { defaultInboundDraft, useAppStore } from '../store/appStore'
import type { GrStatus } from '../types'

export default function InboundPage() {
  const { language, t, formatDate, formatNumber } = useLanguage()
  const { parts, inbound, addInbound } = useAppStore()
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(defaultInboundDraft)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const currentPart = parts.find((part) => part.partNumber === draft.partNumber)
  const filtered = inbound.filter((item) => `${item.partNumber} ${item.matdocNumber} ${item.spbNumber} ${item.poNumber}`.toLowerCase().includes(search.toLowerCase()))
  const totalDocument = inbound.reduce((total, item) => total + item.qtyMatdoc, 0)
  const totalActual = inbound.reduce((total, item) => total + item.qtyActual, 0)
  const pendingGr = inbound.filter((item) => item.grStatus !== 'Done GR').length
  const closeModal = () => { setOpen(false); setError('') }
  const openModal = () => { setDraft({ ...defaultInboundDraft, partNumber: parts[0]?.partNumber ?? '' }); setError(''); setOpen(true) }
  const submit = async () => {
    if (!draft.partNumber || draft.qtyMatdoc < 1 || draft.qtyActual < 0) { setError(t('inbound.validation')); return }
    setSaving(true)
    setError('')
    try {
      await addInbound(draft)
      closeModal()
      push({ tone: 'success', title: t('inbound.saved'), description: t('inbound.savedDescription', { part: draft.partNumber, qty: formatNumber(draft.qtyMatdoc) }) })
    } catch (submitError) {
      setError(localizedError(submitError, language, t, 'inbound.saveFailed'))
    } finally { setSaving(false) }
  }
  const metrics = [
    { label: t('inbound.totalTransactions'), value: inbound.length },
    { label: t('inbound.totalDocumentQty'), value: totalDocument },
    { label: t('inbound.totalActualQty'), value: totalActual },
    { label: t('inbound.pendingGr'), value: pendingGr, emphasis: pendingGr > 0 },
  ]

  return (
    <div className='operational-view'>
      <SectionHeader title={t('inbound.title')} description={t('inbound.description')} action={<Button onClick={openModal} disabled={!parts.length}><Plus size={17} aria-hidden='true' />{t('inbound.new')}</Button>} />
      <section className='app-panel mb-6 grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4' aria-label={t('inbound.title')}>
        {metrics.map((metric, index) => <div key={metric.label} className={`min-h-[104px] p-5 ${index < metrics.length - 1 ? 'border-b border-[var(--border)] sm:border-r xl:border-b-0' : ''}`}><p className='text-xs font-medium text-[var(--text-muted)]'>{metric.label}</p><p className={`mt-3 text-2xl font-semibold ${metric.emphasis ? 'text-[var(--warning)]' : 'text-[var(--text)]'}`}>{formatNumber(metric.value)}</p></div>)}
      </section>
      <section className='app-panel overflow-hidden'>
        <div className='border-b border-[var(--border)] p-4 sm:p-5'><div className='relative max-w-xl'><label htmlFor='inbound-search' className='sr-only'>{t('inbound.searchLabel')}</label><Search size={17} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' aria-hidden='true' /><input id='inbound-search' type='search' value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('inbound.searchPlaceholder')} className='min-h-11 w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--surface-raised)] pl-10 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)] focus:border-[var(--brand-orange)] focus:ring-4 focus:ring-[var(--brand-orange)]/10' /></div></div>
        <div className='overflow-x-auto'><table className='data-table min-w-[820px]'><caption className='sr-only'>{t('inbound.tableCaption')}</caption><thead><tr><th scope='col'>{t('inbound.dateDocument')}</th><th scope='col'>{t('common.partNumber')}</th><th scope='col' className='text-right'>{t('inbound.documentQty')}</th><th scope='col' className='text-right'>{t('inbound.actualQty')}</th><th scope='col'>{t('inbound.grStatus')}</th></tr></thead><tbody>{filtered.map((item) => { const difference = Math.abs(item.qtyMatdoc - item.qtyActual); return <tr key={item.id}><td><p className='font-semibold text-[var(--text)]'>{formatDate(item.receivedDate)}</p><p className='mt-1 text-xs text-[var(--text-muted)]'>{item.matdocNumber || t('inbound.noMaterialDocument')}</p></td><td><p className='font-semibold text-[var(--text)]'>{item.partNumber}</p><p className='mt-1 max-w-[320px] truncate text-xs text-[var(--text-muted)]'>{parts.find((part) => part.partNumber === item.partNumber)?.description ?? t('inbound.partNotFound')}</p></td><td className='text-right font-semibold text-[var(--text)]'>{formatNumber(item.qtyMatdoc)}</td><td className='text-right font-semibold text-[var(--text)]'>{formatNumber(item.qtyActual)}</td><td><StatusBadge status={item.grStatus === 'Done GR' ? 'ready' : 'neutral'}>{item.grStatus === 'Done GR' ? t('common.doneGr') : t('common.pending')}</StatusBadge>{difference > 0 && <p className='mt-2 text-xs text-[var(--warning)]'>{t('inbound.difference', { count: formatNumber(difference) })}</p>}</td></tr>})}{filtered.length === 0 && <tr><td colSpan={5} className='py-16 text-center text-sm text-[var(--text-muted)]'>{t('inbound.noData')}</td></tr>}</tbody></table></div>
      </section>
      <Modal open={open} onClose={closeModal} title={t('inbound.modalTitle')} description={t('inbound.modalDescription')} size='lg'>
        <div className='space-y-6'>
          <div className='grid gap-4 sm:grid-cols-2'><TextField id='inbound-date' label={t('inbound.receivedDate')} type='date' value={draft.receivedDate} onChange={(value) => setDraft((current) => ({ ...current, receivedDate: value }))} required /><SelectField id='inbound-part' label={t('common.partNumber')} value={draft.partNumber} onChange={(value) => setDraft((current) => ({ ...current, partNumber: value }))} options={parts.map((part) => ({ value: part.partNumber, label: `${part.partNumber} | ${part.description.slice(0, 34)}` }))} required /><TextField id='inbound-matdoc' label={t('inbound.materialDocument')} value={draft.matdocNumber} onChange={(value) => setDraft((current) => ({ ...current, matdocNumber: value }))} hint={t('common.optional')} /><SelectField id='inbound-status' label={t('inbound.grStatus')} value={draft.grStatus} onChange={(value) => setDraft((current) => ({ ...current, grStatus: value as GrStatus }))} options={[{ value: 'Pending', label: t('common.pending') }, { value: 'Done GR', label: t('common.doneGr') }]} required /><NumberField id='inbound-matdoc-qty' label={t('inbound.documentQty')} value={draft.qtyMatdoc} onChange={(value) => setDraft((current) => ({ ...current, qtyMatdoc: value }))} min={1} required /><NumberField id='inbound-actual-qty' label={t('inbound.actualQty')} value={draft.qtyActual} onChange={(value) => setDraft((current) => ({ ...current, qtyActual: value }))} min={0} required /></div>
          {currentPart && <div className='flex items-start gap-3 border-l-4 border-[var(--brand-blue)] bg-[var(--surface-muted)] px-4 py-3'><ArrowDownToLine size={17} className='mt-0.5 text-[var(--brand-blue)]' aria-hidden='true' /><div><p className='text-xs font-semibold text-[var(--text-muted)]'>{t('inbound.selectedPart')}</p><p className='mt-1 text-sm font-semibold text-[var(--text)]'>{currentPart.partNumber}</p><p className='mt-1 text-xs text-[var(--text-muted)]'>{currentPart.description}</p></div></div>}
          {draft.qtyMatdoc !== draft.qtyActual && <p className='border-l-4 border-[var(--warning)] bg-[#fbf2df] px-4 py-3 text-sm leading-6 text-[#80500c]'>{t('inbound.differenceNotice', { count: formatNumber(Math.abs(draft.qtyMatdoc - draft.qtyActual)) })}</p>}
          <fieldset className='border-t border-[var(--border)] pt-5'><legend className='text-sm font-semibold text-[var(--text)]'>{t('inbound.references')}</legend><div className='mt-4 grid gap-4 sm:grid-cols-2'><TextField id='inbound-spb' label='No. SPB' value={draft.spbNumber} onChange={(value) => setDraft((current) => ({ ...current, spbNumber: value }))} hint={t('common.optional')} /><TextField id='inbound-po' label='No. PO' value={draft.poNumber} onChange={(value) => setDraft((current) => ({ ...current, poNumber: value }))} hint={t('common.optional')} /><TextField id='inbound-invoice' label='Invoice / TO' value={draft.invoiceOrTo} onChange={(value) => setDraft((current) => ({ ...current, invoiceOrTo: value }))} hint={t('common.optional')} /><TextField id='inbound-source' label={t('inbound.source')} value={draft.source} onChange={(value) => setDraft((current) => ({ ...current, source: value }))} hint={t('common.optional')} /></div></fieldset>
          <TextAreaField id='inbound-notes' label={t('inbound.notes')} value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: value }))} hint={t('common.optional')} />
          {error && <p role='alert' className='border-l-4 border-[#a33945] bg-[#f8e9eb] px-4 py-3 text-sm leading-6 text-[#7f2834]'>{error}</p>}
          <div className='flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end'><Button variant='secondary' onClick={closeModal} disabled={saving}>{t('common.cancel')}</Button><Button onClick={() => void submit()} disabled={saving}>{saving ? t('common.saving') : t('inbound.save')}</Button></div>
        </div>
      </Modal>
    </div>
  )
}
