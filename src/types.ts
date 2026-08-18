export type WarehouseType = 'Consignment' | 'Service Point' | 'Warehouse Store'
export type StockStatus = 'READY' | 'NOT_READY'
export type GrStatus = 'Pending' | 'Done GR'

export interface Part {
  id: string
  partNumber: string
  replacementPartNumber: string
  description: string
  location: string
  warehouseType: WarehouseType
  minStock: number
  maxStock: number
  openingStock: number
  openingStockDate?: string
  warehouseStock: number
  active: boolean
}

export interface OutboundDocuments {
  pr: string
  po: string
  so: string
  dn: string
  invoice: string
}

export interface OutboundTransaction {
  id: string
  requestDate: string
  requester: string
  partNumber: string
  qtyRequest: number
  qtySupply: number
  warehouseType: WarehouseType
  documents: OutboundDocuments
  notes: string
  createdBy: string
  createdAt: string
}

export interface InboundTransaction {
  id: string
  receivedDate: string
  partNumber: string
  qtyMatdoc: number
  qtyActual: number
  grStatus: GrStatus
  matdocNumber: string
  spbNumber: string
  poNumber: string
  invoiceOrTo: string
  source: string
  notes: string
  createdBy: string
  createdAt: string
}

export interface StockAdjustment {
  id: string
  adjustmentDate: string
  partNumber: string
  previousBookStock: number
  physicalCount: number
  variance: number
  reason: string
  createdBy: string
  createdAt: string
}

export interface InventoryRow extends Part {
  inboundPosted: number
  outboundRequested: number
  outboundSupplied: number
  outstanding: number
  physicalStock: number
  availableStock: number
  status: StockStatus
  refillRecommendation: number
  callCount: number
}

export interface AppData {
  parts: Part[]
  outbound: OutboundTransaction[]
  inbound: InboundTransaction[]
  adjustments: StockAdjustment[]
}
