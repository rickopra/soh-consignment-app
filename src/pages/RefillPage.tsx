import { useState, useEffect } from 'react'
import { Download, FileBarChart2, Package, TrendingDown, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button, SectionHeader, StatusBadge, Modal, NumberField, SelectField, TextField } from '../components/ui'
import { useLanguage } from '../i18n/useLanguage'
import { calculateInventory, downloadCsv, todayIso } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import { useToast } from '../components/toast'

type RefillView = 'refill' | 'voucher'

type VoucherRow = {
  partNumber: string
  stock: number
  remarks: string
}

type VoucherEditor = {
  mode: 'add' | 'edit'
  originalPartNumber?: string
  partNumber: string
  stock: number
  remarks: string
}

const VOUCHER_STORAGE_KEY = 'soh-parts-voucher-draft-v1'

export default function RefillPage() {
  const { language, t, formatNumber } = useLanguage()
  const { parts, outbound, inbound, adjustments } = useAppStore()
  const { push } = useToast()

  const inventory = calculateInventory(parts, outbound, inbound, adjustments)
  const needsRefill = inventory.filter((item) => item.refillRecommendation > 0).sort((a, b) => b.refillRecommendation - a.refillRecommendation)
  const totalRefill = needsRefill.reduce((total, item) => total + item.refillRecommendation, 0)

  const [view, setView] = useState<RefillView>('refill')
  const [voucherRows, setVoucherRows] = useState<VoucherRow[]>(() => {
    try {
      const stored = localStorage.getItem(VOUCHER_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [voucherEditor, setVoucherEditor] = useState<VoucherEditor | null>(null)
  const [voucherError, setVoucherError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const isId = language === 'id'

  useEffect(() => {
    localStorage.setItem(VOUCHER_STORAGE_KEY, JSON.stringify(voucherRows))
  }, [voucherRows])

  const exportRefill = () => downloadCsv('Item_Refill_TO_' + todayIso() + '.csv', needsRefill.map((item) => ({
    [isId ? 'Nomor Part' : 'Part Number']: item.partNumber,
    [t('common.description')]: item.description,
    [isId ? 'SOH Tersedia' : 'Available SOH']: item.availableStock,
    [isId ? 'QTY TO (Jumlah Refill)' : 'QTY TO (Refill Qty)']: item.refillRecommendation,
    [isId ? 'Stok Maks' : 'Max Stock']: item.maxStock,
    [t('common.location')]: item.location,
    [isId ? 'Keterangan' : 'Remarks']: '',
  })))

  const exportVoucher = () => {
    if (voucherRows.length === 0) {
      push({ tone: 'error', title: t('refill.voucherEmpty') })
      return
    }
    const data = voucherRows.map(row => {
      const invItem = inventory.find(i => i.partNumber === row.partNumber)
      return {
        [isId ? 'Nomor Part' : 'Part Number']: row.partNumber,
        [t('common.description')]: invItem?.description || '',
        [t('common.location')]: invItem?.location || '',
        [isId ? 'SOH Fisik' : 'Physical SOH']: row.stock,
        [isId ? 'Keterangan' : 'Remarks']: row.remarks,
      }
    })
    downloadCsv('Parts_Voucher_' + todayIso() + '.csv', data)
  }

  const loadAllVoucherParts = () => {
    const existingIds = new Set(voucherRows.map(r => r.partNumber))
    const toAdd = inventory
      .filter(item => !existingIds.has(item.partNumber))
      .map(item => ({
        partNumber: item.partNumber,
        stock: item.physicalStock,
        remarks: ''
      }))
    if (toAdd.length === 0) {
      push({ tone: 'info', title: t('refill.voucherLoaded') })
      return
    }
    setVoucherRows(current => [...current, ...toAdd])
    push({ tone: 'success', title: t('refill.voucherLoaded') })
  }

  const openAddVoucherRow = () => {
    const defaultPart = inventory[0]
    if (!defaultPart) return
    setVoucherEditor({
      mode: 'add',
      partNumber: defaultPart.partNumber,
      stock: defaultPart.physicalStock,
      remarks: ''
    })
    setVoucherError('')
  }

  const openEditVoucherRow = (row: VoucherRow) => {
    setVoucherEditor({
      mode: 'edit',
      originalPartNumber: row.partNumber,
      partNumber: row.partNumber,
      stock: row.stock,
      remarks: row.remarks
    })
    setVoucherError('')
  }

  const handleVoucherPartSelect = (partNumber: string) => {
    const invItem = inventory.find(i => i.partNumber === partNumber)
    if (!invItem) return
    setVoucherEditor(prev => prev ? { ...prev, partNumber, stock: invItem.physicalStock } : null)
  }

  const saveVoucherRow = (e: React.FormEvent) => {
    e.preventDefault()
    if (!voucherEditor) return
    if (!voucherEditor.partNumber) {
      setVoucherError(t('refill.voucherValidation'))
      return
    }

    const isDuplicate = voucherRows.some(
      r => r.partNumber === voucherEditor.partNumber &&
      (voucherEditor.mode === 'add' || voucherEditor.partNumber !== voucherEditor.originalPartNumber)
    )

    if (isDuplicate) {
      setVoucherError(t('refill.voucherDuplicate'))
      return
    }

    if (voucherEditor.mode === 'add') {
      setVoucherRows([...voucherRows, {
        partNumber: voucherEditor.partNumber,
        stock: voucherEditor.stock,
        remarks: voucherEditor.remarks
      }])
    } else {
      setVoucherRows(voucherRows.map(r =>
        r.partNumber === voucherEditor.originalPartNumber ? {
          partNumber: voucherEditor.partNumber,
          stock: voucherEditor.stock,
          remarks: voucherEditor.remarks
        } : r
      ))
    }

    setVoucherEditor(null)
    push({ tone: 'success', title: t('refill.voucherSaved') })
  }

  const removeVoucherRow = (partNumber: string) => {
    setVoucherRows(voucherRows.filter(r => r.partNumber !== partNumber))
    push({ tone: 'info', title: t('refill.voucherRemoved') })
  }

  return (
    <div className="operational-view">
      <SectionHeader title={t('refill.title')} description={t('refill.description')} />

      <section className="app-panel mb-6 overflow-hidden" aria-label={t('refill.howtoLabel')}>
        <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4">
          <p className="text-sm font-semibold text-[var(--text)]">{t('refill.howtoTitle')}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('refill.howtoSubtitle')}</p>
        </div>
        <div className="grid divide-y divide-[var(--border)] sm:divide-x sm:divide-y-0 md:grid-cols-2">
          <div className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#fbf2df] text-[var(--warning)]"><TrendingDown size={18} aria-hidden="true" /></span>
              <div>
                <p className="font-semibold text-[var(--text)]">{t('refill.howtoRefillTitle')}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{t('refill.howtoRefillDesc')}</p>
              </div>
            </div>
            <ol className="mt-4 space-y-2">
              {(isId ? [
                'Klik Ekspor Item Refill untuk mengunduh template CSV.',
                'CSV berisi kolom: Nomor Part, Deskripsi, SOH Tersedia, QTY TO, Stok Maks, Lokasi, dan Keterangan.',
                'QTY TO sudah dihitung otomatis oleh sistem: Maks - SOH Tersedia.',
                'Kolom Keterangan dikosongkan agar tim gudang dapat mengisi keterangan pengiriman.',
                'Unggah atau lampirkan file ini sebagai dokumen Transfer Order ke bagian pengadaan.'
              ] : [
                'Click Export Refill List to download the template CSV.',
                'CSV contains: Part Number, Description, Available SOH, QTY TO, Max Stock, Location, and Remarks.',
                'QTY TO is automatically calculated: Max - Available SOH.',
                'Remarks column is left blank for the warehouse team to fill delivery details.',
                'Attach or upload this file as the Transfer Order document to procurement.'
              ]).map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--warning)] bg-[#fbf2df] text-[9px] font-bold text-[var(--warning)]">{i + 1}</span>
                  <p className="text-xs leading-5 text-[var(--text-muted)]">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f0f5] text-[var(--brand-blue)]"><Package size={18} aria-hidden="true" /></span>
              <div>
                <p className="font-semibold text-[var(--text)]">{t('refill.howtoVoucherTitle')}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{t('refill.howtoVoucherDesc')}</p>
              </div>
            </div>
            <ol className="mt-4 space-y-2">
              {(isId ? [
                'Buka tab Parts Voucher dan buat draf dokumen.',
                'Klik Tambah Part untuk memilih part atau Muat Semua Part untuk memasukkan semua inventaris aktif.',
                'Stok secara default menyesuaikan SOH Fisik terakhir namun bisa diubah manual.',
                'Isi kolom Keterangan untuk mencatat kondisi atau catatan serah terima.',
                'Klik Ekspor Format Voucher untuk mengunduh CSV dokumen yang sudah disesuaikan.'
              ] : [
                'Open the Parts Voucher tab and build the document draft.',
                'Click Add Part to select a part or Load All Parts to insert the entire active inventory.',
                'Stock defaults to the latest Physical SOH but can be edited manually.',
                'Fill the Remarks column to note condition or handover details.',
                'Click Export Voucher Format to download the customized document CSV.'
              ]).map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--brand-blue)] bg-[#e8f0f5] text-[9px] font-bold text-[var(--brand-blue)]">{i + 1}</span>
                  <p className="text-xs leading-5 text-[var(--text-muted)]">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="app-panel mb-6 grid overflow-hidden lg:grid-cols-2">
        <div className="flex flex-col gap-5 border-b border-[var(--border)] p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#fbf2df] text-[var(--warning)]"><TrendingDown size={19} aria-hidden="true" /></span>
            <div>
              <h2 className="font-semibold text-[var(--text)]">{t('refill.refillTitle')}</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{t('refill.refillDescription')}</p>
            </div>
          </div>
          <div className="mt-auto pt-2">
            <div className="mb-4 grid grid-cols-2 gap-4 rounded-[8px] bg-[var(--background)] p-4">
              <div>
                <p className="text-xs text-[var(--text-muted)]">{t('refill.itemsRequired')}</p>
                <p className="mt-1 text-xl font-semibold text-[var(--text)]">{formatNumber(needsRefill.length)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">{t('refill.totalQuantity')}</p>
                <p className="mt-1 text-xl font-semibold text-[var(--warning)]">{formatNumber(totalRefill)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setView('refill')} variant={view === 'refill' ? 'primary' : 'secondary'} className="flex-1">{t('refill.tableTitle')}</Button>
              <Button onClick={exportRefill} variant="secondary" disabled={needsRefill.length === 0}><Download size={16} aria-hidden="true" className="mr-2" /> {t('refill.exportRefill')}</Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#e8f0f5] text-[var(--brand-blue)]"><Package size={19} aria-hidden="true" /></span>
            <div>
              <h2 className="font-semibold text-[var(--text)]">{t('refill.voucherTitle')}</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{t('refill.voucherDescription')}</p>
            </div>
          </div>
          <div className="mt-auto pt-2">
            <div className="mb-4 grid grid-cols-2 gap-4 rounded-[8px] bg-[var(--background)] p-4">
              <div>
                <p className="text-xs text-[var(--text-muted)]">{isId ? 'Baris di draf' : 'Rows in draft'}</p>
                <p className="mt-1 text-xl font-semibold text-[var(--text)]">{formatNumber(voucherRows.length)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">{t('refill.masterParts')}</p>
                <p className="mt-1 text-xl font-semibold text-[var(--brand-blue)]">{formatNumber(inventory.length)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setView('voucher')} variant={view === 'voucher' ? 'primary' : 'secondary'} className="flex-1">{t('refill.voucherTitle')}</Button>
              <Button onClick={exportVoucher} variant="secondary" disabled={voucherRows.length === 0}><Download size={16} aria-hidden="true" className="mr-2" /> {t('refill.exportVoucher')}</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="app-panel overflow-hidden">
        {view === 'refill' && (
          <>
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h3 className="font-semibold text-[var(--text)]">{t('refill.tableTitle')}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{t('refill.tableDescription')}</p>
            </div>

            <ul className="divide-y divide-[var(--border)] md:hidden">
              {needsRefill.map((item) => (
                <li key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--text)]">{item.partNumber}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{item.description}</p>
                    </div>
                    <StatusBadge status="warning">+{formatNumber(item.refillRecommendation)}</StatusBadge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">{t('refill.currentStock')}</p>
                      <p className="mt-1 text-base font-semibold text-[var(--danger)]">{formatNumber(item.availableStock)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">{isId ? 'Target Maks' : 'Max Target'}</p>
                      <p className="mt-1 text-base font-semibold text-[var(--text)]">{formatNumber(item.maxStock)}</p>
                    </div>
                  </div>
                </li>
              ))}
              {needsRefill.length === 0 && <li className="py-16 text-center text-sm text-[var(--text-muted)]">{t('refill.noData')}</li>}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="data-table min-w-[720px]">
                <caption className="sr-only">{t('refill.tableCaption')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('common.partNumber')}</th>
                    <th scope="col">{t('common.description')}</th>
                    <th scope="col">{t('common.location')}</th>
                    <th scope="col" className="text-right">{t('refill.currentStock')}</th>
                    <th scope="col" className="text-right">{isId ? 'Stok Maks' : 'Max Stock'}</th>
                    <th scope="col" className="text-right">{t('refill.recommendedQty')}</th>
                  </tr>
                </thead>
                <tbody>
                  {needsRefill.map((item) => (
                    <tr key={item.id}>
                      <td className="font-semibold text-[var(--text)]">{item.partNumber}</td>
                      <td><p className="max-w-[280px] truncate text-[var(--text)]">{item.description}</p></td>
                      <td className="text-[var(--text-muted)]">{item.location}</td>
                      <td className="text-right font-semibold text-[var(--danger)]">{formatNumber(item.availableStock)}</td>
                      <td className="text-right text-[var(--text-muted)]">{formatNumber(item.maxStock)}</td>
                      <td className="text-right font-semibold text-[var(--brand-blue)]">+{formatNumber(item.refillRecommendation)}</td>
                    </tr>
                  ))}
                  {needsRefill.length === 0 && <tr><td colSpan={6} className="py-16 text-center text-sm text-[var(--text-muted)]">{t('refill.noData')}</td></tr>}
                </tbody>
              </table>
            </div>

            {needsRefill.length > 0 && (
              <div className="border-t border-[var(--border)] bg-[var(--surface-muted)] px-5 py-3">
                <p className="text-xs text-[var(--text-muted)]">
                  {isId ? <>{needsRefill.length} part memerlukan isi ulang - Total kebutuhan: <span className="font-semibold text-[var(--brand-blue)]">{formatNumber(totalRefill)} unit</span></> : <>{needsRefill.length} parts require replenishment - Total quantity needed: <span className="font-semibold text-[var(--brand-blue)]">{formatNumber(totalRefill)} units</span></>}
                </p>
              </div>
            )}
          </>
        )}

        {view === 'voucher' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
              <div>
                <h3 className="font-semibold text-[var(--text)]">{t('refill.voucherTitle')}</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{isId ? 'Draf kustom untuk dokumen' : 'Custom draft for document'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={loadAllVoucherParts}>{t('refill.loadAllParts')}</Button>
                <Button variant="primary" size="sm" onClick={openAddVoucherRow}><Plus size={16} className="mr-1" /> {t('refill.addVoucherPart')}</Button>
                {voucherRows.length > 0 && <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)}><Trash2 size={16} className="mr-1" /> {t('refill.clearDraft')}</Button>}
              </div>
            </div>

            <ul className="divide-y divide-[var(--border)] md:hidden">
              {voucherRows.map((row) => {
                const invItem = inventory.find(i => i.partNumber === row.partNumber)
                return (
                  <li key={row.partNumber} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--text)]">{row.partNumber}</p>
                        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{invItem?.description || '-'}</p>
                        <p className="mt-1 text-xs text-[var(--text)]">{row.remarks ? row.remarks : <span className="italic text-[var(--text-subtle)]">{t('refill.voucherRemarks')} kosong</span>}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">{t('refill.voucherStock')}</p>
                        <p className="mt-1 text-base font-semibold text-[var(--text)]">{formatNumber(row.stock)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEditVoucherRow(row)}><Pencil size={14} className="mr-2" /> Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => removeVoucherRow(row.partNumber)}><Trash2 size={14} /></Button>
                    </div>
                  </li>
                )
              })}
              {voucherRows.length === 0 && <li className="py-16 text-center text-sm text-[var(--text-muted)]">{t('refill.voucherEmpty')}</li>}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="data-table min-w-[720px]">
                <caption className="sr-only">{t('refill.voucherTitle')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('common.partNumber')}</th>
                    <th scope="col">{t('common.description')}</th>
                    <th scope="col" className="text-right">{t('refill.voucherStock')}</th>
                    <th scope="col">{t('refill.voucherRemarks')}</th>
                    <th scope="col" className="text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {voucherRows.map((row) => {
                    const invItem = inventory.find(i => i.partNumber === row.partNumber)
                    return (
                      <tr key={row.partNumber}>
                        <td className="font-semibold text-[var(--text)]">{row.partNumber}</td>
                        <td><p className="max-w-[240px] truncate text-[var(--text)]">{invItem?.description || '-'}</p></td>
                        <td className="text-right font-semibold text-[var(--text)]">{formatNumber(row.stock)}</td>
                        <td><p className="max-w-[200px] truncate text-[var(--text)]">{row.remarks || '-'}</p></td>
                        <td className="text-right">
                          <div className="inline-flex gap-1">
                            <Button variant="secondary" size="sm" onClick={() => openEditVoucherRow(row)} ariaLabel="Edit"><Pencil size={14} /></Button>
                            <Button variant="danger" size="sm" onClick={() => removeVoucherRow(row.partNumber)} ariaLabel="Hapus"><Trash2 size={14} /></Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {voucherRows.length === 0 && <tr><td colSpan={5} className="py-16 text-center text-sm text-[var(--text-muted)]">{t('refill.voucherEmpty')}</td></tr>}
                </tbody>
              </table>
            </div>

            {voucherRows.length > 0 && (
              <div className="border-t border-[var(--border)] bg-[var(--surface-muted)] px-5 py-3">
                <p className="text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5"><FileBarChart2 size={13} className="text-[var(--brand-blue)]" aria-hidden="true" />
                    {isId ? <>{formatNumber(voucherRows.length)} baris di draf - Siap diekspor ke CSV.</> : <>{formatNumber(voucherRows.length)} rows in draft - Ready for CSV export.</>}
                  </span>
                </p>
              </div>
            )}
          </>
        )}
      </section>

      <Modal open={voucherEditor !== null} onClose={() => setVoucherEditor(null)} title={voucherEditor?.mode === 'add' ? t('refill.addVoucherPartTitle') : t('refill.editVoucherPartTitle')} description={t('refill.editVoucherPartDescription')} size="md">
        {voucherEditor && (
          <form onSubmit={saveVoucherRow} className="mt-4 flex flex-col gap-4">
            <SelectField
              id="voucher-part"
              label={t('common.partNumber')}
              value={voucherEditor.partNumber}
              onChange={handleVoucherPartSelect}
              options={inventory.map(p => ({ value: p.partNumber, label: p.partNumber + ' | ' + p.description.slice(0, 34) }))}
              required
            />
            <NumberField
              id="voucher-stock"
              label={t('refill.voucherStock')}
              value={voucherEditor.stock}
              onChange={(value) => setVoucherEditor(prev => prev ? { ...prev, stock: value } : null)}
              min={0}
              required
            />
            <TextField
              id="voucher-remarks"
              label={t('refill.voucherRemarks')}
              value={voucherEditor.remarks}
              onChange={(value) => setVoucherEditor(prev => prev ? { ...prev, remarks: value } : null)}
            />
            {voucherError && <p className="text-sm font-semibold text-[var(--danger)]">{voucherError}</p>}
            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setVoucherEditor(null)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="primary">{t('refill.voucherSave')}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title={t('refill.clearDraft')} description={t('refill.clearConfirm')} size="sm">
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmClear(false)}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={() => { setVoucherRows([]); setConfirmClear(false); push({ tone: 'info', title: t('refill.voucherRemoved') }) }}>{t('common.delete')}</Button>
        </div>
      </Modal>

    </div>
  )
}
