import { useMemo, useState } from 'react'
import { Pagination } from '../components/Pagination'
import { ArrowUpFromLine, MessageSquareText, Pencil, Plus, Search } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage'
import { localizedError } from '../lib/localizedError'
import { useAppStore, defaultOutboundDraft } from '../store/appStore'
import type { OutboundDocuments, OutboundTransaction, OutboundUpdate, WarehouseType } from '../types'
import { useToast } from '../components/toast'
import { Button, Drawer, FormDivider, FormError, FormRow, IconButton, NumberField, SectionHeader, SelectField, StatusBadge, TextAreaField, TextField } from '../components/ui'

const warehouseOptions: Array<{ value: WarehouseType; label: string }> = [
  { value: 'Consignment', label: 'Consignment' },
  { value: 'Service Point', label: 'Service Point' },
  { value: 'Warehouse Store', label: 'Warehouse Store' },
]

function toEditDraft(tx: OutboundTransaction): OutboundUpdate {
  return { qtyRequest: tx.qtyRequest, qtySupply: tx.qtySupply, documents: { ...tx.documents }, notes: tx.notes }
}

const documentFields: Array<{ key: keyof OutboundDocuments; label: string }> = [
  { key: 'pr', label: 'PR' },
  { key: 'po', label: 'PO' },
  { key: 'so', label: 'SO' },
  { key: 'dn', label: 'DN' },
  { key: 'invoice', label: 'Invoice' },
]

function DocumentReferenceList({ documents, emptyLabel }: { documents: OutboundDocuments; emptyLabel: string }) {
  const entries = documentFields.filter(({ key }) => documents[key].trim())
  if (!entries.length) return <span className='text-xs text-[var(--text-subtle)]'>{emptyLabel}</span>
  return (
    <div className='flex flex-wrap gap-1.5'>
      {entries.map(({ key, label }) => (
        <span key={key} title={label + ': ' + documents[key]} className='inline-flex min-w-0 items-center gap-1.5 rounded-[5px] border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-[11px] leading-4'>
          <span className='shrink-0 font-bold text-[var(--brand-blue)]'>{label}</span>
          <span className='break-all font-medium tabular-nums text-[var(--text)]'>{documents[key]}</span>
        </span>
      ))}
    </div>
  )
}

function NotesPreview({ notes, emptyLabel, full = false }: { notes: string; emptyLabel: string; full?: boolean }) {
  const value = notes.trim()
  if (!value) return <span className='text-xs text-[var(--text-subtle)]'>{emptyLabel}</span>
  return (
    <div className='flex min-w-0 items-start gap-2 text-[var(--text-muted)]'>
      <MessageSquareText size={14} className='mt-0.5 shrink-0 text-[var(--brand-orange)]' aria-hidden='true' />
      <p title={value} className={full ? 'whitespace-pre-wrap break-words text-xs leading-5 text-[var(--text-muted)]' : 'max-w-[240px] truncate text-xs leading-5 text-[var(--text-muted)]'}>{value}</p>
    </div>
  )
}

export default function OutboundPage() {
  const { language, t, formatDate, formatNumber } = useLanguage()
  const { parts, outbound, addOutbound, updateOutbound } = useAppStore()
  const activeParts = useMemo(() => parts.filter((part) => part.active), [parts])
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

  const isId = language === 'id'
  const partByNumber = useMemo(() => new Map(parts.map((part) => [part.partNumber, part])), [parts])
  const modelValues = useMemo(
    () => Array.from(new Set(activeParts.map((part) => part.model.trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [activeParts],
  )
  const modelFilterOptions = useMemo(
    () => [{ value: 'ALL', label: t('common.allModels') }, ...modelValues.map((model) => ({ value: model, label: model }))],
    [modelValues, t],
  )
  const [modelFilter, setModelFilter] = useState('ALL')
  const effectiveModelFilter = modelFilter === 'ALL' || modelValues.includes(modelFilter) ? modelFilter : 'ALL'
  const currentPart = partByNumber.get(draft.partNumber)
  const needsDocuments = draft.warehouseType !== 'Warehouse Store'
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return outbound.filter((item) => {
      const part = partByNumber.get(item.partNumber)
      const matchesSearch = `${item.partNumber} ${part?.model ?? ''} ${part?.description ?? ''} ${item.requester} ${Object.values(item.documents).join(' ')} ${item.notes}`.toLowerCase().includes(query)
      const matchesModel = effectiveModelFilter === 'ALL' || part?.model === effectiveModelFilter
      return matchesSearch && matchesModel
    })
  }, [effectiveModelFilter, outbound, partByNumber, search])
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const safePage = Math.min(page, Math.max(1, totalPages))
  const pagedItems = useMemo(() => filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage), [filtered, itemsPerPage, safePage])
  const totalRequested = outbound.reduce((total, item) => total + item.qtyRequest, 0)
  const totalSupplied = outbound.reduce((total, item) => total + item.qtySupply, 0)
  const totalOutstanding = outbound.reduce((total, item) => total + Math.max(0, item.qtyRequest - item.qtySupply), 0)
  const editOutstanding = editDraft ? Math.max(0, editDraft.qtyRequest - editDraft.qtySupply) : 0

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

  return (
    <div className='operational-view'>
      <SectionHeader title={t('outbound.title')} description={t('outbound.description')} action={<Button onClick={openModal} disabled={!activeParts.length}><Plus size={17} aria-hidden='true' />{t('outbound.new')}</Button>} />
      <section className='app-panel mb-6 grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4' aria-label={t('outbound.title')}>
        {metrics.map((metric, index) => <div key={metric.label} className={`min-h-[104px] p-5 ${index < metrics.length - 1 ? 'border-b border-[var(--border)] sm:border-r xl:border-b-0' : ''}`}><p className='text-xs font-medium text-[var(--text-muted)]'>{metric.label}</p><p className={`mt-3 text-2xl font-semibold ${metric.emphasis ? 'text-[var(--warning)]' : 'text-[var(--text)]'}`}>{formatNumber(metric.value)}</p></div>)}
      </section>

      <section className='app-panel overflow-hidden'>
        <div className='grid gap-4 border-b border-[var(--border)] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end'>
          <div className='relative'>
            <label htmlFor='outbound-search' className='sr-only'>{t('outbound.searchLabel')}</label>
            <Search size={17} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' aria-hidden='true' />
            <input id='outbound-search' type='search' placeholder={t('outbound.searchPlaceholder')} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} className='min-h-11 w-full rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface-raised)] pl-10 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)] focus:border-[var(--brand-orange)] focus:ring-4 focus:ring-[var(--brand-orange)]/10' />
          </div>
          <SelectField id='outbound-model-filter' label={t('common.modelFilter')} value={effectiveModelFilter} onChange={(value) => { setModelFilter(value); setPage(1) }} options={modelFilterOptions} variant='surface' />
        </div>

        {/* Mobile cards */}
        <ul className='divide-y divide-[var(--border)] xl:hidden'>
          {pagedItems.map((item) => {
            const outstanding = Math.max(0, item.qtyRequest - item.qtySupply)
            return (
              <li key={item.id} className='p-4'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='truncate font-semibold text-[var(--text)]'>{item.partNumber}</p>
                    <p className='mt-0.5 text-xs text-[var(--text-muted)]'>{formatDate(item.requestDate)} — {item.requester}</p>
                  </div>
                  <Button variant='secondary' size='sm' onClick={() => openEdit(item)} ariaLabel={`${t('common.edit')} ${item.partNumber}`}><Pencil size={13} /></Button>
                </div>
                <div className='mt-3 grid grid-cols-3 divide-x divide-[var(--border)] rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] text-center'>
                  <div className='py-2 px-1'><p className='text-[9px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]'>{isId ? 'Diminta' : 'Req'}</p><p className='mt-1 font-semibold text-[var(--text)]'>{formatNumber(item.qtyRequest)}</p></div>
                  <div className='py-2 px-1'><p className='text-[9px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]'>{isId ? 'Dikirim' : 'Sup'}</p><p className='mt-1 font-semibold text-[var(--text)]'>{formatNumber(item.qtySupply)}</p></div>
                  <div className='py-2 px-1'><p className='text-[9px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]'>O/S</p><p className={`mt-1 font-semibold ${outstanding > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>{formatNumber(outstanding)}</p></div>
                </div>
                <div className='mt-3 border-t border-[var(--border)] pt-3'>
                  <p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'>{t('outbound.documents')}</p>
                  <DocumentReferenceList documents={item.documents} emptyLabel={t('outbound.noDocuments')} />
                </div>
                <div className='mt-3 border-t border-[var(--border)] pt-3'>
                  <p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'>{t('outbound.notes')}</p>
                  <NotesPreview notes={item.notes} emptyLabel={t('outbound.noNotes')} full />
                </div>
              </li>
            )
          })}
          {filtered.length === 0 && <li className='py-16 text-center text-sm text-[var(--text-muted)]'>{t('outbound.noData')}</li>}
        </ul>

        {/* Desktop table */}
        <div className='hidden xl:block'>
          <table className='data-table w-full table-fixed'><caption className='sr-only'>{t('outbound.tableCaption')}</caption>
            <thead><tr>
              <th scope='col' className='w-[140px]'>{t('outbound.dateRequester')}</th>
              <th scope='col' className='w-[160px]'>{t('common.partNumber')}</th>
              <th scope='col' className='w-[120px]'>{t('outbound.warehouseType')}</th>
              <th scope='col' className='w-[80px] text-right'>{t('outbound.requestQty')}</th>
              <th scope='col' className='w-[80px] text-right'>{t('outbound.supplyQty')}</th>
              <th scope='col' className='w-[80px] text-right'>{t('outbound.outstanding')}</th>
              <th scope='col' className='w-[180px]'>{t('outbound.documents')}</th>
              <th scope='col'>{t('outbound.notes')}</th>
              <th scope='col' className='w-[64px] text-right'>{t('common.actions')}</th>
            </tr></thead>
            <tbody>{pagedItems.map((item) => {
              const outstanding = Math.max(0, item.qtyRequest - item.qtySupply)
              return (
                <tr key={item.id}>
                  <td><p className='font-semibold text-[var(--text)]'>{formatDate(item.requestDate)}</p><p className='mt-1 text-xs text-[var(--text-muted)]'>{item.requester}</p></td>
                  <td><p className='font-semibold text-[var(--text)]'>{item.partNumber}</p><p className='mt-1 max-w-[240px] truncate text-xs text-[var(--text-muted)]'>{parts.find((part) => part.partNumber === item.partNumber)?.description ?? t('common.notAvailable')}</p></td>
                  <td><span className='text-xs text-[var(--text-muted)]'>{item.warehouseType}</span></td>
                  <td className='text-right font-semibold text-[var(--text)]'>{formatNumber(item.qtyRequest)}</td>
                  <td className='text-right font-semibold text-[var(--text)]'>{formatNumber(item.qtySupply)}</td>
                  <td className='text-right'>{outstanding > 0 ? <StatusBadge status='warning'>{formatNumber(outstanding)}</StatusBadge> : <StatusBadge status='ready'>0</StatusBadge>}</td>
                  <td><DocumentReferenceList documents={item.documents} emptyLabel={t('outbound.noDocuments')} /></td>
                  <td><NotesPreview notes={item.notes} emptyLabel={t('outbound.noNotes')} /></td>
                  <td><div className='flex justify-end'><IconButton variant='secondary' label={`${t('common.edit')} ${item.partNumber}`} onClick={() => openEdit(item)}><Pencil size={14} aria-hidden='true' /></IconButton></div></td>
                </tr>
              )
            })}{filtered.length === 0 && <tr><td colSpan={9} className='py-16 text-center text-sm text-[var(--text-muted)]'>{t('outbound.noData')}</td></tr>}</tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={(value) => { setItemsPerPage(value); setPage(1) }} />
      </section>

      {/* New Outbound Drawer */}
      <Drawer open={open} onClose={closeModal} title={t('outbound.modalTitle')} description={t('outbound.modalDescription')} width='md'
        footer={
          <div className='flex justify-end gap-3'>
            <Button variant='secondary' onClick={closeModal} disabled={saving}>{t('common.cancel')}</Button>
            <Button onClick={() => void submit()} disabled={saving}>{saving ? t('common.saving') : t('outbound.save')}</Button>
          </div>
        }
      >
        <div className='flex flex-col gap-7'>
          <FormRow>
            <TextField id='outbound-requester' label={t('outbound.requester')} value={draft.requester} onChange={(value) => setDraft((current) => ({ ...current, requester: value }))} placeholder={t('outbound.requesterPlaceholder')} required />
            <TextField id='outbound-date' label={t('outbound.requestDate')} type='date' value={draft.requestDate} onChange={(value) => setDraft((current) => ({ ...current, requestDate: value }))} required />
          </FormRow>
          <FormRow>
            <SelectField id='outbound-part' label={t('common.partNumber')} value={draft.partNumber} onChange={(value) => setDraft((current) => ({ ...current, partNumber: value }))} options={activeParts.map((part) => ({ value: part.partNumber, label: part.partNumber + ' | ' + part.description.slice(0, 30) }))} required />
            <SelectField id='outbound-warehouse' label={t('outbound.warehouseType')} value={draft.warehouseType} onChange={(value) => setDraft((current) => ({ ...current, warehouseType: value as WarehouseType }))} options={warehouseOptions} />
          </FormRow>
          {currentPart && (
            <div className='flex items-start gap-3 rounded-[8px] border-l-4 border-[var(--brand-blue)] bg-[var(--surface-muted)] px-4 py-3'>
              <ArrowUpFromLine size={16} className='mt-0.5 shrink-0 text-[var(--brand-blue)]' aria-hidden='true' />
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]'>{t('outbound.selectedPart')}</p>
                <p className='mt-1 text-sm font-semibold text-[var(--text)]'>{currentPart.partNumber}</p>
                <p className='mt-0.5 text-xs text-[var(--text-muted)]'>{currentPart.description}</p>
              </div>
            </div>
          )}
          <FormRow>
            <NumberField id='outbound-request-qty' label={t('outbound.requestQty')} value={draft.qtyRequest} onChange={(value) => setDraft((current) => ({ ...current, qtyRequest: value, qtySupply: Math.min(current.qtySupply, value) }))} min={1} required />
            <NumberField id='outbound-supply-qty' label={t('outbound.supplyQty')} value={draft.qtySupply} onChange={(value) => setDraft((current) => ({ ...current, qtySupply: value }))} min={0} max={draft.qtyRequest} required />
          </FormRow>
          {needsDocuments && (
            <>
              <FormDivider label={t('outbound.documents')} />
              <p className='text-xs text-[var(--text-subtle)]'>{t('outbound.documentsHint')}</p>
              <FormRow>
                <TextField id='outbound-pr' label='No. PR' value={draft.documents.pr} onChange={(value) => updateDocument('pr', value)} hint={t('common.optional')} />
                <TextField id='outbound-po' label='No. PO' value={draft.documents.po} onChange={(value) => updateDocument('po', value)} hint={t('common.optional')} />
                <TextField id='outbound-so' label='No. SO' value={draft.documents.so} onChange={(value) => updateDocument('so', value)} hint={t('common.optional')} />
                <TextField id='outbound-dn' label='No. DN' value={draft.documents.dn} onChange={(value) => updateDocument('dn', value)} hint={t('common.optional')} />
                <TextField id='outbound-invoice' label='No. Invoice' value={draft.documents.invoice} onChange={(value) => updateDocument('invoice', value)} hint={t('common.optional')} />
              </FormRow>
            </>
          )}
          <TextAreaField id='outbound-notes' label={t('outbound.notes')} value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: value }))} placeholder={t('outbound.notesPlaceholder')} hint={t('common.optional')} />
          <FormError message={error} />
        </div>
      </Drawer>

      {/* Edit Outbound Drawer */}
      <Drawer open={editTarget !== null} onClose={closeEdit} title={t('outbound.editTitle')} description={t('outbound.editDescription')} width='md'
        footer={
          <div className='flex justify-end gap-3'>
            <Button variant='secondary' onClick={closeEdit} disabled={editSaving}>{t('common.cancel')}</Button>
            <Button onClick={() => void submitEdit()} disabled={editSaving}>{editSaving ? t('common.saving') : t('common.save')}</Button>
          </div>
        }
      >
        {editTarget && (
          <div className='flex flex-col gap-7'>
            <div className='rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3'>
              <p className='font-semibold text-[var(--text)]'>{editTarget.partNumber}</p>
              <p className='mt-0.5 text-xs text-[var(--text-muted)]'>{parts.find(p => p.partNumber === editTarget.partNumber)?.description}</p>
              <p className='mt-1 text-xs text-[var(--text-subtle)]'>{formatDate(editTarget.requestDate)} — {editTarget.requester}</p>
              <div className='mt-3 border-t border-[var(--border)] pt-3'>
                <p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'>{t('outbound.documents')}</p>
                <DocumentReferenceList documents={editDraft.documents} emptyLabel={t('outbound.noDocuments')} />
              </div>
              <div className='mt-3 border-t border-[var(--border)] pt-3'>
                <p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'>{t('outbound.notes')}</p>
                <NotesPreview notes={editDraft.notes} emptyLabel={t('outbound.noNotes')} full />
              </div>
            </div>

            <div aria-live='polite' className='grid grid-cols-3 divide-x divide-[var(--border)] rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] text-center'>
              <div className='py-3 px-2'><p className='text-[9px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]'>{t('outbound.requestQty')}</p><p className='mt-1 text-lg font-semibold text-[var(--text)]'>{formatNumber(editDraft.qtyRequest)}</p></div>
              <div className='py-3 px-2'><p className='text-[9px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]'>{t('outbound.supplyQty')}</p><p className='mt-1 text-lg font-semibold text-[var(--text)]'>{formatNumber(editDraft.qtySupply)}</p></div>
              <div className='py-3 px-2'><p className='text-[9px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]'>O/S</p><p className={`mt-1 text-lg font-semibold ${editOutstanding > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>{formatNumber(editOutstanding)}</p></div>
            </div>

            <FormRow>
              <NumberField id='edit-request-qty' label={t('outbound.requestQty')} value={editDraft.qtyRequest} onChange={(value) => setEditDraft((current) => ({ ...current, qtyRequest: value }))} min={1} required />
              <NumberField id='edit-supply-qty' label={t('outbound.supplyQty')} value={editDraft.qtySupply} onChange={(value) => setEditDraft((current) => ({ ...current, qtySupply: value }))} min={0} max={editDraft.qtyRequest} required />
            </FormRow>

            <FormDivider label={t('outbound.documents')} />
            <FormRow>
              <TextField id='edit-pr' label='No. PR' value={editDraft.documents.pr} onChange={(value) => updateEditDocument('pr', value)} hint={t('common.optional')} />
              <TextField id='edit-po' label='No. PO' value={editDraft.documents.po} onChange={(value) => updateEditDocument('po', value)} hint={t('common.optional')} />
              <TextField id='edit-so' label='No. SO' value={editDraft.documents.so} onChange={(value) => updateEditDocument('so', value)} hint={t('common.optional')} />
              <TextField id='edit-dn' label='No. DN' value={editDraft.documents.dn} onChange={(value) => updateEditDocument('dn', value)} hint={t('common.optional')} />
              <TextField id='edit-invoice' label='No. Invoice' value={editDraft.documents.invoice} onChange={(value) => updateEditDocument('invoice', value)} hint={t('common.optional')} />
            </FormRow>
            <TextAreaField id='edit-notes' label={t('outbound.notes')} value={editDraft.notes} onChange={(value) => setEditDraft((current) => ({ ...current, notes: value }))} hint={t('common.optional')} />
            <FormError message={editError} />
          </div>
        )}
      </Drawer>
    </div>
  )
}
