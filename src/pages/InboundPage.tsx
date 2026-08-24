import { useEffect, useMemo, useState } from 'react'
import { Pagination } from '../components/Pagination'
import { ArrowDownToLine, CheckCircle2, MessageSquareText, Pencil, Plus, Search } from 'lucide-react'
import { useToast } from '../components/toast'
import { Button, Drawer, FormDivider, FormError, FormRow, Modal, NumberField, SectionHeader, SelectField, StatusBadge, TextAreaField, TextField } from '../components/ui'
import { useLanguage } from '../i18n/useLanguage'
import { localizedError } from '../lib/localizedError'
import { defaultInboundDraft, useAppStore } from '../store/appStore'
import type { GrStatus, InboundTransaction } from '../types'


function InboundReferenceList({ matdocNumber, spbNumber, poNumber, invoiceOrTo, source, emptyLabel }: { matdocNumber: string; spbNumber: string; poNumber: string; invoiceOrTo: string; source: string; emptyLabel: string }) {
  const docs = [
    { label: 'Matdoc', value: matdocNumber },
    { label: 'SPB', value: spbNumber },
    { label: 'PO', value: poNumber },
    { label: 'Invoice / TO', value: invoiceOrTo },
    { label: 'Sumber', value: source },
  ].filter((d) => d.value?.trim())

  if (!docs.length) return <span className='text-xs text-[var(--text-subtle)]'>{emptyLabel}</span>
  
  return (
    <div className='flex flex-wrap gap-1.5'>
      {docs.map(({ label, value }) => (
        <span key={label} title={label + ': ' + value} className='inline-flex min-w-0 items-center gap-1.5 rounded-[5px] border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-[11px] leading-4'>
          <span className='shrink-0 font-bold text-[var(--brand-blue)]'>{label}</span>
          <span className='break-all font-medium tabular-nums text-[var(--text)]'>{value}</span>
        </span>
      ))}
    </div>
  )
}

function NotesPreview({ notes, emptyLabel, full = false }: { notes: string; emptyLabel: string; full?: boolean }) {
  const value = notes?.trim()
  if (!value) return <span className='text-xs text-[var(--text-subtle)]'>{emptyLabel}</span>
  return (
    <div className='flex min-w-0 items-start gap-2 text-[var(--text-muted)]'>
      <MessageSquareText size={14} className='mt-0.5 shrink-0 text-[var(--brand-orange)]' aria-hidden='true' />
      <p title={value} className={full ? 'whitespace-pre-wrap break-words text-xs leading-5 text-[var(--text-muted)]' : 'max-w-[240px] truncate text-xs leading-5 text-[var(--text-muted)]'}>{value}</p>
    </div>
  )
}

export default function InboundPage() {
  const { language, t, formatDate, formatNumber } = useLanguage()
  const { parts, inbound, addInbound, updateInbound } = useAppStore()
  const activeParts = useMemo(() => parts.filter((part) => part.active), [parts])
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [modelFilter, setModelFilter] = useState('ALL')
  const [draft, setDraft] = useState(defaultInboundDraft)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [grEdit, setGrEdit] = useState<InboundTransaction | null>(null)
  const [grDraft, setGrDraft] = useState<{ grStatus: GrStatus; qtyActual: number; qtyMatdoc: number; matdocNumber: string }>({ grStatus: 'Pending', qtyActual: 0, qtyMatdoc: 1, matdocNumber: '' })
  const [grError, setGrError] = useState('')
  const [grSaving, setGrSaving] = useState(false)

  const partByNumber = useMemo(() => new Map(parts.map((part) => [part.partNumber, part])), [parts])
  const modelValues = useMemo(() => Array.from(new Set(activeParts.map((part) => part.model.trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right)), [activeParts])
  const modelFilterOptions = [{ value: 'ALL', label: t('common.allModels') }, ...modelValues.map((model) => ({ value: model, label: model }))]
  const effectiveModelFilter = modelFilter === 'ALL' || modelValues.includes(modelFilter) ? modelFilter : 'ALL'
  const currentPart = partByNumber.get(draft.partNumber)
  const [page, setPage] = useState(1)
  const itemsPerPage = 20
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return inbound.filter((item) => {
      const part = partByNumber.get(item.partNumber)
      const matchesSearch = `${item.partNumber} ${part?.model ?? ''} ${part?.description ?? ''} ${item.matdocNumber} ${item.spbNumber} ${item.poNumber} ${item.invoiceOrTo} ${item.source} ${item.notes}`.toLowerCase().includes(query)
      const matchesModel = effectiveModelFilter === 'ALL' || part?.model === effectiveModelFilter
      return matchesSearch && matchesModel
    })
  }, [effectiveModelFilter, inbound, partByNumber, search])
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const pagedItems = useMemo(() => filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage), [filtered, page])
  const totalDocument = inbound.reduce((total, item) => total + item.qtyMatdoc, 0)
  const totalActual = inbound.reduce((total, item) => total + item.qtyActual, 0)
  const pendingGr = inbound.filter((item) => item.grStatus !== 'Done GR').length
  const isId = language === 'id'

  useEffect(() => setPage(1), [effectiveModelFilter, search])
  useEffect(() => {
    if (page > Math.max(1, totalPages)) setPage(Math.max(1, totalPages))
  }, [page, totalPages])

  const renderDifference = (qtyMatdoc: number, qtyActual: number) => {
    const difference = qtyActual - qtyMatdoc
    const differenceLabel = difference === 0
      ? t('inbound.differenceMatched')
      : difference < 0
        ? t('inbound.differenceShortage', { count: formatNumber(Math.abs(difference)) })
        : t('inbound.differenceExcess', { count: formatNumber(difference) })
    return (
      <span title={differenceLabel} aria-label={differenceLabel}>
        <StatusBadge status={difference === 0 ? 'ready' : difference < 0 ? 'danger' : 'warning'}>
          {difference > 0 ? '+' : ''}{formatNumber(difference)}
        </StatusBadge>
      </span>
    )
  }

  const closeModal = () => { setOpen(false); setError('') }
  const openModal = () => { setDraft({ ...defaultInboundDraft, partNumber: activeParts[0]?.partNumber ?? '' }); setError(''); setOpen(true) }

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

  const openGrEdit = (item: InboundTransaction) => {
    setGrDraft({ grStatus: item.grStatus, qtyActual: item.qtyActual, qtyMatdoc: item.qtyMatdoc, matdocNumber: item.matdocNumber })
    setGrError('')
    setGrEdit(item)
  }

  const submitGrEdit = async () => {
    if (!grEdit) return
    if (grDraft.qtyMatdoc < 1 || grDraft.qtyActual < 0) { setGrError(t('inbound.validation')); return }
    setGrSaving(true)
    setGrError('')
    try {
      await updateInbound(grEdit.id, { grStatus: grDraft.grStatus, qtyActual: grDraft.qtyActual, qtyMatdoc: grDraft.qtyMatdoc, matdocNumber: grDraft.matdocNumber })
      push({ tone: 'success', title: t('inbound.grUpdated'), description: `${grEdit.partNumber} ? ${grDraft.grStatus === 'Done GR' ? t('common.doneGr') : t('common.pending')}` })
      setGrEdit(null)
    } catch (grErr) {
      setGrError(localizedError(grErr, language, t, 'inbound.saveFailed'))
    } finally { setGrSaving(false) }
  }

  const metrics = [
    { label: t('inbound.totalTransactions'), value: inbound.length },
    { label: t('inbound.totalDocumentQty'), value: totalDocument },
    { label: t('inbound.totalActualQty'), value: totalActual },
    { label: t('inbound.pendingGr'), value: pendingGr, emphasis: pendingGr > 0 },
  ]

  return (
    <div className='operational-view'>
      <SectionHeader title={t('inbound.title')} description={t('inbound.description')} action={<Button onClick={openModal} disabled={!activeParts.length}><Plus size={17} aria-hidden='true' />{t('inbound.new')}</Button>} />
      <section className='app-panel mb-6 grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4' aria-label={t('inbound.title')}>
        {metrics.map((metric, index) => <div key={metric.label} className={`min-h-[104px] p-5 ${index < metrics.length - 1 ? 'border-b border-[var(--border)] sm:border-r xl:border-b-0' : ''}`}><p className='text-xs font-medium text-[var(--text-muted)]'>{metric.label}</p><p className={`mt-3 text-2xl font-semibold ${metric.emphasis ? 'text-[var(--warning)]' : 'text-[var(--text)]'}`}>{formatNumber(metric.value)}</p></div>)}
      </section>

      <section className='app-panel overflow-hidden'>
        <div className='grid gap-4 border-b border-[var(--border)] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end'>
          <div className='relative'>
            <label htmlFor='inbound-search' className='sr-only'>{t('inbound.searchLabel')}</label>
            <Search size={17} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' aria-hidden='true' />
            <input id='inbound-search' type='search' placeholder={t('inbound.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} className='min-h-11 w-full rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface-raised)] pl-10 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)] focus:border-[var(--brand-orange)] focus:ring-4 focus:ring-[var(--brand-orange)]/10' />
          </div>
          <SelectField id='inbound-model-filter' label={t('common.modelFilter')} value={effectiveModelFilter} onChange={setModelFilter} options={modelFilterOptions} variant='surface' />
        </div>

        {/* Mobile cards */}
        <ul className='divide-y divide-[var(--border)] md:hidden'>
          {pagedItems.map((item) => (
            <li key={item.id} className='p-4'>
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <p className='truncate font-semibold text-[var(--text)]'>{item.partNumber}</p>
                  <p className='mt-0.5 text-xs text-[var(--text-muted)]'>{formatDate(item.receivedDate)}</p>
                </div>
                {item.grStatus === 'Done GR' ? <StatusBadge status='ready'><CheckCircle2 size={12} className='mr-1' />{t('common.doneGr')}</StatusBadge> : <Button variant='secondary' size='sm' onClick={() => openGrEdit(item)}>{isId ? 'Konfirmasi GR' : 'Confirm GR'}</Button>}
              </div>
              <div className='mt-3 grid grid-cols-3 divide-x divide-[var(--border)] rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] text-center'>
                <div className='px-1 py-2'><p className='text-[9px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]'>{t('inbound.documentQty')}</p><p className='mt-1 font-semibold text-[var(--text)]'>{formatNumber(item.qtyMatdoc)}</p></div>
                <div className='px-1 py-2'><p className='text-[9px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]'>{t('inbound.actualQty')}</p><p className='mt-1 font-semibold text-[var(--text)]'>{formatNumber(item.qtyActual)}</p></div>
                <div className='flex flex-col items-center px-1 py-2'><p className='text-[9px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]'>{t('inbound.differenceLabel')}</p><div className='mt-1'>{renderDifference(item.qtyMatdoc, item.qtyActual)}</div></div>
              </div>
              <div className='mt-3 border-t border-[var(--border)] pt-3'>
                <p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'>{t('inbound.references')}</p>
                <InboundReferenceList matdocNumber={item.matdocNumber} poNumber={item.poNumber} spbNumber={item.spbNumber} invoiceOrTo={item.invoiceOrTo} source={item.source} emptyLabel={t('inbound.noReferences')} />
              </div>
              <div className='mt-3 border-t border-[var(--border)] pt-3'>
                <p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'>{t('inbound.notes')}</p>
                <NotesPreview notes={item.notes} emptyLabel={t('inbound.noNotes')} full />
              </div>
            </li>
          ))}
          {filtered.length === 0 && <li className='py-16 text-center text-sm text-[var(--text-muted)]'>{t('inbound.noData')}</li>}
        </ul>

        {/* Desktop table */}
        <div className='hidden overflow-x-auto md:block'>
          <table className='data-table min-w-[1380px]'>
            <caption className='sr-only'>{t('inbound.tableCaption')}</caption>
            <thead>
              <tr>
                <th scope='col'>{t('inbound.receivedDate')}</th>
                <th scope='col'>{t('common.partNumber')}</th>
                <th scope='col' className='text-right'>{t('inbound.documentQty')}</th>
                <th scope='col' className='text-right'>{t('inbound.actualQty')}</th>
                <th scope='col' className='text-right'>{t('inbound.differenceLabel')}</th>
                <th scope='col'>{t('inbound.references')}</th>
                <th scope='col'>{t('inbound.notes')}</th>
                <th scope='col'>{t('inbound.grStatus')}</th>
                <th scope='col' className='text-right'>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((item) => {
                const part = partByNumber.get(item.partNumber)
                return (
                  <tr key={item.id}>
                    <td className='whitespace-nowrap'><p className='font-semibold text-[var(--text)]'>{formatDate(item.receivedDate)}</p></td>
                    <td>
                      <p className='font-semibold text-[var(--text)]'>{item.partNumber}</p>
                      <p className='mt-1 max-w-[260px] truncate text-xs text-[var(--text-muted)]'>{part?.description ?? t('common.notAvailable')}</p>
                      {part?.model && <p className='mt-1 text-[11px] font-medium text-[var(--brand-blue)]'>{t('inventory.model')}: {part.model}</p>}
                    </td>
                    <td className='text-right font-semibold text-[var(--text)]'>{formatNumber(item.qtyMatdoc)}</td>
                    <td className='text-right font-semibold text-[var(--text)]'>{formatNumber(item.qtyActual)}</td>
                    <td className='text-right'>{renderDifference(item.qtyMatdoc, item.qtyActual)}</td>
                    <td className='min-w-[280px]'><InboundReferenceList matdocNumber={item.matdocNumber} poNumber={item.poNumber} spbNumber={item.spbNumber} invoiceOrTo={item.invoiceOrTo} source={item.source} emptyLabel={t('inbound.noReferences')} /></td>
                    <td><NotesPreview notes={item.notes} emptyLabel={t('inbound.noNotes')} /></td>
                    <td>{item.grStatus === 'Done GR' ? <StatusBadge status='ready'><CheckCircle2 size={12} className='mr-1.5' />{t('common.doneGr')}</StatusBadge> : <StatusBadge status='warning'>{t('common.pending')}</StatusBadge>}</td>
                    <td className='text-right'><Button variant='secondary' size='sm' onClick={() => openGrEdit(item)} ariaLabel={`${t('common.edit')} GR ${item.partNumber}`}><Pencil size={13} aria-hidden='true' />{t('common.edit')}</Button></td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={9} className='py-16 text-center text-sm text-[var(--text-muted)]'>{t('inbound.noData')}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </section>

      {/* New Inbound Drawer */}
      <Drawer open={open} onClose={closeModal} title={t('inbound.modalTitle')} description={t('inbound.modalDescription')} width='md'
        footer={
          <div className='flex justify-end gap-3'>
            <Button variant='secondary' onClick={closeModal} disabled={saving}>{t('common.cancel')}</Button>
            <Button onClick={() => void submit()} disabled={saving}>{saving ? t('common.saving') : t('inbound.save')}</Button>
          </div>
        }
      >
        <div className='flex flex-col gap-7'>
          <FormRow>
            <TextField id='inbound-date' label={t('inbound.receivedDate')} type='date' value={draft.receivedDate} onChange={(value) => setDraft((current) => ({ ...current, receivedDate: value }))} required />
            <SelectField id='inbound-part' label={t('common.partNumber')} value={draft.partNumber} onChange={(value) => setDraft((current) => ({ ...current, partNumber: value }))} options={activeParts.map((part) => ({ value: part.partNumber, label: `${part.partNumber} | ${part.description.slice(0, 30)}` }))} required />
          </FormRow>
          {currentPart && (
            <div className='flex items-start gap-3 rounded-[8px] border-l-4 border-[var(--brand-blue)] bg-[var(--surface-muted)] px-4 py-3'>
              <ArrowDownToLine size={16} className='mt-0.5 shrink-0 text-[var(--brand-blue)]' aria-hidden='true' />
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]'>{t('inbound.selectedPart')}</p>
                <p className='mt-1 text-sm font-semibold text-[var(--text)]'>{currentPart.partNumber}</p>
                <p className='mt-0.5 text-xs text-[var(--text-muted)]'>{currentPart.description}</p>
              </div>
            </div>
          )}
          <FormRow cols={3}>
            <SelectField id='inbound-status' label={t('inbound.grStatus')} value={draft.grStatus} onChange={(value) => setDraft((current) => ({ ...current, grStatus: value as GrStatus }))} options={[{ value: 'Pending', label: t('common.pending') }, { value: 'Done GR', label: t('common.doneGr') }]} required />
            <NumberField id='inbound-matdoc-qty' label={t('inbound.documentQty')} value={draft.qtyMatdoc} onChange={(value) => setDraft((current) => ({ ...current, qtyMatdoc: value }))} min={1} required />
            <NumberField id='inbound-actual-qty' label={t('inbound.actualQty')} value={draft.qtyActual} onChange={(value) => setDraft((current) => ({ ...current, qtyActual: value }))} min={0} required />
          </FormRow>
          {draft.qtyMatdoc !== draft.qtyActual && <p className='rounded-[8px] border border-[var(--warning)] bg-[#fbf2df] px-4 py-3 text-sm leading-6 text-[#80500c]'>{t('inbound.differenceNotice', { count: formatNumber(Math.abs(draft.qtyMatdoc - draft.qtyActual)) })}</p>}
          <FormDivider label={t('inbound.references')} />
          <FormRow>
            <TextField id='inbound-matdoc' label={t('inbound.materialDocument')} value={draft.matdocNumber} onChange={(value) => setDraft((current) => ({ ...current, matdocNumber: value }))} hint={t('common.optional')} />
            <TextField id='inbound-spb' label='No. SPB' value={draft.spbNumber} onChange={(value) => setDraft((current) => ({ ...current, spbNumber: value }))} hint={t('common.optional')} />
            <TextField id='inbound-po' label='No. PO' value={draft.poNumber} onChange={(value) => setDraft((current) => ({ ...current, poNumber: value }))} hint={t('common.optional')} />
            <TextField id='inbound-invoice' label='Invoice / TO' value={draft.invoiceOrTo} onChange={(value) => setDraft((current) => ({ ...current, invoiceOrTo: value }))} hint={t('common.optional')} />
            <TextField id='inbound-source' label={t('inbound.source')} value={draft.source} onChange={(value) => setDraft((current) => ({ ...current, source: value }))} hint={t('common.optional')} />
          </FormRow>
          <TextAreaField id='inbound-notes' label={t('inbound.notes')} value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: value }))} hint={t('common.optional')} />
          <FormError message={error} />
        </div>
      </Drawer>

      {/* Edit GR Status Modal (Kept as Modal since it's just a quick confirm/status update) */}
      <Modal open={grEdit !== null} onClose={() => setGrEdit(null)} title={t('inbound.editGrTitle')} description={t('inbound.editGrDescription')} size='md'>
        {grEdit && (
          <div className='space-y-6'>
            <div className='rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3'>
              <p className='font-semibold text-[var(--text)]'>{grEdit.partNumber}</p>
              <p className='mt-1 text-xs text-[var(--text-muted)]'>{parts.find((p) => p.partNumber === grEdit.partNumber)?.description}</p>
              <p className='mt-1 text-xs text-[var(--text-subtle)]'>{formatDate(grEdit.receivedDate)}</p>
            </div>
            <FormRow>
              <SelectField id='gr-status' label={t('inbound.grStatus')} value={grDraft.grStatus} onChange={(value) => setGrDraft((current) => ({ ...current, grStatus: value as GrStatus }))} options={[{ value: 'Pending', label: t('common.pending') }, { value: 'Done GR', label: t('common.doneGr') }]} required />
              <TextField id='gr-matdoc' label={t('inbound.materialDocument')} value={grDraft.matdocNumber} onChange={(value) => setGrDraft((current) => ({ ...current, matdocNumber: value }))} hint={t('common.optional')} />
              <NumberField id='gr-matdoc-qty' label={t('inbound.documentQty')} value={grDraft.qtyMatdoc} onChange={(value) => setGrDraft((current) => ({ ...current, qtyMatdoc: value }))} min={1} required />
              <NumberField id='gr-actual-qty' label={t('inbound.actualQty')} value={grDraft.qtyActual} onChange={(value) => setGrDraft((current) => ({ ...current, qtyActual: value }))} min={0} required />
            </FormRow>
            {grDraft.qtyMatdoc !== grDraft.qtyActual && <p className='rounded-[8px] border border-[var(--warning)] bg-[#fbf2df] px-4 py-3 text-sm leading-6 text-[#80500c]'>{t('inbound.differenceNotice', { count: formatNumber(Math.abs(grDraft.qtyMatdoc - grDraft.qtyActual)) })}</p>}
            <FormError message={grError} />
            <div className='flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end'><Button variant='secondary' onClick={() => setGrEdit(null)} disabled={grSaving}>{t('common.cancel')}</Button><Button onClick={() => void submitGrEdit()} disabled={grSaving}>{grSaving ? t('common.saving') : t('inbound.saveGr')}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
