export type WarehouseType = 'Consignment' | 'Service Point' | 'Warehouse Store'
export type StockStatus = 'READY' | 'NOT_READY'
export type GrStatus = 'Pending' | 'Done GR'
export type UserRole = 'ADMIN' | 'OPERATOR'

export interface Part {
  id: string
  partNumber: string
  replacementPartNumber: string
  description: string
  location: string
  model: string
  warehouseType: WarehouseType
  minStock: number
  maxStock: number
  openingStock: number
  openingStockDate?: string
  warehouseStock: number
  active: boolean
}

export type PartInput = Omit<Part, 'id' | 'warehouseStock'>
export type StockAdjustmentInput = Omit<StockAdjustment, 'id' | 'createdAt' | 'variance'>

export interface InboundGrUpdate {
  grStatus: GrStatus
  qtyActual: number
  qtyMatdoc: number
  matdocNumber: string
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

export interface AuthUser {
  id: string
  username: string
  email: string
  displayName: string
  role: UserRole
  mustChangePassword: boolean
  lastLoginAt: string
}

export interface AuthSessionData {
  token: string
  expiresAt: string
  user: AuthUser
  mustChangePassword: boolean
}

export interface AdminUser extends AuthUser {
  active: boolean
  failedAttempts: number
  lockedUntil: string
  passwordChangedAt: string
  createdAt: string
  updatedAt: string
}

export interface AdminSession {
  id: string
  userId: string
  username: string
  displayName: string
  purpose: 'APP' | 'PASSWORD_CHANGE'
  createdAt: string
  expiresAt: string
  lastSeenAt: string
  client: string
}

export interface AuthAuditEntry {
  id: string
  eventType: string
  userId: string
  username: string
  outcome: 'SUCCESS' | 'FAILED' | 'BLOCKED' | string
  details: string
  createdAt: string
}

export interface AdminOverview {
  metrics: {
    totalUsers: number
    activeUsers: number
    lockedUsers: number
    activeSessions: number
  }
  users: AdminUser[]
  sessions: AdminSession[]
  audit: AuthAuditEntry[]
}
