import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { calculateInventory, downloadCsv } from '../lib/utils'
import { Button, Card, SectionHeader, StatusBadge } from '../components/ui'
import { Download, Search } from 'lucide-react'

export default function InventoryPage() {
  const { parts, outbound, inbound, adjustments } = useAppStore()
  const inventory = calculateInventory(parts, outbound, inbound, adjustments)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'ALL' | 'READY' | 'NOT_READY'>('ALL')
  const filtered = inventory.filter((item) => {
    const matchesSearch = `${item.partNumber} ${item.description}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (status === 'ALL' || item.status === status)
  })

  const exportInventory = () => downloadCsv('soh-inventory.csv', filtered.map((item) => ({
    'Part Number': item.partNumber,
    Description: item.description,
    Location: item.location,
    'SOH Fisik': item.physicalStock,
    'SOH Available': item.availableStock,
    Min: item.minStock,
    Max: item.maxStock,
    Status: item.status === 'READY' ? 'READY' : 'NOT READY',
    'Rekomendasi Refill': item.refillRecommendation,
  })))

  return (
    <div>
      <SectionHeader title="SOH Inventory" description="Stok fisik menunjukkan barang aktual. SOH available sudah memperhitungkan seluruh Qty Request yang dialokasikan." action={<Button variant="secondary" onClick={exportInventory}><Download size={16} />Export CSV</Button>} />
      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1"><label htmlFor="inventory-search" className="sr-only">Cari part</label><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="inventory-search" type="search" placeholder="Cari part number atau deskripsi" value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></div>
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Filter status stok">
            {[['ALL','Semua'],['READY','Ready'],['NOT_READY','Not Ready']].map(([value,label]) => <button key={value} type="button" onClick={() => setStatus(value as typeof status)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition ${status === value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`} aria-pressed={status === value}>{label}</button>)}
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Daftar stok part dan status readiness</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400"><tr><th scope="col" className="px-5 py-4 font-semibold">Part</th><th scope="col" className="px-5 py-4 font-semibold">Status</th><th scope="col" className="px-5 py-4 text-right font-semibold">SOH Fisik</th><th scope="col" className="px-5 py-4 text-right font-semibold">Available</th><th scope="col" className="px-5 py-4 text-right font-semibold">Min / Max</th><th scope="col" className="px-5 py-4 text-right font-semibold">Refill</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item) => <tr key={item.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"><td className="px-5 py-4"><p className="font-bold text-slate-900 dark:text-white">{item.partNumber}</p><p className="mt-1 max-w-[360px] truncate text-xs text-slate-500" title={item.description}>{item.description}</p><p className="mt-1 text-[11px] text-slate-400">{item.location}</p></td><td className="px-5 py-4"><StatusBadge status={item.status === 'READY' ? 'ready' : 'danger'}>{item.status === 'READY' ? 'READY' : 'NOT READY'}</StatusBadge></td><td className="px-5 py-4 text-right"><p className="font-bold text-slate-900 dark:text-white">{item.physicalStock}</p><p className="text-[11px] text-slate-400">Aktual</p></td><td className="px-5 py-4 text-right"><p className="font-bold text-slate-900 dark:text-white">{item.availableStock}</p><p className="text-[11px] text-slate-400">Setelah request</p></td><td className="px-5 py-4 text-right font-medium text-slate-600 dark:text-slate-300">{item.minStock} / {item.maxStock}</td><td className="px-5 py-4 text-right">{item.refillRecommendation > 0 ? <span className="font-bold text-blue-600 dark:text-blue-400">+{item.refillRecommendation}</span> : <span className="text-slate-400">-</span>}</td></tr>)}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-500">Tidak ada part yang sesuai dengan filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
