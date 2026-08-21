import { useState } from 'react'
import { ArrowUpFromLine, Pencil, Plus, Search } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage'
import { localizedError } from '../lib/localizedError'
import { useAppStore, defaultOutboundDraft } from '../store/appStore'
import type { OutboundDocuments, OutboundTransaction, OutboundUpdate, WarehouseType } from '../types'
import { useToast } from '../components/toast'
import { Button, Modal, NumberField, SectionHeader, SelectField, StatusBadge, TextAreaField, TextField } from '../components/ui'

const warehouseOptions: Array<{ value: WarehouseType; label: string }> = [
  { value: 'Consignment', label: 'Consignment' },
  { value: 'Service Point', label: 'Service Point' },
  { value: 'Warehouse Store', label: 'Warehouse Store' },
]

function toEditDraft(t: OutboundTransaction): OutboundUpdate {
  return { qtyRequest: t.qtyRequest, qtySupply: t.qtySupply, documents: { ...t.documents }, notes: t.notes }
}

export default function OutboundPage() {
  const { language, t, formatDate, formatNumber } = useLanguage()
  const { parts, outbound, addOutbound, updateOutbound } = useAppStore()
  const activeParts = parts.filter((part) => part.active)
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(defaultOutboundDraft)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [editTarget, setEditTarget] = useState<OutboundTransaction | null>(null)
  const [editDraft, setEditDraft] = useState<OutboundUpdate>({ qtyRequest: 1, qtySupply: 0, documents: { pr: '', po: '', so: '', dn: '', invoice: '' }, notes: '' })
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const currentPart = parts.find((part) => part.partNumber === draft.partNumber)
  const needsDocuments = draft.warehouseType !== 'Warehouse Store'
  const filtered = outbound.filter((item) => `${item.partNumber} ${item.requester} ${Object.values(item.documents).join(' ')}`.toLowerCase().includes(search.toLowerCase()))
  const totalRequested = outbound.reduce((total, item) => total + item.qtyRequest, 0)
  const totalSupplied = outbound.reduce((total, item) => total + item.qtySupply, 0)
  const totalOutstanding = outbound.reduce((total, item) => total + Math.max(0, item.qtyRequest - item.qtySupply), 0)

  const updateDocument = (key: keyof OutboundDocuments, value: string) => setDraft((current) => ({ ...current, documents: { ...current.documents, [key]: value } }))
  const updateEditDocument = (key: keyof OutboundDocuments, value: string) => setEditDraft((current) => ({ ...current, documents: { ...current.documents, [key]: value } }))

  const closeModal = () => { setOpen(false); setError('') }
  const openModal = () => { setDraft({ ...defaultOutboundDraft, partNumber: activeParts[0]?.partNumber ?? '' }); setError(''); setOpen(true) }
  const openEdit = (transaction: OutboundTransaction) => { setEditTarget(transaction); setEditDraft(toEditDraft(transaction)); setEditError('') }
  const closeEdit = () => { setEditTarget(null); setEditError('') }

  const submit = async () => {
    if (!draft.requester.trim() || !draft.partNumber || !Number.isInteger(draft.qtyRequest) || !Number.isInteger(draft.qtySupply) || draft.qtyRequest < 1 || draft.qtySupply < 0 || draft.qtySupply > draft.qtyRequest) { setError(t('outbound.validation')); return }
    if (needsDocuments && !Object.values(draft.documents).some(Boolean)) { setError(t('outbound.documentValidation')); return }
    setSaving(true); setError('')
    try {
      await addOutbound(draft); closeModal()
      push({ tone: 'success', title: t('outbound.saved'), description: t('outbound.savedDescription', { part: draft.partNumber, qty: formatNumber(draft.qtyRequest) }) })
    } catch (submitError) { setError(localizedError(submitError, language, t, 'outbound.saveFailed')) } finally { setSaving(false) }
  }

  const submitEdit = async () => {
    if (!editTarget) return
    if (!Number.isInteger(editDraft.qtyRequest) || !Number.isInteger(editDraft.qtySupply) || editDraft.qtyRequest < 1 || editDraft.qtySupply < 0 || editDraft.qtySupply > editDraft.qtyRequest) { setEditError(t('outbound.validation')); return }
    if (editTarget.warehouseType !== 'Warehouse Store' && !Object.values(editDraft.documents).some(Boolean)) { setEditError(t('outbound.documentValidation')); return }
    setEditSaving(true); setEditError('')
    try {
      await updateOutbound(editTarget.id, editDraft); closeEdit()
      push({ tone: 'success', title: t('outbound.editSaved'), description: editTarget.partNumber })
    } catch (submitError) { setEditError(localizedError(submitError, language, t, 'outbound.saveFailed')) } finally { setEditSaving(false) }
  }

  const metrics = [
    { label: t('outbound.totalTransactions'), value: outbound.length },
    { label: t('outbound.totalRequested'), value: totalRequested },
    { label: t('outbound.totalSupplied'), value: totalSupplied },
    { label: t('outbound.outstanding'), value: totalOutstanding, emphasis: totalOutstanding > 0 },
  ]

  const editOutstanding = Math.max(0, editDraft.qtyRequest - editDraft.qtySupply)

  return (
    <div className='operational-view'>
      <SectionHeader title={t('outbound.title')} description={t('outbound.description')} action={<Button onClick={openModal} disabled={!activeParts.length}><Plus size={17} aria-hidden='true' />{t('outbound.new')}</Button>} />

      <section className='app-panel mb-6 grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4' aria-label={t('outbound.title')}>
        {metrics.map((metric, index) => <div key={metric.label} className={`min-h-[104px] p-5 ${index < metrics.length - 1 ? 'border-b border-[var(--border)] sm:border-r xl:border-b-0' : ''}`}><p className='text-xs font-medium text-[var(--text-muted)]'>{metric.label}</p><p className={`mt-3 text-2xl font-semibold ${metric.emphasis ? 'text-[var(--warning)]' : 'text-[var(--text)]'}`}>{formatNumber(metric.value)}</p></div>)}
      </section>

      <section className='app-panel overflow-hidden'>
        <div className='border-b border-[var(--border)] p-4 sm:p-5'>
          <div className='relative max-w-xl'><label htmlFor='outbound-search' className='sr-only'>{t('outbound.searchLabel')}</label><Search size={17} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' aria-hidden='true' /><input id='outbound-search' type='search' value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('outbound.searchPlaceholder')} className='min-h-11 w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--surface-raised)] pl-10 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)] focus:border-[var(--brand-orange)] focus:ring-4 focus:ring-[var(--brand-orange)]/10' /></div>
        </div>

        {/* Mobile card list ? hidden on md+ */}
        <ul className='divide-y divide-[var(--border)] md:hidden'>
          {filtered.map((item) => {
            const outstanding = Math.max(0, item.qtyRequest - item.qtySupply)
            return (
              <li key={item.id} className='p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='truncate font-semibold text-[var(--text)]'>{item.partNumber}</p>
                    <p className='mt-0.5 truncate text-xs text-[var(--text-muted)]'>{parts.find(p => p.partNumber === item.partNumber)?.description}</p>
                    <p className='mt-1 text-[11px] text-[var(--text-subtle)]'>{formatDate(item.requestDate)} ? {item.requester}</p>
                  </div>
                  <Button variant='secondary' size='sm' onClick={() => openEdit(item)} ariaLabel={`${t('common.edit')} ${item.partNumber}`}><Pencil size={14} aria-hidden='true' /></Button>
                </div>
                <div className='mt-3 grid grid-cols-3 divide-x divide-[var(--border)] rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] text-center'>
                  <div className='py-2 px-1'><p className='text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]'>{t('outbound.requestQty')}</p><p className='mt-1 text-sm font-semibold text-[var(--text)]'>{formatNumber(item.qtyRequest)}</p></div>
                  <div className='py-2 px-1'><p className='text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]'>{t('outbound.supplyQty')}</p><p className='mt-1 text-sm font-semibold text-[var(--text)]'>{formatNumber(item.qtySupply)}</p></div>
                  <div className='py-2 px-1'><p className='text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]'>O/S</p><p className={`mt-1 text-sm font-semibold ${outstanding > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>{formatNumber(outstanding)}</p></div>
                </div>
              </li>
            )
          })}
          {filtered.length === 0 && <li className='py-16 text-center text-sm text-[var(--text-muted)]'>{t('outbound.noData')}</li>}
        </ul>

        {/* Desktop table ? hidden on <md */}
        <div className='hidden overflow-x-auto md:block'>
          <table className='data-table min-w-[820px]'><caption className='sr-only'>{t('outbound.tableCaption')}</caption>
            <thead><tr><th scope='col'>{t('outbound.dateRequester')}</th><th scope='col'>{t('common.partNumber')}</th><th scope='col'>{t('outbound.warehouseType')}</th><th scope='col' className='text-right'>{t('outbound.requestQty')}</th><th scope='col' className='text-right'>{t('outbound.supplyQty')}</th><th scope='col' className='text-right'>{t('outbound.outstanding')}</th><th scope='col'>{t('outbound.documents')}</th><th scope='col' className='text-right'>{t('outbound.action')}</th></tr></thead>
            <tbody>{filtered.map((item) => {
              const outstanding = Math.max(0, item.qtyRequest - item.qtySupply)
              const documents = Object.entries(item.documents).filter(([, v]) => v).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' ? ')
              return (
                <tr key={item.id}>
                  <td><p className='font-semibold text-[var(--text)]'>{formatDate(item.requestDate)}</p><p className='mt-1 text-xs text-[var(--text-muted)]'>{item.requester}</p></td>
                  <td><p className='font-semibold text-[var(--text)]'>{item.partNumber}</p><p className='mt-1 max-w-[260px] truncate text-xs text-[var(--text-muted)]'>{parts.find((part) => part.partNumber === item.partNumber)?.description ?? t('common.notAvailable')}</p></td>
                  <td><span className='text-xs text-[var(--text-muted)]'>{item.warehouseType}</span></td>
                  <td className='text-right font-semibold text-[var(--text)]'>{formatNumber(item.qtyRequest)}</td>
                  <td className='text-right font-semibold text-[var(--text)]'>{formatNumber(item.qtySupply)}</td>
                  <td className='text-right'>{outstanding > 0 ? <StatusBadge status='warning'>{formatNumber(outstanding)}</StatusBadge> : <StatusBadge status='ready'>0</StatusBadge>}</td>
                  <td><p className='max-w-[260px] text-xs leading-5 text-[var(--text-muted)]'>{documents || '?'}</p></td>
                  <td className='text-right'><Button variant='secondary' size='sm' onClick={() => openEdit(item)} ariaLabel={`${t('common.edit')} ${item.partNumber}`}><Pencil size={14} aria-hidden='true' />{t('common.edit')}</Button></td>
                </tr>
              )
            })}{filtered.length === 0 && <tr><td colSpan={8} className='py-16 text-center text-sm text-[var(--text-muted)]'>{t('outbound.noData')}</td></tr>}</tbody>
          </table>
        </div>
      </section>

      {/* New Outbound Modal */}
      <Modal open={open} onClose={closeModal} title={t('outbound.modalTitle')} description={t('outbound.modalDescription')} size='lg'>
        <div className='space-y-6'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <TextField id='outbound-requester' label={t('outbound.requester')} value={draft.requester} onChange={(value) => setDraft((current) => ({ ...current, requester: value }))} placeholder={t('outbound.requesterPlaceholder')} required />
            <TextField id='outbound-date' label={t('outbound.requestDate')} type='date' value={draft.requestDate} onChange={(value) => setDraft((current) => ({ ...current, requestDate: value }))} required />
            <SelectField id='outbound-part' label={t('common.partNumber')} value={draft.partNumber} onChange={(value) => setDraft((current) => ({ ...current, partNumber: value }))} options={activeParts.map((part) => ({ value: part.partNumber, label: `${part.partNumber} | ${part.description.slice(0, 34)}` }))} required />
            <SelectField id='outbound-warehouse' label={t('outbound.warehouseType')} value={draft.warehouseType} onChange={(value) => setDraft((current) => ({ ...current, warehouseType: value as WarehouseType }))} options={warehouseOptions} />
            <NumberField id='outbound-request-qty' label={t('outbound.requestQty')} value={draft.qtyRequest} onChange={(value) => setDraft((current) => ({ ...current, qtyRequest: value, qtySupply: Math.min(current.qtySupply, value) }))} min={1} required />
            <NumberField id='outbound-supply-qty' label={t('outbound.supplyQty')} value={draft.qtySupply} onChange={(value) => setDraft((current) => ({ ...current, qtySupply: value }))} min={0} max={draft.qtyRequest} required />
          </div>
          {currentPart && <div className='flex items-start gap-3 border-l-4 border-[var(--brand-blue)] bg-[var(--surface-muted)] px-4 py-3'><ArrowUpFromLine size={17} className='mt-0.5 text-[var(--brand-blue)]' aria-hidden='true' /><div><p className='text-xs font-semibold text-[var(--text-muted)]'>{t('outbound.selectedPart')}</p><p className='mt-1 text-sm font-semibold text-[var(--text)]'>{currentPart.partNumber}</p><p className='mt-1 text-xs text-[var(--text-muted)]'>{currentPart.description}</p></div></div>}
          {needsDocuments && <fieldset className='border-t border-[var(--border)] pt-5'><legend className='text-sm font-semibold text-[var(--text)]'>{t('outbound.documents')}</legend><p className='mt-1 text-xs text-[var(--text-muted)]'>{t('outbound.documentsHint')}</p><div className='mt-4 grid gap-4 sm:grid-cols-2'><TextField id='outbound-pr' label='No. PR' value={draft.documents.pr} onChange={(value) => updateDocument('pr', value)} hint={t('common.optional')} /><TextField id='outbound-po' label='No. PO' value={draft.documents.po} onChange={(value) => updateDocument('po', value)} hint={t('common.optional')} /><TextField id='outbound-so' label='No. SO' value={draft.documents.so} onChange={(value) => updateDocument('so', value)} hint={t('common.optional')} /><TextField id='outbound-dn' label='No. DN' value={draft.documents.dn} onChange={(value) => updateDocument('dn', value)} hint={t('common.optional')} /><TextField id='outbound-invoice' label='No. Invoice' value={draft.documents.invoice} onChange={(value) => updateDocument('invoice', value)} hint={t('common.optional')} /></div></fieldset>}
          <TextAreaField id='outbound-notes' label={t('outbound.notes')} value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: value }))} placeholder={t('outbound.notesPlaceholder')} />
          {error && <p role='alert' className='border-l-4 border-[#a33945] bg-[#f8e9eb] px-4 py-3 text-sm leading-6 text-[#7f2834]'>{error}</p>}
          <div className='flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end'><Button variant='secondary' onClick={closeModal} disabled={saving}>{t('common.cancel')}</Button><Button onClick={() => void submit()} disabled={saving}>{saving ? t('common.saving') : t('outbound.save')}</Button></div>
        </div>
      </Modal>

      {/* Edit Outbound Modal */}
      <Modal open={editTarget !== null} onClose={closeEdit} title={t('outbound.editTitle')} description={t('outbound.editDescription')} size='lg'>
        {editTarget && (
          <div className='space-y-6'>
            <div className='rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3'>
              <p className='font-semibold text-[var(--text)]'>{editTarget.partNumber}</p>
              <p className='mt-0.5 text-xs text-[var(--text-muted)]'>{parts.find(p => p.partNumber === editTarget.partNumber)?.description}</p>
              <p className='mt-1 text-xs text-[var(--text-subtle)]'>{formatDate(editTarget.requestDate)} ? {editTarget.requester}</p>
            </div>

            {/* Qty summary */}
            <div aria-live='polite' className='grid grid-cols-3 divide-x divide-[var(--border)] rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] text-center'>
              <div className='py-3 px-2'><p className='text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]'>{t('outbound.requestQty')}</p><p className='mt-1 text-lg font-semibold text-[var(--text)]'>{formatNumber(editDraft.qtyRequest)}</p></div>
              <div className='py-3 px-2'><p className='text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]'>{t('outbound.supplyQty')}</p><p className='mt-1 text-lg font-semibold text-[var(--text)]'>{formatNumber(editDraft.qtySupply)}</p></div>
              <div className='py-3 px-2'><p className='text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]'>O/S</p><p className={`mt-1 text-lg font-semibold ${editOutstanding > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>{formatNumber(editOutstanding)}</p></div>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <NumberField id='edit-request-qty' label={t('outbound.requestQty')} value={editDraft.qtyRequest} onChange={(value) => setEditDraft((current) => ({ ...current, qtyRequest: value }))} min={1} required />
              <NumberField id='edit-supply-qty' label={t('outbound.supplyQty')} value={editDraft.qtySupply} onChange={(value) => setEditDraft((current) => ({ ...current, qtySupply: value }))} min={0} max={editDraft.qtyRequest} required />
            </div>
            <fieldset className='border-t border-[var(--border)] pt-5'><legend className='text-sm font-semibold text-[var(--text)]'>{t('outbound.documents')}</legend><div className='mt-4 grid gap-4 sm:grid-cols-2'><TextField id='edit-pr' label='No. PR' value={editDraft.documents.pr} onChange={(value) => updateEditDocument('pr', value)} hint={t('common.optional')} /><TextField id='edit-po' label='No. PO' value={editDraft.documents.po} onChange={(value) => updateEditDocument('po', value)} hint={t('common.optional')} /><TextField id='edit-so' label='No. SO' value={editDraft.documents.so} onChange={(value) => updateEditDocument('so', value)} hint={t('common.optional')} /><TextField id='edit-dn' label='No. DN' value={editDraft.documents.dn} onChange={(value) => updateEditDocument('dn', value)} hint={t('common.optional')} /><TextField id='edit-invoice' label='No. Invoice' value={editDraft.documents.invoice} onChange={(value) => updateEditDocument('invoice', value)} hint={t('common.optional')} /></div></fieldset>
            <TextAreaField id='edit-notes' label={t('outbound.notes')} value={editDraft.notes} onChange={(value) => setEditDraft((current) => ({ ...current, notes: value }))} />
            {editError && <p role='alert' className='border-l-4 border-[#a33945] bg-[#f8e9eb] px-4 py-3 text-sm leading-6 text-[#7f2834]'>{editError}</p>}
            <div className='flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end'><Button variant='secondary' onClick={closeEdit} disabled={editSaving}>{t('common.cancel')}</Button><Button onClick={() => void submitEdit()} disabled={editSaving}>{editSaving ? t('common.saving') : t('common.save')}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
