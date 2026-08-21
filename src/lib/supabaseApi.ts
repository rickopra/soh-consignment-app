import type {
  AdminOverview,
  AdminUser,
  AppData,
  AuthSessionData,
  AuthUser,
  InboundTransaction,
  OutboundTransaction,
  StockAdjustment,
  StockAdjustmentInput,
  UserRole,
} from '../types'
import { ApiError } from './apiError'
import { authEmailForIdentifier, supabase } from './supabaseClient'

type ProfileRow = {
  id: string
  username: string
  auth_email: string
  contact_email: string | null
  display_name: string
  role: UserRole
  active: boolean
  must_change_password: boolean
  failed_attempts: number
  locked_until: string | null
  last_login_at: string | null
  password_changed_at: string | null
  created_at: string
  updated_at: string
}

function clientDescription() {
  if (typeof window === 'undefined') return 'web'
  return `${window.location.hostname} | ${navigator.userAgent}`.slice(0, 240)
}

function requireClient() {
  if (!supabase) throw new ApiError('Supabase tidak terkonfigurasi.', 'BACKEND_NOT_CONFIGURED')
  return supabase
}

function throwDatabaseError(error: { message?: string; code?: string } | null, fallback: string, code?: string, status?: number): never | void {
  if (error) throw new ApiError(error.message || fallback, code || error.code || 'REQUEST_FAILED', status)
}

function toAuthUser(profile: ProfileRow): AuthUser {
  return {
    id: profile.id,
    username: profile.username,
    email: profile.contact_email || '',
    displayName: profile.display_name,
    role: profile.role,
    mustChangePassword: profile.must_change_password,
    lastLoginAt: profile.last_login_at || '',
  }
}

function toAdminUser(profile: ProfileRow): AdminUser {
  return {
    ...toAuthUser(profile),
    active: profile.active,
    failedAttempts: profile.failed_attempts,
    lockedUntil: profile.locked_until || '',
    passwordChangedAt: profile.password_changed_at || '',
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  }
}

async function getCurrentSession() {
  const client = requireClient()
  const { data, error } = await client.auth.getSession()
  throwDatabaseError(error, 'Sesi tidak dapat dibaca.')
  if (!data.session) throw new ApiError('Sesi tidak tersedia.', 'SESSION_REQUIRED')
  return data.session
}

async function getProfile(userId: string) {
  const client = requireClient()
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).single()
  throwDatabaseError(error, 'Profil akun tidak dapat dibaca.', 'PROFILE_FETCH_FAILED', undefined)
  if (!data) throw new ApiError('Profil akun tidak ditemukan.', 'PROFILE_NOT_FOUND')
  return data as ProfileRow
}

async function beginSession() {
  const client = requireClient()
  const result = await client.rpc('start_app_session', { p_client: clientDescription() })
  if (result.error) throwDatabaseError(result.error, 'Sesi aplikasi tidak dapat dibuat.')
}

async function refreshSessionAudit() {
  const client = requireClient()
  await client.rpc('touch_app_session')
}

function toSessionData(session: { access_token: string; expires_at?: number | null }, profile: ProfileRow): AuthSessionData {
  return {
    token: session.access_token,
    expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : new Date(Date.now() + 3_600_000).toISOString(),
    user: toAuthUser(profile),
    mustChangePassword: profile.must_change_password,
  }
}

export async function loginSupabase(identifier: string, password: string) {
  const client = requireClient()
  const { data, error } = await client.auth.signInWithPassword({ email: authEmailForIdentifier(identifier), password })
  if (error) {
    const invalid = error.message.toLowerCase().includes('invalid login credentials')
    throw new ApiError(invalid ? 'Kredensial tidak valid.' : error.message, invalid ? 'INVALID_CREDENTIALS' : 'LOGIN_FAILED', error.status)
  }
  if (!data.session || !data.user) throw new ApiError('Sesi login tidak valid.', 'SESSION_INVALID')

  const profile = await getProfile(data.user.id)
  if (!profile.active) {
    await client.auth.signOut()
    throw new ApiError('Akun telah dinonaktifkan.', 'ACCOUNT_INACTIVE')
  }
  await beginSession()
  return { data: toSessionData(data.session, profile) }
}

export async function getSessionSupabase() {
  const session = await getCurrentSession()
  const profile = await getProfile(session.user.id)
  if (!profile.active) {
    await requireClient().auth.signOut()
    throw new ApiError('Akun telah dinonaktifkan.', 'ACCOUNT_INACTIVE')
  }
  await refreshSessionAudit()
  return { data: { user: toAuthUser(profile), mustChangePassword: profile.must_change_password, expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : '' } }
}

export async function changePasswordSupabase(payload: { currentPassword?: string; newPassword: string; confirmPassword: string }) {
  const client = requireClient()
  if (payload.newPassword !== payload.confirmPassword) throw new ApiError('Konfirmasi password tidak sama.', 'PASSWORD_MISMATCH')
  if (payload.newPassword.length < 12) throw new ApiError('Password minimal 12 karakter.', 'PASSWORD_POLICY')

  const session = await getCurrentSession()
  const profile = await getProfile(session.user.id)
  if (payload.currentPassword) {
    const verification = await client.auth.signInWithPassword({ email: profile.auth_email, password: payload.currentPassword })
    if (verification.error) throw new ApiError('Password saat ini tidak valid.', 'CURRENT_PASSWORD_INVALID')
  }

  const { error } = await client.auth.updateUser({ password: payload.newPassword })
  throwDatabaseError(error, 'Password tidak dapat diubah.')
  const { error: completeError } = await client.rpc('complete_first_login')
  throwDatabaseError(completeError, 'Status login pertama tidak dapat diselesaikan.')
  const refreshed = await getCurrentSession()
  const refreshedProfile = await getProfile(refreshed.user.id)
  return { data: toSessionData(refreshed, refreshedProfile) }
}

export async function logoutSupabase() {
  const client = requireClient()
  await client.rpc('end_app_session')
  await client.auth.signOut()
  return { data: { success: true } }
}

function mapPart(row: Record<string, any>) {
  return {
    id: row.id,
    partNumber: row.part_number,
    replacementPartNumber: row.replacement_part_number,
    description: row.description,
    location: row.location,
    model: row.model || '',
    warehouseType: row.warehouse_type,
    minStock: row.min_stock,
    maxStock: row.max_stock,
    openingStock: row.opening_stock,
    openingStockDate: row.opening_stock_date || undefined,
    warehouseStock: row.warehouse_stock,
    active: row.active,
  }
}

function mapOutbound(row: Record<string, any>): OutboundTransaction {
  return {
    id: row.id,
    requestDate: row.request_date,
    requester: row.requester,
    partNumber: row.part_number,
    qtyRequest: row.qty_request,
    qtySupply: row.qty_supply,
    warehouseType: row.warehouse_type,
    documents: row.documents || { pr: '', po: '', so: '', dn: '', invoice: '' },
    notes: row.notes || '',
    createdBy: row.created_by_name || '',
    createdAt: row.created_at,
  }
}

function mapInbound(row: Record<string, any>): InboundTransaction {
  return {
    id: row.id,
    receivedDate: row.received_date,
    partNumber: row.part_number,
    qtyMatdoc: row.qty_matdoc,
    qtyActual: row.qty_actual,
    grStatus: row.gr_status,
    matdocNumber: row.matdoc_number || '',
    spbNumber: row.spb_number || '',
    poNumber: row.po_number || '',
    invoiceOrTo: row.invoice_or_to || '',
    source: row.source || '',
    notes: row.notes || '',
    createdBy: row.created_by_name || '',
    createdAt: row.created_at,
  }
}

function mapAdjustment(row: Record<string, any>): StockAdjustment {
  return {
    id: row.id,
    adjustmentDate: row.adjustment_date,
    partNumber: row.part_number,
    previousBookStock: row.previous_book_stock,
    physicalCount: row.physical_count,
    variance: row.variance,
    reason: row.reason || '',
    createdBy: row.created_by_name || '',
    createdAt: row.created_at,
  }
}

export async function getBootstrapSupabase() {
  const client = requireClient()
  const session = await getCurrentSession()
  const profile = await getProfile(session.user.id)
  const [parts, outbound, inbound, adjustments] = await Promise.all([
    client.from('parts').select('*').order('part_number'),
    client.from('outbound_transactions').select('*').order('request_date', { ascending: false }),
    client.from('inbound_transactions').select('*').order('received_date', { ascending: false }),
    client.from('stock_adjustments').select('*').order('adjustment_date', { ascending: false }),
  ])
  throwDatabaseError(parts.error, 'Data master part tidak dapat dibaca.')
  throwDatabaseError(outbound.error, 'Data outbound tidak dapat dibaca.')
  throwDatabaseError(inbound.error, 'Data inbound tidak dapat dibaca.')
  throwDatabaseError(adjustments.error, 'Data penyesuaian tidak dapat dibaca.')

  const data: AppData = {
    parts: (parts.data || []).map(mapPart),
    outbound: (outbound.data || []).map(mapOutbound),
    inbound: (inbound.data || []).map(mapInbound),
    adjustments: (adjustments.data || []).map(mapAdjustment),
  }
  return { data, user: toAuthUser(profile) }
}

export async function postOutboundSupabase(transaction: Omit<OutboundTransaction, 'id' | 'createdAt'>) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  if (!userData.user) throw new ApiError('Sesi tidak tersedia.', 'SESSION_REQUIRED')
  const { data, error } = await client.from('outbound_transactions').insert({
    request_date: transaction.requestDate,
    requester: transaction.requester,
    part_number: transaction.partNumber,
    qty_request: transaction.qtyRequest,
    qty_supply: transaction.qtySupply,
    warehouse_type: transaction.warehouseType,
    documents: transaction.documents,
    notes: transaction.notes,
    created_by_name: transaction.createdBy || userData.user.email?.split('@')[0] || '',
  }).select().single()
  throwDatabaseError(error, 'Outbound tidak dapat disimpan.')
  if (!data) throw new ApiError('Outbound tidak dapat disimpan.', 'SAVE_FAILED')
  return { data: mapOutbound(data) }
}

export async function updateOutboundSupplySupabase(transactionId: string, qtySupply: number) {
  const client = requireClient()
  const { data, error } = await client.rpc('update_outbound_supply', {
    p_transaction_id: transactionId,
    p_qty_supply: qtySupply,
  })
  throwDatabaseError(error, 'Jumlah supply tidak dapat diperbarui.')
  if (!data) throw new ApiError('Jumlah supply tidak dapat diperbarui.', 'UPDATE_FAILED')
  return { data: mapOutbound(data as Record<string, any>) }
}

export async function postInboundSupabase(transaction: Omit<InboundTransaction, 'id' | 'createdAt'>) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  if (!userData.user) throw new ApiError('Sesi tidak tersedia.', 'SESSION_REQUIRED')
  const { data, error } = await client.from('inbound_transactions').insert({
    received_date: transaction.receivedDate,
    part_number: transaction.partNumber,
    qty_matdoc: transaction.qtyMatdoc,
    qty_actual: transaction.qtyActual,
    gr_status: transaction.grStatus,
    matdoc_number: transaction.matdocNumber,
    spb_number: transaction.spbNumber,
    po_number: transaction.poNumber,
    invoice_or_to: transaction.invoiceOrTo,
    source: transaction.source,
    notes: transaction.notes,
    created_by_name: transaction.createdBy || userData.user.email?.split('@')[0] || '',
  }).select().single()
  throwDatabaseError(error, 'Inbound tidak dapat disimpan.')
  if (!data) throw new ApiError('Inbound tidak dapat disimpan.', 'SAVE_FAILED')
  return { data: mapInbound(data) }
}

export async function postAdjustmentSupabase(adjustment: StockAdjustmentInput) {
  const client = requireClient()
  const { data: userData } = await client.auth.getUser()
  if (!userData.user) throw new ApiError('Sesi tidak tersedia.', 'SESSION_REQUIRED')
  const { data, error } = await client.from('stock_adjustments').insert({
    adjustment_date: adjustment.adjustmentDate,
    part_number: adjustment.partNumber,
    previous_book_stock: adjustment.previousBookStock,
    physical_count: adjustment.physicalCount,
    reason: adjustment.reason,
    created_by_name: adjustment.createdBy || userData.user.email?.split('@')[0] || '',
  }).select().single()
  throwDatabaseError(error, 'Penyesuaian tidak dapat disimpan.')
  if (!data) throw new ApiError('Penyesuaian tidak dapat disimpan.', 'SAVE_FAILED')
  return { data: mapAdjustment(data) }
}

export async function getAdminOverviewSupabase() {
  const client = requireClient()
  await getCurrentSession()
  const [profiles, sessions, audit] = await Promise.all([
    client.from('profiles').select('*').order('created_at'),
    client.from('app_sessions').select('*').order('last_seen_at', { ascending: false }),
    client.from('auth_audit').select('*').order('created_at', { ascending: false }).limit(100),
  ])
  throwDatabaseError(profiles.error, 'Data pengguna tidak dapat dibaca.')
  throwDatabaseError(sessions.error, 'Data sesi tidak dapat dibaca.')
  throwDatabaseError(audit.error, 'Audit log tidak dapat dibaca.')

  const profileRows = (profiles.data || []) as ProfileRow[]
  const users = profileRows.map(toAdminUser)
  const userMap = new Map(profileRows.map(profile => [profile.id, profile]))
  const activeSessions = (sessions.data || []).filter(session => !session.revoked_at && new Date(session.expires_at).getTime() > Date.now())
  const overview: AdminOverview = {
    metrics: {
      totalUsers: users.length,
      activeUsers: users.filter(user => user.active).length,
      lockedUsers: users.filter(user => user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()).length,
      activeSessions: activeSessions.length,
    },
    users,
    sessions: (sessions.data || []).map(session => {
      const profile = userMap.get(session.user_id)
      return { id: session.id, userId: session.user_id, username: profile?.username || '', displayName: profile?.display_name || '', purpose: session.purpose, createdAt: session.created_at, expiresAt: session.expires_at, lastSeenAt: session.last_seen_at, client: session.client }
    }),
    audit: (audit.data || []).map(entry => ({ id: entry.id, eventType: entry.event_type, userId: entry.user_id || '', username: entry.username, outcome: entry.outcome, details: entry.details, createdAt: entry.created_at })),
  }
  return { data: overview }
}

async function invokeAdminFunction(body: Record<string, unknown>) {
  const client = requireClient()
  const { data, error } = await client.functions.invoke('admin-users', { body })
  throwDatabaseError(error, 'Layanan admin belum tersedia.')
  if (!data?.user) throw new ApiError('Respons admin tidak valid.', 'ADMIN_RESPONSE_INVALID')
  return { data }
}

export function adminCreateUserSupabase(token: string, payload: { username: string; email: string; displayName: string; role: UserRole }) {
  void token
  return invokeAdminFunction({ action: 'create', payload })
}

export function adminResetPasswordSupabase(token: string, userId: string) {
  void token
  return invokeAdminFunction({ action: 'reset-password', payload: { userId } })
}

async function callAdminRpc<T>(name: string, args: Record<string, unknown>) {
  const client = requireClient()
  const { data, error } = await client.rpc(name, args)
  throwDatabaseError(error, 'Perubahan admin tidak dapat disimpan.')
  if (!data) throw new ApiError('Respons admin tidak valid.', 'ADMIN_RESPONSE_INVALID')
  return { data: toAdminUser(data as ProfileRow) as T }
}

export function adminSetActiveSupabase(token: string, userId: string, active: boolean) {
  void token
  return callAdminRpc<AdminUser>('admin_set_active', { p_user_id: userId, p_active: active })
}

export function adminUnlockUserSupabase(token: string, userId: string) {
  void token
  return callAdminRpc<AdminUser>('admin_unlock_user', { p_user_id: userId })
}

export function adminSetRoleSupabase(token: string, userId: string, role: UserRole) {
  void token
  return callAdminRpc<AdminUser>('admin_set_role', { p_user_id: userId, p_role: role })
}


export async function createPartSupabase(part: Omit<import('../types').Part, 'id' | 'warehouseStock'>) {
  const client = requireClient()
  const { data, error } = await client.rpc('create_part', {
    p_part_number: part.partNumber,
    p_model: part.model || '',
    p_replacement_part_number: part.replacementPartNumber || '',
    p_description: part.description,
    p_location: part.location,
    p_warehouse_type: part.warehouseType,
    p_min_stock: part.minStock,
    p_max_stock: part.maxStock,
    p_opening_stock: part.openingStock,
    p_opening_stock_date: part.openingStockDate || null,
  })
  throwDatabaseError(error, 'Part tidak dapat dibuat.')
  if (!data) throw new ApiError('Part tidak dapat dibuat.', 'SAVE_FAILED')
  return { data: mapPart(data as Record<string, any>) }
}

export async function updatePartSupabase(id: string, part: Omit<import('../types').Part, 'id' | 'warehouseStock'>) {
  const client = requireClient()
  const { data, error } = await client.rpc('update_part', {
    p_id: id,
    p_part_number: part.partNumber,
    p_model: part.model || '',
    p_replacement_part_number: part.replacementPartNumber || '',
    p_description: part.description,
    p_location: part.location,
    p_warehouse_type: part.warehouseType,
    p_min_stock: part.minStock,
    p_max_stock: part.maxStock,
    p_opening_stock: part.openingStock,
    p_opening_stock_date: part.openingStockDate || null,
  })
  throwDatabaseError(error, 'Part tidak dapat diperbarui.')
  if (!data) throw new ApiError('Part tidak dapat diperbarui.', 'UPDATE_FAILED')
  return { data: mapPart(data as Record<string, any>) }
}

export async function deactivatePartSupabase(id: string) {
  const client = requireClient()
  const { data, error } = await client.rpc('deactivate_part', { p_id: id })
  throwDatabaseError(error, 'Part tidak dapat dihapus.')
  if (!data) throw new ApiError('Part tidak dapat dihapus.', 'UPDATE_FAILED')
  return { data: mapPart(data as Record<string, any>) }
}

export async function updateInboundGrSupabase(transactionId: string, updates: import('../types').InboundGrUpdate) {
  const client = requireClient()
  const { data, error } = await client.rpc('update_inbound_gr', {
    p_transaction_id: transactionId,
    p_gr_status: updates.grStatus,
    p_qty_actual: updates.qtyActual ?? null,
    p_qty_matdoc: updates.qtyMatdoc ?? null,
    p_matdoc_number: updates.matdocNumber ?? null,
  })
  throwDatabaseError(error, 'Status penerimaan tidak dapat diperbarui.')
  if (!data) throw new ApiError('Status penerimaan tidak dapat diperbarui.', 'UPDATE_FAILED')
  return { data: mapInbound(data as Record<string, any>) }
}
