import { useAppStore } from '../store/appStore'
import { calculateInventory } from '../lib/utils'
import { Card, SectionHeader, StatusBadge } from '../components/ui'
import { AlertTriangle, ArrowUpFromLine, Boxes, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { parts, outbound, inbound, adjustments } = useAppStore()
  const inventory = calculateInventory(parts, outbound, inbound, adjustments)
  const readinessCount = inventory.filter((i) => i.status === 'READY').length
  const totalParts = inventory.length
  const readinessPercent = totalParts > 0 ? (readinessCount / totalParts) * 100 : 0
  const needRefillCount = inventory.filter((i) => i.refillRecommendation > 0).length
  const outstandingCount = inventory.reduce((total, i) => total + i.outstanding, 0)
  const monthlyOutbound = outbound.length
  return (
    <div>
      <SectionHeader title="Overview Operasional" description="Pantauan stok dan performa gudang Consignment Jambi/Mendalo hari ini." action={<img src={`${import.meta.env.BASE_URL}brand/logo-horizontal.webp`} alt="SOH Consignment" className="hidden h-12 w-auto rounded-xl bg-white/70 px-2 py-1 object-contain shadow-sm dark:bg-slate-900/70 sm:block" />} />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col p-5"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Target Readiness</p><TrendingUp size={16} className="text-emerald-500" /></div><div className="mt-auto flex items-end justify-between"><p className="text-3xl font-extrabold text-slate-900 dark:text-white">{readinessPercent.toFixed(1)}%</p><StatusBadge status={readinessPercent >= 95 ? 'ready' : 'warning'}>{readinessCount} dari {totalParts} part siap</StatusBadge></div></Card>
        <Card className="flex flex-col p-5"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Perlu Refill</p><AlertTriangle size={16} className="text-amber-500" /></div><div className="mt-auto flex items-end justify-between"><p className="text-3xl font-extrabold text-slate-900 dark:text-white">{needRefillCount}</p><p className="text-sm text-slate-500">Part di bawah min</p></div></Card>
        <Card className="flex flex-col p-5"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pengeluaran</p><ArrowUpFromLine size={16} className="text-blue-500" /></div><div className="mt-auto flex items-end justify-between"><p className="text-3xl font-extrabold text-slate-900 dark:text-white">{monthlyOutbound}</p><p className="text-sm text-slate-500">Transaksi dicatat</p></div></Card>
        <Card className="flex flex-col p-5"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Outstanding</p><Boxes size={16} className="text-rose-500" /></div><div className="mt-auto flex items-end justify-between"><p className="text-3xl font-extrabold text-slate-900 dark:text-white">{outstandingCount}</p><p className="text-sm text-slate-500">Unit belum disupply</p></div></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Part Kritis (Butuh Refill)</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {inventory.filter((i) => i.refillRecommendation > 0).slice(0, 5).map((part) => <div key={part.id} className="flex items-center justify-between py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{part.partNumber}</p><p className="truncate text-xs text-slate-500">{part.description}</p></div><div className="text-right"><p className="text-sm font-bold text-rose-600 dark:text-rose-400">Sisa {part.availableStock}</p><p className="text-xs text-slate-500">Refill +{part.refillRecommendation}</p></div></div>)}
            {needRefillCount === 0 && <p className="py-8 text-center text-sm text-slate-500">Semua part dalam kondisi aman melebihi stok minimum.</p>}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Aktivitas Outbound Terakhir</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {outbound.slice(0, 5).map((txn) => <div key={txn.id} className="flex items-center justify-between py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{txn.partNumber}</p><p className="truncate text-xs text-slate-500">{txn.requester} • {txn.requestDate}</p></div><div className="text-right"><p className="text-sm font-bold text-slate-900 dark:text-slate-100">{txn.qtyRequest} unit</p>{txn.qtyRequest > txn.qtySupply && <p className="text-xs font-medium text-rose-600">Sisa {txn.qtyRequest - txn.qtySupply}</p>}</div></div>)}
            {outbound.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Belum ada transaksi outbound yang dicatat.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}

