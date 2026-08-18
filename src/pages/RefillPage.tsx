import { useAppStore } from '../store/appStore'
import { calculateInventory, downloadCsv, todayIso } from '../lib/utils'
import { Button, Card, SectionHeader, StatusBadge } from '../components/ui'
import { FileText, Printer } from 'lucide-react'

export default function RefillPage() {
  const { parts, outbound, inbound, adjustments } = useAppStore()
  const inventory = calculateInventory(parts, outbound, inbound, adjustments)
  const needsRefill = inventory.filter((item) => item.refillRecommendation > 0)
  
  const exportRefill = () => downloadCsv(`Item_Refill_TO_${todayIso()}.csv`, needsRefill.map((item) => ({ 'Part Number': item.partNumber, Description: item.description, 'SOH Sekarang': item.availableStock, 'Qty TO (Refill)': item.refillRecommendation, Lokasi: item.location, Remarks: '' })))
  const exportVoucher = () => downloadCsv(`Parts_Voucher_${todayIso()}.csv`, inventory.map((item) => ({ 'Part Number': item.partNumber, Description: item.description, LOKASI: item.location, STOCK: item.physicalStock, Remarks: '' })))

  return <div>
    <SectionHeader title="Refill & Voucher" description="Siapkan dokumen dan request transfer order (TO) berdasarkan rekomendasi sistem." />
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex flex-col p-6">
        <div className="mb-4 flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><FileText size={24} aria-hidden="true" /></div><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Item Refill (TO)</h2><p className="mt-1 text-sm text-slate-500">Daftar part yang perlu diisi ulang karena SOH berada di bawah stok minimum. Ekspor ini menggantikan sheet Item Refill (TO).</p></div></div>
        <div className="mb-6 flex-1 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total part butuh refill</p><StatusBadge status={needsRefill.length > 0 ? 'warning' : 'ready'}>{needsRefill.length} Part</StatusBadge></div>
          <div className="mt-4 flex items-center justify-between"><p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Qty (Unit)</p><p className="text-lg font-bold text-slate-900 dark:text-white">{needsRefill.reduce((total, item) => total + item.refillRecommendation, 0)}</p></div>
        </div>
        <Button onClick={exportRefill} disabled={needsRefill.length === 0} className="w-full"><Printer size={16} />Cetak / Ekspor Refill List</Button>
      </Card>

      <Card className="flex flex-col p-6">
        <div className="mb-4 flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"><FileText size={24} aria-hidden="true" /></div><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Parts Voucher</h2><p className="mt-1 text-sm text-slate-500">Digunakan untuk permintaan barang di luar kontrak konsinyasi. Ekspor ini menghasilkan format daftar part yang bisa diajukan.</p></div></div>
        <div className="mb-6 flex-1 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
          <p className="text-sm text-slate-600 dark:text-slate-400">File CSV ini berisi seluruh master {parts.length} part beserta lokasi dan sisa fisik terakhir untuk ditinjau oleh atasan.</p>
        </div>
        <Button variant="secondary" onClick={exportVoucher} className="w-full"><Printer size={16} />Ekspor Format Voucher</Button>
      </Card>
    </div>
  </div>
}

