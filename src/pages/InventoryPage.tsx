import { useMemo, useState } from 'react'
import { Pagination } from '../components/Pagination'
import { Download, FileDiff, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useToast } from '../components/toast'
import { Button, Drawer, FormDivider, FormError, FormRow, IconButton, Modal, NumberField, SectionHeader, SelectField, StatusBadge, TextField } from '../components/ui'
import { useLanguage } from '../i18n/useLanguage'
import { localizedError } from '../lib/localizedError'
import { calculateInventory, downloadCsv, todayIso } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import type { Part, WarehouseType } from '../types'

type StockFilter = 'ALL' | 'READY' | 'NOT_READY'

const defaultPartDraft = {
  partNumber: '',
  model: '',
  replacementPartNumber: '',
  description: '',
  location: '',
  warehouseType: 'Consignment' as WarehouseType,
  minStock: 1,
  maxStock: 1,
  openingStock: 0,
  openingStockDate: '',
  active: true,
}

type PartDraft = typeof defaultPartDraft

function toDraft(part: Part): PartDraft {
  return {
    partNumber: part.partNumber,
    model: part.model || '',
    replacementPartNumber: part.replacementPartNumber || '',
    description: part.description,
    location: part.location,
    warehouseType: part.warehouseType,
    minStock: part.minStock,
    maxStock: part.maxStock,
    openingStock: part.openingStock,
    openingStockDate: part.openingStockDate || '',
    active: part.active,
  }
}

export default function InventoryPage() {
  const { language, t, formatNumber } = useLanguage()
  const { parts, outbound, inbound, adjustments, createPart, updatePart, deactivatePart } = useAppStore()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'ADMIN'
  const inventory = useMemo(() => calculateInventory(parts, outbound, inbound, adjustments), [adjustments, inbound, outbound, parts])
  const { push } = useToast()
  const { addAdjustment } = useAppStore()
  const activeParts = useMemo(() => parts.filter((part) => part.active), [parts])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StockFilter>('ALL')
  const [modelFilter, setModelFilter] = useState('ALL')
  const modelValues = useMemo(
    () => Array.from(new Set(inventory.map((item) => item.model.trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [inventory],
  )
  const modelFilterOptions = useMemo(
    () => [{ value: 'ALL', label: t('common.allModels') }, ...modelValues.map((model) => ({ value: model, label: model }))],
    [modelValues, t],
  )
  const effectiveModelFilter = modelFilter === 'ALL' || modelValues.includes(modelFilter) ? modelFilter : 'ALL'
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return inventory.filter((item) => {
      const matchesSearch = `${item.partNumber} ${item.model} ${item.description} ${item.location}`.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
      const matchesModel = effectiveModelFilter === 'ALL' || item.model === effectiveModelFilter
      return matchesSearch && matchesStatus && matchesModel
    })
  }, [effectiveModelFilter, inventory, search, statusFilter])
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const safePage = Math.min(page, Math.max(1, totalPages))
  const pagedItems = useMemo(() => filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage), [filtered, itemsPerPage, safePage])

  // Part CRUD modal state
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Part | null>(null)
  const [draft, setDraft] = useState<PartDraft>(defaultPartDraft)
  const [partError, setPartError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Part | null>(null)
  const [adjOpen, setAdjOpen] = useState(false)
  const [adjDraft, setAdjDraft] = useState({ partNumber: '', physicalCount: 0, reason: '' })
  const [adjError, setAdjError] = useState('')
  const [adjSaving, setAdjSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const openAdd = () => { setDraft(defaultPartDraft); setEditTarget(null); setPartError(''); setModalMode('add') }
  const openEdit = (part: Part) => { setDraft(toDraft(part)); setEditTarget(part); setPartError(''); setModalMode('edit') }
  const closeModal = () => { setModalMode(null); setEditTarget(null) }

  const validateDraft = () => {
    if (!draft.partNumber.trim() || !draft.description.trim() || !draft.location.trim()) return t('inventory.validationRequired')
    if (draft.minStock < 0 || draft.maxStock < draft.minStock) return t('inventory.validationMinMax')
    if (draft.openingStock < 0) return t('inventory.validationStock')
    return ''
  }

  const submitPart = async () => {
    const validErr = validateDraft()
    if (validErr) { setPartError(validErr); return }
    setSaving(true)
    setPartError('')
    try {
      const payload = {
        partNumber: draft.partNumber.trim(),
        model: draft.model.trim(),
        replacementPartNumber: draft.replacementPartNumber.trim(),
        description: draft.description.trim(),
        location: draft.location.trim(),
        warehouseType: draft.warehouseType,
        minStock: draft.minStock,
        maxStock: draft.maxStock,
        openingStock: draft.openingStock,
        openingStockDate: draft.openingStockDate || undefined,
        active: true,
      }
      if (modalMode === 'add') {
        await createPart(payload)
        push({ tone: 'success', title: t('inventory.partCreated'), description: draft.partNumber })
      } else if (modalMode === 'edit' && editTarget) {
        await updatePart(editTarget.id, payload)
        push({ tone: 'success', title: t('inventory.partUpdated'), description: draft.partNumber })
      }
      closeModal()
    } catch (err) {
      setPartError(localizedError(err, language, t, 'inventory.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const openAdjustment = () => { const first = inventory[0]; setAdjDraft({ partNumber: first?.partNumber ?? '', physicalCount: first?.physicalStock ?? 0, reason: '' }); setAdjError(''); setAdjOpen(true) }
  const selectAdjustmentPart = (partNumber: string) => { const selected = inventory.find((item) => item.partNumber === partNumber); setAdjDraft((current) => ({ ...current, partNumber, physicalCount: selected?.physicalStock ?? 0 })) }
  const selectedAdjustmentPart = inventory.find((item) => item.partNumber === adjDraft.partNumber)

  const submitAdjustment = async () => {
    const part = activeParts.find(p => p.partNumber === adjDraft.partNumber)
    if (!part) { setAdjError(t('inbound.partNotFound')); return }
    if (adjDraft.physicalCount < 0) { setAdjError(t('inventory.validationStock')); return }
    if (!adjDraft.reason.trim()) { setAdjError(t('inventory.adjustmentReasonRequired')); return }
    setAdjSaving(true)
    setAdjError('')
    try {
      const currentInv = inventory.find(i => i.partNumber === part.partNumber)
      const previousBookStock = currentInv ? currentInv.physicalStock : 0
      await addAdjustment({ adjustmentDate: todayIso(), partNumber: part.partNumber, previousBookStock, physicalCount: adjDraft.physicalCount, reason: adjDraft.reason.trim(), createdBy: '' })
      push({ tone: 'success', title: t('inventory.adjustmentSaved'), description: part.partNumber })
      setAdjOpen(false)
    } catch(err) {
      setAdjError(localizedError(err, language, t, 'inventory.saveFailed'))
    } finally { setAdjSaving(false) }
  }

  const confirmDeletePart = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deactivatePart(confirmDelete.id)
      push({ tone: 'success', title: t('inventory.partDeleted'), description: confirmDelete.partNumber })
      setConfirmDelete(null)
    } catch (err) {
      push({ tone: 'error', title: localizedError(err, language, t, 'inventory.deleteFailed') })
    } finally {
      setDeleting(false)
    }
  }

  const labels = language === 'id'
    ? { part: 'Nomor Part', model: 'Model', description: 'Deskripsi', location: 'Lokasi', min: 'Minimum', max: 'Maksimum', status: 'Status', physicalSoh: 'SOH Fisik', availableSoh: 'SOH Tersedia', refill: 'Rekomendasi Isi Ulang' }
    : { part: 'Part Number', model: 'Model', description: 'Description', location: 'Location', min: 'Minimum', max: 'Maximum', status: 'Status', physicalSoh: 'Physical SOH', availableSoh: 'Available SOH', refill: 'Refill Recommendation' }

  const exportInventory = () => downloadCsv('soh-inventory.csv', filtered.map((item) => ({
    [labels.part]: item.partNumber,
    [labels.model]: item.model,
    [labels.description]: item.description,
    [labels.location]: item.location,
    [labels.physicalSoh]: item.physicalStock,
    [labels.availableSoh]: item.availableStock,
    [labels.min]: item.minStock,
    [labels.max]: item.maxStock,
    [labels.status]: item.status === 'READY' ? t('common.ready') : t('common.notReady'),
    [labels.refill]: item.refillRecommendation,
  })))

  const filters: Array<{ value: StockFilter; label: string }> = [
    { value: 'ALL', label: t('common.all') },
    { value: 'READY', label: t('common.ready') },
    { value: 'NOT_READY', label: t('common.notReady') },
  ]

  const warehouseOptions: Array<{ value: WarehouseType; label: string }> = [
    { value: 'Consignment', label: 'Consignment' },
    { value: 'Service Point', label: 'Service Point' },
    { value: 'Warehouse Store', label: 'Warehouse Store' },
  ]

  return (
    <div className='operational-view'>
      <SectionHeader
        title={t('inventory.title')}
        description={t('inventory.description')}
        action={
          <div className='flex gap-2'>
            {isAdmin && <Button onClick={openAdd}><Plus size={16} aria-hidden='true' />{t('inventory.addPart')}</Button>}
            {isAdmin && <Button variant='secondary' onClick={openAdjustment} disabled={!inventory.length}><FileDiff size={16} aria-hidden='true' />{t('inventory.adjustStock')}</Button>}
            <Button variant='secondary' onClick={exportInventory} disabled={!filtered.length}><Download size={16} aria-hidden='true' />{t('inventory.export')}</Button>
          </div>
        }
      />
      <section className='app-panel overflow-hidden' aria-labelledby='inventory-table-title'>
        <div className='grid gap-4 border-b border-[var(--border)] p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_240px_auto] xl:items-end'>
          <div className='relative w-full'>
            <label htmlFor='inventory-search' className='sr-only'>{t('inventory.searchLabel')}</label>
            <Search size={17} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' aria-hidden='true' />
            <input id='inventory-search' type='search' placeholder={t('inventory.searchPlaceholder')} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} className='min-h-11 w-full rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface-raised)] pl-10 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)] focus:border-[var(--brand-accent)] focus:ring-4 focus:ring-[var(--brand-accent)]/10' />
          </div>
          <SelectField id='inventory-model-filter' label={t('common.modelFilter')} value={effectiveModelFilter} onChange={(value) => { setModelFilter(value); setPage(1) }} options={modelFilterOptions} variant='surface' />
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
            <p id='inventory-table-title' className='whitespace-nowrap text-xs font-medium text-[var(--text-muted)]'>{t('inventory.resultCount', { count: formatNumber(filtered.length) })}</p>
            <div className='inline-flex border border-[var(--border-strong)] bg-[var(--surface-muted)] p-1' role='group' aria-label={t('inventory.filterLabel')}>{filters.map((filter) => <button key={filter.value} type='button' onClick={() => { setStatusFilter(filter.value); setPage(1) }} className={`min-h-8 px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${statusFilter === filter.value ? 'bg-[var(--brand-accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]'}`} aria-pressed={statusFilter === filter.value}>{filter.label}</button>)}</div>
          </div>
        </div>
                {/* Mobile card list ? hidden on md+ */}
        <ul className='divide-y divide-[var(--border)] md:hidden'>
          {pagedItems.map((item) => (
            <li key={item.id} className='p-4'>
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='truncate font-semibold text-[var(--text)]'>{item.partNumber}</p>
                  <p className='mt-0.5 truncate text-xs text-[var(--text-muted)]'>{item.description}</p>
                  <p className='mt-1 text-[11px] text-[var(--text-subtle)]'>{item.location} {item.model ? `? ${item.model}` : ''}</p>
                </div>
                {isAdmin && (
                  <div className='flex shrink-0 gap-1'>
                    <Button variant='secondary' size='sm' onClick={() => openEdit(item)} ariaLabel={`${t('common.edit')} ${item.partNumber}`}><Pencil size={14} aria-hidden='true' /></Button>
                    <Button variant='danger' size='sm' onClick={() => setConfirmDelete(item)} ariaLabel={`${t('common.delete')} ${item.partNumber}`}><Trash2 size={14} aria-hidden='true' /></Button>
                  </div>
                )}
              </div>
              <div className='mt-3 grid grid-cols-3 items-center divide-x divide-[var(--border)] rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] text-center'>
                <div className='py-2 px-1'>
                  <p className='text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]'>{t('inventory.actual')}</p>
                  <p className='mt-1 text-sm font-semibold text-[var(--text)]'>{formatNumber(item.physicalStock)}</p>
                </div>
                <div className='py-2 px-1'>
                  <p className='text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]'>{t('inventory.availableStock')}</p>
                  <p className='mt-1 text-sm font-semibold text-[var(--text)]'>{formatNumber(item.availableStock)}</p>
                </div>
                <div className='flex h-full flex-col items-center justify-center py-2 px-1'>
                  <StatusBadge status={item.status === 'READY' ? 'ready' : 'danger'}>{item.status === 'READY' ? t('common.ready') : t('common.notReady')}</StatusBadge>
                </div>
              </div>
              {item.refillRecommendation > 0 && <p className='mt-2 text-xs font-semibold text-[var(--brand-blue)]'>{t('inventory.refill')}: +{formatNumber(item.refillRecommendation)}</p>}
            </li>
          ))}
          {filtered.length === 0 && <li className='py-16 text-center text-sm text-[var(--text-muted)]'>{t('inventory.noMatch')}</li>}
        </ul>

        {/* Desktop table ? hidden on <md */}
        <div className='hidden overflow-x-auto md:block'><table className='data-table w-full table-fixed'><caption className='sr-only'>{t('inventory.tableCaption')}</caption><thead><tr><th scope='col' className='w-[280px]'>{t('inventory.partColumn')}</th><th scope='col' className='w-[140px]'>{t('inventory.modelColumn')}</th><th scope='col' className='w-[100px]'>{t('common.status')}</th><th scope='col' className='w-[100px] text-right'>{t('inventory.physicalStock')}</th><th scope='col' className='w-[100px] text-right'>{t('inventory.availableStock')}</th><th scope='col' className='w-[100px] text-right'>{t('inventory.minMax')}</th><th scope='col' className='w-[80px] text-right'>{t('inventory.refill')}</th>{isAdmin && <th scope='col' className='w-[80px] text-right'>{t('common.actions')}</th>}</tr></thead><tbody>{pagedItems.map((item) => <tr key={item.id}><td><p className='font-semibold text-[var(--text)]'>{item.partNumber}</p><p className='mt-1 max-w-[240px] truncate text-xs text-[var(--text-muted)]' title={item.description}>{item.description}</p><p className='mt-1 text-[11px] text-[var(--text-subtle)]'>{item.location}</p></td><td><p className='text-sm text-[var(--text)]'>{item.model || <span className='text-[var(--text-subtle)]'>?</span>}</p></td><td><StatusBadge status={item.status === 'READY' ? 'ready' : 'danger'}>{item.status === 'READY' ? t('common.ready') : t('common.notReady')}</StatusBadge></td><td className='text-right'><p className='font-semibold text-[var(--text)]'>{formatNumber(item.physicalStock)}</p><p className='mt-1 text-[10px] text-[var(--text-subtle)]'>{t('inventory.actual')}</p></td><td className='text-right'><p className='font-semibold text-[var(--text)]'>{formatNumber(item.availableStock)}</p><p className='mt-1 text-[10px] text-[var(--text-subtle)]'>{t('inventory.afterRequest')}</p></td><td className='text-right text-[var(--text-muted)]'>{formatNumber(item.minStock)} / {formatNumber(item.maxStock)}</td><td className='text-right'>{item.refillRecommendation > 0 ? <span className='font-semibold text-[var(--brand-blue)]'>+{formatNumber(item.refillRecommendation)}</span> : <span className='text-[var(--text-subtle)]'>?</span>}</td>{isAdmin && <td><div className='flex justify-end gap-1'><IconButton variant='secondary' label={`${t('common.edit')} ${item.partNumber}`} onClick={() => openEdit(item)}><Pencil size={14} aria-hidden='true' /></IconButton><IconButton variant='danger' label={`${t('common.delete')} ${item.partNumber}`} onClick={() => setConfirmDelete(item)}><Trash2 size={14} aria-hidden='true' /></IconButton></div></td>}</tr>)}{filtered.length === 0 && <tr><td colSpan={isAdmin ? 8 : 7} className='py-16 text-center text-sm text-[var(--text-muted)]'>{t('inventory.noMatch')}</td></tr>}</tbody></table></div>
        <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={(value) => { setItemsPerPage(value); setPage(1) }} />
      </section>

      {/* Adjustment Modal */}
      <Modal open={adjOpen} onClose={() => setAdjOpen(false)} title={t('inventory.adjustStock')} description={t('inventory.adjustStockDescription')} size='md'>
        <div className='space-y-4'>
          <SelectField id='adj-part' label={t('common.partNumber')} value={adjDraft.partNumber} onChange={selectAdjustmentPart} options={activeParts.map(p => ({ value: p.partNumber, label: `${p.partNumber} | ${p.description.slice(0, 34)}` }))} required />
          {selectedAdjustmentPart && <div className='grid grid-cols-2 gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] p-4'><div><p className='text-xs text-[var(--text-muted)]'>{t('inventory.recordedStock')}</p><p className='mt-1 text-xl font-semibold text-[var(--text)]'>{formatNumber(selectedAdjustmentPart.physicalStock)}</p></div><div><p className='text-xs text-[var(--text-muted)]'>{t('inventory.variance')}</p><p className={`mt-1 text-xl font-semibold ${adjDraft.physicalCount - selectedAdjustmentPart.physicalStock === 0 ? 'text-[var(--text-muted)]' : 'text-[var(--brand-blue)]'}`}>{adjDraft.physicalCount - selectedAdjustmentPart.physicalStock > 0 ? '+' : ''}{formatNumber(adjDraft.physicalCount - selectedAdjustmentPart.physicalStock)}</p></div></div>}
          <NumberField id='adj-qty' label={t('inventory.actualCount')} value={adjDraft.physicalCount} onChange={(value) => setAdjDraft((current) => ({ ...current, physicalCount: value }))} min={0} required />
          <TextField id='adj-reason' label={t('inventory.adjustmentReason')} value={adjDraft.reason} onChange={(value) => setAdjDraft((current) => ({ ...current, reason: value }))} required />
          {adjError && <p role='alert' className='border-l-4 border-[#a33945] bg-[#f8e9eb] px-4 py-3 text-sm leading-6 text-[#7f2834]'>{adjError}</p>}
          <div className='flex justify-end gap-2 border-t border-[var(--border)] pt-4'><Button variant='secondary' onClick={() => setAdjOpen(false)} disabled={adjSaving}>{t('common.cancel')}</Button><Button onClick={() => void submitAdjustment()} disabled={adjSaving}>{adjSaving ? t('common.saving') : t('common.save')}</Button></div>
        </div>
      </Modal>

      {/* Add / Edit Part Drawer */}
      <Drawer
        open={modalMode !== null}
        onClose={closeModal}
        title={modalMode === 'add' ? t('inventory.addPartTitle') : t('inventory.editPartTitle')}
        description={modalMode === 'add' ? t('inventory.addPartDescription') : t('inventory.editPartDescription')}
        width='md'
        footer={
          <div className='flex justify-end gap-3'>
            <Button variant='secondary' onClick={closeModal} disabled={saving}>{t('common.cancel')}</Button>
            <Button onClick={() => void submitPart()} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
          </div>
        }
      >
        <div className='flex flex-col gap-7'>
          {modalMode === 'edit' && editTarget && (
            <div className='rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3'>
              <p className='text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'>{t('common.partNumber')}</p>
              <p className='mt-1 font-semibold text-[var(--text)]'>{editTarget.partNumber}</p>
              <p className='mt-1 text-xs text-[var(--text-muted)]'>{editTarget.description}</p>
            </div>
          )}

          <FormRow>
            <TextField id='part-number' label={t('common.partNumber')} value={draft.partNumber} onChange={(value) => setDraft((current) => ({ ...current, partNumber: value }))} required disabled={modalMode === 'edit'} />
            <TextField id='part-model' label={t('inventory.model')} value={draft.model} onChange={(value) => setDraft((current) => ({ ...current, model: value }))} hint={t('common.optional')} />
            <TextField id='part-description' label={t('common.description')} value={draft.description} onChange={(value) => setDraft((current) => ({ ...current, description: value }))} required />
            <TextField id='part-location' label={t('common.location')} value={draft.location} onChange={(value) => setDraft((current) => ({ ...current, location: value }))} required />
            <TextField id='part-replacement' label={t('inventory.replacementPart')} value={draft.replacementPartNumber} onChange={(value) => setDraft((current) => ({ ...current, replacementPartNumber: value }))} hint={t('common.optional')} />
            <SelectField id='part-warehouse' label={t('inventory.warehouseType')} value={draft.warehouseType} onChange={(value) => setDraft((current) => ({ ...current, warehouseType: value as WarehouseType }))} options={warehouseOptions} />
          </FormRow>

          <FormDivider label={t('inventory.stockSettings')} />
          <FormRow cols={3}>
            <NumberField id='part-opening-stock' label={t('inventory.openingStock')} value={draft.openingStock} onChange={(value) => setDraft((current) => ({ ...current, openingStock: value }))} min={0} required />
            <NumberField id='part-min' label={t('inventory.minStock')} value={draft.minStock} onChange={(value) => setDraft((current) => ({ ...current, minStock: value, maxStock: Math.max(current.maxStock, value) }))} min={0} required />
            <NumberField id='part-max' label={t('inventory.maxStock')} value={draft.maxStock} onChange={(value) => setDraft((current) => ({ ...current, maxStock: value }))} min={draft.minStock} required />
          </FormRow>
          <div className='max-w-xs'>
            <TextField id='part-opening-date' label={t('inventory.openingDate')} type='date' value={draft.openingStockDate} onChange={(value) => setDraft((current) => ({ ...current, openingStockDate: value }))} hint={t('common.optional')} />
          </div>
          <FormError message={partError} />
        </div>
      </Drawer>
      {/* Delete Confirm Modal */}
      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title={t('inventory.deleteConfirmTitle')} description={t('inventory.deleteConfirmDescription')} size='sm'>
        <div className='space-y-4'>
          {confirmDelete && <div className='rounded-[6px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3'><p className='font-semibold text-[var(--text)]'>{confirmDelete.partNumber}</p><p className='mt-1 text-sm text-[var(--text-muted)]'>{confirmDelete.description}</p></div>}
          <div className='flex justify-end gap-2'><Button variant='secondary' onClick={() => setConfirmDelete(null)} disabled={deleting}>{t('common.cancel')}</Button><Button variant='danger' onClick={() => void confirmDeletePart()} disabled={deleting}>{deleting ? t('common.saving') : t('inventory.confirmDelete')}</Button></div>
        </div>
      </Modal>
    </div>
  )
}
