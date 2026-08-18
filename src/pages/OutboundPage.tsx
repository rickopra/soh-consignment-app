import { useState } from 'react'
import { useAppStore, defaultOutboundDraft } from '../store/appStore'
import { Button, Card, Modal, NumberField, SectionHeader, SelectField, StatusBadge, TextField, } from '../components/ui'
import { useToast } from '../components/toast'
import { ArrowUpFromLine, Plus, Search } from 'lucide-react'
import type { OutboundDocuments, WarehouseType } from '../types'
import { formatDate } from '../lib/utils'

const warehouseOptions = [
  { value: 'Consignment', label: 'Consignment' },
  { value: 'Service Point', label: 'Service Point' },
  { value: 'Warehouse Store', label: 'Warehouse Store' },
]

export default function OutboundPage() {
  const { parts, outbound, addOutbound } = useAppStore()
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(defaultOutboundDraft)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const currentPart = parts.find((part) => part.partNumber === draft.partNumber)
  const needsDocuments = draft.warehouseType !== 'Warehouse Store'
  const filtered = outbound.filter((item) => `${item.partNumber} ${item.requester}`.toLowerCase().includes(search.toLowerCase()))

  const updateDocument = (key: keyof OutboundDocuments, value: string) => setDraft((current) => ({ ...current, documents: { ...current.documents, [key]: value } }))
  const closeModal = () => { setOpen(false); setError('') }
  const openModal = () => { setDraft({ ...defaultOutboundDraft, partNumber: parts[0]?.partNumber ?? '' }); setError(''); setOpen(true) }
  const submit = async () => {
    if (!draft.requester.trim() || !draft.partNumber || draft.qtyRequest < 1 || draft.qtySupply < 0 || draft.qtySupply > draft.qtyRequest) { setError('Isi requester, part, dan jumlah dengan benar. Qty Supply tidak boleh lebih besar dari Qty Request.'); return }
    if (needsDocuments && (!draft.documents.pr && !draft.documents.po && !draft.documents.so && !draft.documents.dn && !draft.documents.invoice)) { setError('Untuk Consignment atau Service Point, minimal satu nomor dokumen perlu dicatat.'); return }
    setSaving(true)
    setError('')
    try {
      await addOutbound(draft)
      closeModal()
      push({ tone: 'success', title: 'Outbound tersimpan', description: `${draft.partNumber} dicatat sebagai permintaan ${draft.qtyRequest} unit.` })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Outbound gagal disimpan.')
    } finally {
      setSaving(false)
    }
  }

  return <div>
    <SectionHeader title="Outbound" description="Satu baris transaksi mewakili satu part. Qty Request langsung mengurangi SOH available, sedangkan selisihnya tetap terlihat sebagai outstanding." action={<Button onClick={openModal}><Plus size={17} />Input Outbound</Button>} />
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><Card className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total transaksi</p><p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{outbound.length}</p></Card><Card className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total request</p><p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{outbound.reduce((total, item) => total + item.qtyRequest, 0)}</p></Card><Card className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Outstanding</p><p className="mt-2 text-3xl font-extrabold text-rose-600">{outbound.reduce((total, item) => total + Math.max(0, item.qtyRequest - item.qtySupply), 0)}</p></Card></div>
    <Card className="overflow-hidden"><div className="border-b border-slate-100 p-4 dark:border-slate-800"><div className="relative max-w-sm"><label htmlFor="outbound-search" className="sr-only">Cari transaksi outbound</label><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="outbound-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari requester atau part number" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Daftar transaksi outbound</caption><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400"><tr><th scope="col" className="px-5 py-4 font-semibold">Tanggal / Requester</th><th scope="col" className="px-5 py-4 font-semibold">Part</th><th scope="col" className="px-5 py-4 text-right font-semibold">Request</th><th scope="col" className="px-5 py-4 text-right font-semibold">Supply</th><th scope="col" className="px-5 py-4 text-right font-semibold">Outstanding</th><th scope="col" className="px-5 py-4 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((item) => { const outstanding = Math.max(0, item.qtyRequest - item.qtySupply); return <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"><td className="px-5 py-4"><p className="font-semibold text-slate-900 dark:text-white">{formatDate(item.requestDate)}</p><p className="text-xs text-slate-500">{item.requester}</p></td><td className="px-5 py-4"><p className="font-bold text-slate-900 dark:text-white">{item.partNumber}</p><p className="text-xs text-slate-500">{parts.find((part) => part.partNumber === item.partNumber)?.description ?? 'Part tidak ditemukan'}</p></td><td className="px-5 py-4 text-right font-bold">{item.qtyRequest}</td><td className="px-5 py-4 text-right">{item.qtySupply}</td><td className="px-5 py-4 text-right font-bold text-rose-600">{outstanding || '-'}</td><td className="px-5 py-4"><StatusBadge status={outstanding ? 'warning' : 'ready'}>{outstanding ? 'Outstanding' : 'Supplied'}</StatusBadge></td></tr> })}{filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-500">Belum ada transaksi yang sesuai.</td></tr>}</tbody></table></div></Card>
    <Modal open={open} onClose={closeModal} title="Input Outbound" description="Catat permintaan satu part dalam satu transaksi." size="lg"><div className="space-y-5"><div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/30"><div className="flex gap-3"><ArrowUpFromLine className="mt-0.5 text-blue-600" size={18} aria-hidden="true" /><div><p className="text-sm font-bold text-slate-900 dark:text-white">Perhitungan available</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">Qty Request dianggap sudah dialokasikan. Qty Supply digunakan untuk memantau outstanding.</p></div></div></div><div className="grid gap-4 sm:grid-cols-2"><TextField id="outbound-date" label="Tanggal request" type="date" value={draft.requestDate} onChange={(value) => setDraft((current) => ({ ...current, requestDate: value }))} required /><TextField id="outbound-requester" label="Requester" value={draft.requester} onChange={(value) => setDraft((current) => ({ ...current, requester: value }))} placeholder="Nama requester" required /><SelectField id="outbound-part" label="Part Number" value={draft.partNumber} onChange={(value) => setDraft((current) => ({ ...current, partNumber: value }))} options={parts.map((part) => ({ value: part.partNumber, label: `${part.partNumber} · ${part.description.slice(0, 40)}` }))} required /><SelectField id="outbound-type" label="Warehouse type" value={draft.warehouseType} onChange={(value) => setDraft((current) => ({ ...current, warehouseType: value as WarehouseType }))} options={warehouseOptions} required /><NumberField id="outbound-request" label="Qty Request" value={draft.qtyRequest} onChange={(value) => setDraft((current) => ({ ...current, qtyRequest: value }))} min={1} required /><NumberField id="outbound-supply" label="Qty Supply" value={draft.qtySupply} onChange={(value) => setDraft((current) => ({ ...current, qtySupply: value }))} min={0} required /></div>{currentPart && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">Selected: <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPart.description}</span> · Location: {currentPart.location}</div>}{needsDocuments && <div><p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Dokumen referensi <span className="text-xs font-normal text-slate-400">minimal satu untuk Consignment / Service Point</span></p><div className="grid gap-4 sm:grid-cols-2"><TextField id="outbound-pr" label="No. PR" value={draft.documents.pr} onChange={(value) => updateDocument('pr', value)} placeholder="Opsional" /><TextField id="outbound-po" label="No. PO" value={draft.documents.po} onChange={(value) => updateDocument('po', value)} placeholder="Opsional" /><TextField id="outbound-so" label="No. SO" value={draft.documents.so} onChange={(value) => updateDocument('so', value)} placeholder="Opsional" /><TextField id="outbound-dn" label="No. DN" value={draft.documents.dn} onChange={(value) => updateDocument('dn', value)} placeholder="Opsional" /><TextField id="outbound-invoice" label="No. Invoice" value={draft.documents.invoice} onChange={(value) => updateDocument('invoice', value)} placeholder="Opsional" /></div></div>}{error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" role="alert">{error}</p>}<div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={closeModal}>Batal</Button><Button onClick={() => void submit()} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Outbound'}</Button></div></div></Modal>
  </div>
}
