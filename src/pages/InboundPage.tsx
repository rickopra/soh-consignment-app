import { useState } from 'react'
import { useAppStore, defaultInboundDraft } from '../store/appStore'
import { Button, Card, Modal, NumberField, SectionHeader, SelectField, StatusBadge, TextField, } from '../components/ui'
import { useToast } from '../components/toast'
import { Plus, Search } from 'lucide-react'
import { formatDate } from '../lib/utils'

export default function InboundPage() {
  const { parts, inbound, addInbound } = useAppStore()
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(defaultInboundDraft)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const currentPart = parts.find((part) => part.partNumber === draft.partNumber)
  const filtered = inbound.filter((item) => `${item.partNumber} ${item.matdocNumber}`.toLowerCase().includes(search.toLowerCase()))

  const closeModal = () => { setOpen(false); setError('') }
  const openModal = () => { setDraft({ ...defaultInboundDraft, partNumber: parts[0]?.partNumber ?? '' }); setError(''); setOpen(true) }
  const submit = async () => {
    if (!draft.partNumber || draft.qtyMatdoc < 1 || draft.qtyActual < 0) { setError('Isi part dan jumlah dokumen dengan benar.'); return }
    if (draft.grStatus === 'Pending' && draft.qtyActual > 0) { setError('Jika sudah ada qty aktual, status GR seharusnya Done.'); return }
    setSaving(true)
    setError('')
    try {
      await addInbound(draft)
      closeModal()
      push({ tone: 'success', title: 'Inbound tersimpan', description: `${draft.partNumber} dicatat dengan status ${draft.grStatus}.` })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Inbound gagal disimpan.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="operational-view">
    <SectionHeader title="Inbound" description="Inbound hanya menambah SOH fisik dan available jika statusnya sudah Done GR." action={<Button onClick={openModal}><Plus size={17} />Input Inbound</Button>} />
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><Card className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total penerimaan</p><p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{inbound.length}</p></Card><Card className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Selesai GR</p><p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{inbound.filter((i) => i.grStatus === 'Done GR').length}</p></Card><Card className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Selisih Dokumen</p><p className="mt-2 text-3xl font-extrabold text-amber-500">{inbound.filter((i) => i.grStatus === 'Done GR' && i.qtyMatdoc !== i.qtyActual).length}</p></Card></div>
    <Card className="overflow-hidden"><div className="border-b border-slate-100 p-4 dark:border-slate-800"><div className="relative max-w-sm"><label htmlFor="inbound-search" className="sr-only">Cari transaksi inbound</label><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="inbound-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor dokumen atau part" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Daftar transaksi inbound</caption><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400"><tr><th scope="col" className="px-5 py-4 font-semibold">Tgl / Dokumen</th><th scope="col" className="px-5 py-4 font-semibold">Part</th><th scope="col" className="px-5 py-4 text-right font-semibold">Qty Dokumen</th><th scope="col" className="px-5 py-4 text-right font-semibold">Qty Aktual</th><th scope="col" className="px-5 py-4 font-semibold">Status GR</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((item) => <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"><td className="px-5 py-4"><p className="font-semibold text-slate-900 dark:text-white">{formatDate(item.receivedDate)}</p><p className="text-xs text-slate-500">{item.matdocNumber || 'Tanpa Matdoc'}</p></td><td className="px-5 py-4"><p className="font-bold text-slate-900 dark:text-white">{item.partNumber}</p><p className="text-xs text-slate-500">{parts.find((part) => part.partNumber === item.partNumber)?.description ?? 'Part tidak ditemukan'}</p></td><td className="px-5 py-4 text-right font-medium">{item.qtyMatdoc}</td><td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">{item.qtyActual}</td><td className="px-5 py-4"><StatusBadge status={item.grStatus === 'Done GR' ? 'ready' : 'neutral'}>{item.grStatus}</StatusBadge>{item.grStatus === 'Done GR' && item.qtyMatdoc !== item.qtyActual && <p className="mt-1 text-xs text-amber-600">Ada selisih</p>}</td></tr>)}{filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-500">Belum ada penerimaan yang dicatat.</td></tr>}</tbody></table></div></Card>
    <Modal open={open} onClose={closeModal} title="Input Inbound" description="Catat barang masuk dari hasil refill atau pengadaan." size="md"><div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><TextField id="inbound-date" label="Tanggal terima" type="date" value={draft.receivedDate} onChange={(value) => setDraft((current) => ({ ...current, receivedDate: value }))} required /><SelectField id="inbound-part" label="Part Number" value={draft.partNumber} onChange={(value) => setDraft((current) => ({ ...current, partNumber: value }))} options={parts.map((part) => ({ value: part.partNumber, label: `${part.partNumber} · ${part.description.slice(0, 30)}` }))} required /><TextField id="inbound-matdoc" label="No. Matdoc" value={draft.matdocNumber} onChange={(value) => setDraft((current) => ({ ...current, matdocNumber: value }))} placeholder="Nomor dokumen" /><SelectField id="inbound-status" label="Status GR" value={draft.grStatus} onChange={(value) => setDraft((current) => ({ ...current, grStatus: value as 'Pending' | 'Done GR' }))} options={[{ value: 'Pending', label: 'Pending' }, { value: 'Done GR', label: 'Done GR' }]} required /><NumberField id="inbound-matdoc-qty" label="Qty Dokumen" value={draft.qtyMatdoc} onChange={(value) => setDraft((current) => ({ ...current, qtyMatdoc: value }))} min={1} required /><NumberField id="inbound-actual-qty" label="Qty Aktual" value={draft.qtyActual} onChange={(value) => setDraft((current) => ({ ...current, qtyActual: value }))} min={0} required /></div>{currentPart && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">Selected: <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPart.description}</span></div>}{draft.qtyMatdoc !== draft.qtyActual && draft.qtyActual > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Terdapat selisih {Math.abs(draft.qtyMatdoc - draft.qtyActual)} unit antara dokumen dan aktual.</p>}{error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" role="alert">{error}</p>}<div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={closeModal}>Batal</Button><Button onClick={() => void submit()} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Inbound'}</Button></div></div></Modal>
  </div>
}

