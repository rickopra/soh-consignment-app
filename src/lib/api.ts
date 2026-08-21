import type {
  AuthUser,
  InboundGrUpdate,
  InboundTransaction,
  OutboundTransaction,
  Part,
  PartInput,
  StockAdjustmentInput,
} from '../types'
import { supabaseConfigured } from './supabaseClient'
import * as supabaseApi from './supabaseApi'

export { ApiError } from './apiError'

export function apiIsConfigured() {
  return supabaseConfigured
}

export function login(identifier: string, password: string) {
  return supabaseApi.loginSupabase(identifier, password)
}

export function getSession(token: string) {
  void token
  return supabaseApi.getSessionSupabase()
}

export function changePassword(token: string, payload: { currentPassword?: string; newPassword: string; confirmPassword: string }) {
  void token
  return supabaseApi.changePasswordSupabase(payload)
}

export function logout(token: string) {
  void token
  return supabaseApi.logoutSupabase()
}

export function getBootstrap(token: string) {
  void token
  return supabaseApi.getBootstrapSupabase()
}

export function postOutbound(token: string, transaction: Omit<OutboundTransaction, 'id' | 'createdAt'>) {
  void token
  return supabaseApi.postOutboundSupabase(transaction)
}

export function updateOutboundSupply(token: string, transactionId: string, qtySupply: number) {
  void token
  return supabaseApi.updateOutboundSupplySupabase(transactionId, qtySupply)
}

export function postInbound(token: string, transaction: Omit<InboundTransaction, 'id' | 'createdAt'>) {
  void token
  return supabaseApi.postInboundSupabase(transaction)
}

export function updateInbound(token: string, transactionId: string, updates: InboundGrUpdate) {
  void token
  return supabaseApi.updateInboundGrSupabase(transactionId, updates)
}

export function postAdjustment(token: string, adjustment: StockAdjustmentInput) {
  void token
  return supabaseApi.postAdjustmentSupabase(adjustment)
}

export function createPart(token: string, part: PartInput) {
  void token
  return supabaseApi.createPartSupabase(part)
}

export function updatePart(token: string, id: string, part: PartInput) {
  void token
  return supabaseApi.updatePartSupabase(id, part)
}

export function deactivatePart(token: string, id: string) {
  void token
  return supabaseApi.deactivatePartSupabase(id)
}

export function getAdminOverview(token: string) {
  void token
  return supabaseApi.getAdminOverviewSupabase()
}

export function adminCreateUser(token: string, payload: { username: string; email: string; displayName: string; role: AuthUser['role'] }) {
  return supabaseApi.adminCreateUserSupabase(token, payload)
}

export function adminResetPassword(token: string, userId: string) {
  return supabaseApi.adminResetPasswordSupabase(token, userId)
}

export function adminSetActive(token: string, userId: string, active: boolean) {
  return supabaseApi.adminSetActiveSupabase(token, userId, active)
}

export function adminUnlockUser(token: string, userId: string) {
  return supabaseApi.adminUnlockUserSupabase(token, userId)
}

export function adminSetRole(token: string, userId: string, role: AuthUser['role']) {
  return supabaseApi.adminSetRoleSupabase(token, userId, role)
}

// Keep for backward compatibility - callers don't break if they import Part
export type { Part }
