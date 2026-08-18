import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type {
  InboundTransaction,
  InventoryRow,
  OutboundTransaction,
  Part,
  StockAdjustment,
} from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value)
}

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value
  return new Intl.DateTimeFormat('id-ID', options ?? {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function todayIso() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function generateId(prefix: string) {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

function isOnOrAfter(date: string, baseline?: string) {
  if (!baseline) return true
  return date >= baseline
}

export function calculateInventory(
  parts: Part[],
  outbound: OutboundTransaction[],
  inbound: InboundTransaction[],
  adjustments: StockAdjustment[],
): InventoryRow[] {
  return parts
    .filter((part) => part.active)
    .map((part) => {
      const partInbound = inbound.filter(
        (transaction) =>
          transaction.partNumber === part.partNumber &&
          transaction.grStatus === 'Done GR' &&
          isOnOrAfter(transaction.receivedDate, part.openingStockDate),
      )
      const partOutbound = outbound.filter(
        (transaction) =>
          transaction.partNumber === part.partNumber &&
          isOnOrAfter(transaction.requestDate, part.openingStockDate),
      )
      const partAdjustments = adjustments.filter(
        (adjustment) =>
          adjustment.partNumber === part.partNumber &&
          isOnOrAfter(adjustment.adjustmentDate, part.openingStockDate),
      )

      const inboundPosted = partInbound.reduce((total, item) => total + item.qtyMatdoc, 0)
      const outboundRequested = partOutbound.reduce((total, item) => total + item.qtyRequest, 0)
      const outboundSupplied = partOutbound.reduce((total, item) => total + item.qtySupply, 0)
      const adjustmentVariance = partAdjustments.reduce((total, item) => total + item.variance, 0)
      const outstanding = Math.max(0, outboundRequested - outboundSupplied)
      const physicalStock = part.openingStock + inboundPosted - outboundSupplied + adjustmentVariance
      const availableStock = part.openingStock + inboundPosted - outboundRequested + adjustmentVariance
      const status = availableStock >= part.minStock ? 'READY' : 'NOT_READY'
      const refillRecommendation = availableStock < part.minStock
        ? Math.max(0, part.maxStock - availableStock)
        : 0

      return {
        ...part,
        inboundPosted,
        outboundRequested,
        outboundSupplied,
        outstanding,
        physicalStock,
        availableStock,
        status,
        refillRecommendation,
        callCount: partOutbound.length,
      }
    })
}

export function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escapeCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const csv = [headers.map(escapeCell).join(','), ...rows.map((row) => headers.map((key) => escapeCell(row[key])).join(','))].join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
