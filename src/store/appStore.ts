import { create } from 'zustand'
import type {
  AppData,
  InboundGrUpdate,
  InboundTransaction,
  OutboundTransaction,
  PartInput,
  StockAdjustmentInput,
} from '../types'
import { todayIso } from '../lib/utils'
import {
  ApiError,
  createPart as createPartRequest,
  deactivatePart as deactivatePartRequest,
  getBootstrap,
  postAdjustment,
  postInbound,
  postOutbound,
  updateInbound as updateInboundRequest,
  updateOutboundSupply as updateOutboundSupplyRequest,
  updatePart as updatePartRequest,
} from '../lib/api'
import { useAuthStore } from './authStore'

interface AppStore extends AppData {
  dataMode: 'loading' | 'connected'
  hydrated: boolean
  addOutbound: (transaction: Omit<OutboundTransaction, 'id' | 'createdAt'>) => Promise<void>
  updateOutboundSupply: (transactionId: string, qtySupply: number) => Promise<void>
  addInbound: (transaction: Omit<InboundTransaction, 'id' | 'createdAt'>) => Promise<void>
  updateInbound: (transactionId: string, updates: InboundGrUpdate) => Promise<void>
  addAdjustment: (adjustment: StockAdjustmentInput) => Promise<void>
  createPart: (part: PartInput) => Promise<void>
  updatePart: (id: string, part: PartInput) => Promise<void>
  deactivatePart: (id: string) => Promise<void>
  hydrateFromApi: () => Promise<void>
  clearData: () => void
}

const emptyData: AppData = {
  parts: [],
  outbound: [],
  inbound: [],
  adjustments: [],
}

function sessionToken() {
  const token = useAuthStore.getState().token
  if (!token) throw new ApiError('Sesi tidak tersedia.', 'SESSION_REQUIRED')
  return token
}

function handleSessionError(error: unknown) {
  if (error instanceof ApiError && ['SESSION_REQUIRED', 'SESSION_INVALID', 'SESSION_EXPIRED', 'ACCOUNT_INACTIVE'].includes(error.code)) {
    useAuthStore.getState().clearSession()
  }
  throw error
}

export const useAppStore = create<AppStore>((set) => ({
  ...emptyData,
  dataMode: 'loading',
  hydrated: false,
  addOutbound: async (transaction) => {
    try {
      const saved = (await postOutbound(sessionToken(), transaction)).data
      set((state) => ({ outbound: [saved, ...state.outbound] }))
    } catch (error) {
      handleSessionError(error)
    }
  },
  updateOutboundSupply: async (transactionId, qtySupply) => {
    try {
      const updated = (await updateOutboundSupplyRequest(sessionToken(), transactionId, qtySupply)).data
      set((state) => ({ outbound: state.outbound.map((transaction) => (transaction.id === transactionId ? updated : transaction)) }))
    } catch (error) {
      handleSessionError(error)
    }
  },
  addInbound: async (transaction) => {
    try {
      const saved = (await postInbound(sessionToken(), transaction)).data
      set((state) => ({ inbound: [saved, ...state.inbound] }))
    } catch (error) {
      handleSessionError(error)
    }
  },
  updateInbound: async (transactionId, updates) => {
    try {
      const updated = (await updateInboundRequest(sessionToken(), transactionId, updates)).data
      set((state) => ({ inbound: state.inbound.map((item) => (item.id === transactionId ? updated : item)) }))
    } catch (error) {
      handleSessionError(error)
    }
  },
  addAdjustment: async (adjustment) => {
    try {
      const saved = (await postAdjustment(sessionToken(), adjustment)).data
      set((state) => ({ adjustments: [saved, ...state.adjustments] }))
    } catch (error) {
      handleSessionError(error)
    }
  },
  createPart: async (part) => {
    try {
      const saved = (await createPartRequest(sessionToken(), part)).data
      set((state) => ({ parts: [saved, ...state.parts] }))
    } catch (error) {
      handleSessionError(error)
    }
  },
  updatePart: async (id, part) => {
    try {
      const updated = (await updatePartRequest(sessionToken(), id, part)).data
      set((state) => ({ parts: state.parts.map((item) => (item.id === id ? updated : item)) }))
    } catch (error) {
      handleSessionError(error)
    }
  },
  deactivatePart: async (id) => {
    try {
      const updated = (await deactivatePartRequest(sessionToken(), id)).data
      set((state) => ({ parts: state.parts.map((item) => (item.id === id ? updated : item)) }))
    } catch (error) {
      handleSessionError(error)
    }
  },
  hydrateFromApi: async () => {
    set({ dataMode: 'loading', hydrated: false })
    try {
      const response = await getBootstrap(sessionToken())
      set({ ...response.data, dataMode: 'connected', hydrated: true })
    } catch (error) {
      handleSessionError(error)
    }
  },
  clearData: () => set({ ...emptyData, dataMode: 'loading', hydrated: false }),
}))

export const defaultOutboundDraft = {
  requestDate: todayIso(),
  requester: '',
  partNumber: '',
  qtyRequest: 1,
  qtySupply: 0,
  warehouseType: 'Consignment' as import('../types').WarehouseType,
  documents: { pr: '', po: '', so: '', dn: '', invoice: '' },
  notes: '',
  createdBy: '',
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
  createdBy: '',
}
