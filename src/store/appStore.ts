import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import seedData from '../data-seed.json'
import type {
  AppData,
  InboundTransaction,
  OutboundTransaction,
  Part,
  StockAdjustment,
} from '../types'
import { generateId, todayIso } from '../lib/utils'
import { apiIsConfigured, getBootstrap, postAdjustment, postInbound, postOutbound } from '../lib/api'

interface AppStore extends AppData {
  dataMode: 'demo' | 'connected'
  addOutbound: (transaction: Omit<OutboundTransaction, 'id' | 'createdAt'>) => Promise<void>
  addInbound: (transaction: Omit<InboundTransaction, 'id' | 'createdAt'>) => Promise<void>
  addAdjustment: (adjustment: Omit<StockAdjustment, 'id' | 'createdAt'>) => Promise<void>
  updatePart: (id: string, updates: Partial<Part>) => void
  resetDemo: () => void
  hydrateFromApi: () => Promise<void>
}

const initialData: AppData = {
  parts: seedData.parts.map((part) => ({
    ...part,
    warehouseType: part.warehouseType as Part['warehouseType'],
    openingStockDate: '2026-03-30',
  })),
  outbound: seedData.outbound.map((transaction) => ({
    ...transaction,
    warehouseType: transaction.warehouseType as OutboundTransaction['warehouseType'],
  })),
  inbound: [],
  adjustments: [],
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialData,
      dataMode: 'demo',
      addOutbound: async (transaction) => {
        const saved = apiIsConfigured() ? (await postOutbound(transaction)).data : { ...transaction, id: generateId('OUT'), createdAt: new Date().toISOString() }
        set((state) => ({ outbound: [saved, ...state.outbound] }))
      },
      addInbound: async (transaction) => {
        const saved = apiIsConfigured() ? (await postInbound(transaction)).data : { ...transaction, id: generateId('IN'), createdAt: new Date().toISOString() }
        set((state) => ({ inbound: [saved, ...state.inbound] }))
      },
      addAdjustment: async (adjustment) => {
        const saved = apiIsConfigured() ? (await postAdjustment(adjustment)).data : { ...adjustment, id: generateId('ADJ'), createdAt: new Date().toISOString() }
        set((state) => ({ adjustments: [saved, ...state.adjustments] }))
      },
      updatePart: (id, updates) =>
        set((state) => ({
          parts: state.parts.map((part) => (part.id === id ? { ...part, ...updates } : part)),
        })),
      resetDemo: () => set({ ...initialData, dataMode: 'demo' }),
      hydrateFromApi: async () => {
        if (!apiIsConfigured()) return
        const response = await getBootstrap()
        set({ ...response.data, dataMode: 'connected' })
      },
    }),
    {
      name: 'soh-command-center-v1',
      version: 1,
      partialize: ({ parts, outbound, inbound, adjustments, dataMode }) => ({
        parts,
        outbound,
        inbound,
        adjustments,
        dataMode,
      }),
    },
  ),
)

export const defaultOutboundDraft = {
  requestDate: todayIso(),
  requester: '',
  partNumber: '',
  qtyRequest: 1,
  qtySupply: 1,
  warehouseType: 'Consignment' as import('../types').WarehouseType,
  documents: { pr: '', po: '', so: '', dn: '', invoice: '' },
  notes: '',
  createdBy: 'Warehouse Man',
}

export const defaultInboundDraft = {
  receivedDate: todayIso(),
  partNumber: '',
  qtyMatdoc: 1,
  qtyActual: 1,
  grStatus: 'Pending' as import('../types').GrStatus,
  matdocNumber: '',
  spbNumber: '',
  poNumber: '',
  invoiceOrTo: '',
  source: '',
  notes: '',
  createdBy: 'Warehouse Man',
}


