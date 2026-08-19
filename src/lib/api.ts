import type {
  AdminOverview,
  AdminUser,
  AppData,
  AuthSessionData,
  AuthUser,
  InboundTransaction,
  OutboundTransaction,
  StockAdjustment,
} from '../types'
import { ApiError } from './apiError'
import { supabaseConfigured } from './supabaseClient'
import * as supabaseApi from './supabaseApi'

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const gasBridgeUrl = String(import.meta.env.VITE_GAS_BRIDGE_URL ?? '').trim()

export { ApiError } from './apiError'

let bridgeFrame: HTMLIFrameElement | null = null
let bridgeWindow: Window | null = null
let bridgeOrigin = ''
let bridgeNonce = ''
let bridgeReady: Promise<void> | null = null
const bridgePending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: number }>()

function clientDescription() {
  return `${window.location.hostname} | ${navigator.userAgent}`.slice(0, 240)
}

function bridgeUrl(nonce: string) {
  if (!gasBridgeUrl) return ''
  const url = new URL(gasBridgeUrl)
  url.searchParams.set('bridge', '1')
  url.searchParams.set('nonce', nonce)
  return url.toString()
}

function requestId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isTrustedBridgeOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname
    return hostname === 'script.google.com' || /(^|[.-])script\.googleusercontent\.com$/.test(hostname)
  } catch {
    return false
  }
}

function ensureBridge() {
  if (bridgeReady) return bridgeReady
  bridgeReady = new Promise<void>((resolve, reject) => {
    const nonce = requestId()
    const iframe = document.createElement('iframe')
    iframe.title = 'SOH backend bridge'
    iframe.setAttribute('aria-hidden', 'true')
    iframe.tabIndex = -1
    iframe.style.position = 'fixed'
    iframe.style.width = '1px'
    iframe.style.height = '1px'
    iframe.style.border = '0'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'
    iframe.src = bridgeUrl(nonce)
    bridgeFrame = iframe

    const fail = (error: ApiError) => {
      window.removeEventListener('message', onMessage)
      iframe.remove()
      bridgeFrame = null
      bridgeWindow = null
      bridgeOrigin = ''
      bridgeNonce = ''
      bridgeReady = null
      reject(error)
    }
    const timeout = window.setTimeout(() => fail(new ApiError('Backend tidak merespons.', 'BRIDGE_TIMEOUT')), 20000)
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SOH_BRIDGE_READY') {
        if (event.data.nonce !== nonce || !isTrustedBridgeOrigin(event.origin) || !event.source) return
        bridgeWindow = event.source as Window
        bridgeOrigin = event.origin
        bridgeNonce = nonce
        window.clearTimeout(timeout)
        resolve()
        return
      }
      if (event.source !== bridgeWindow || event.origin !== bridgeOrigin || event.data?.nonce !== bridgeNonce) return
      if (event.data?.type !== 'SOH_BRIDGE_RESPONSE') return
      const pending = bridgePending.get(event.data.id)
      if (!pending) return
      bridgePending.delete(event.data.id)
      window.clearTimeout(pending.timer)
      const result = event.data.result as { error?: string; code?: string }
      if (result?.error) pending.reject(new ApiError(result.error, result.code ?? 'REQUEST_FAILED'))
      else pending.resolve(result)
    }
    window.addEventListener('message', onMessage)
    iframe.addEventListener('error', () => {
      window.clearTimeout(timeout)
      fail(new ApiError('Backend bridge gagal dimuat.', 'BRIDGE_LOAD_FAILED'))
    }, { once: true })
    document.body.appendChild(iframe)
  })
  return bridgeReady
}

async function requestViaBridge<T>(action: string, payload: unknown, token?: string) {
  await ensureBridge()
  if (!bridgeFrame || !bridgeWindow || !bridgeOrigin || !bridgeNonce) throw new ApiError('Backend bridge belum siap.', 'BRIDGE_NOT_READY')
  const id = requestId()
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      bridgePending.delete(id)
      reject(new ApiError('Request backend timeout.', 'REQUEST_TIMEOUT'))
    }, 30000)
    bridgePending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer })
    bridgeWindow?.postMessage({
      type: 'SOH_BRIDGE_REQUEST',
      id,
      nonce: bridgeNonce,
      request: { action, payload, token, client: clientDescription() },
    }, bridgeOrigin)
  })
}

async function requestViaProxy<T>(action: string, payload: unknown, token?: string) {
  const response = await fetch(`${apiBase}/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, payload }),
  })
  const result = await response.json().catch(() => ({})) as { error?: string; code?: string }
  if (!response.ok || result.error) throw new ApiError(result.error ?? `API request failed: ${response.status}`, result.code ?? 'REQUEST_FAILED', response.status)
  return result as T
}

async function requestAction<T>(action: string, payload: unknown = {}, token?: string) {
  if (gasBridgeUrl) return requestViaBridge<T>(action, payload, token)
  if (apiBase) return requestViaProxy<T>(action, payload, token)
  throw new ApiError('Backend belum dikonfigurasi.', 'BACKEND_NOT_CONFIGURED')
}

export function apiIsConfigured() {
  return supabaseConfigured || Boolean(gasBridgeUrl || apiBase)
}

export function login(identifier: string, password: string) {
  if (supabaseConfigured) return supabaseApi.loginSupabase(identifier, password)
  return requestAction<{ data: AuthSessionData }>('LOGIN', { identifier, password })
}

export function getSession(token: string) {
  if (supabaseConfigured) return supabaseApi.getSessionSupabase()
  return requestAction<{ data: { user: AuthUser; mustChangePassword: boolean; expiresAt: string } }>('SESSION', {}, token)
}

export function changePassword(token: string, payload: { currentPassword?: string; newPassword: string; confirmPassword: string }) {
  if (supabaseConfigured) return supabaseApi.changePasswordSupabase(payload)
  return requestAction<{ data: AuthSessionData }>('CHANGE_PASSWORD', payload, token)
}

export function logout(token: string) {
  if (supabaseConfigured) return supabaseApi.logoutSupabase()
  return requestAction<{ data: { success: boolean } }>('LOGOUT', {}, token)
}

export function getBootstrap(token: string) {
  if (supabaseConfigured) return supabaseApi.getBootstrapSupabase()
  return requestAction<{ data: AppData; user: AuthUser }>('BOOTSTRAP', {}, token)
}

export function postOutbound(token: string, transaction: Omit<OutboundTransaction, 'id' | 'createdAt'>) {
  if (supabaseConfigured) return supabaseApi.postOutboundSupabase(transaction)
  return requestAction<{ data: OutboundTransaction }>('OUTBOUND', transaction, token)
}

export function postInbound(token: string, transaction: Omit<InboundTransaction, 'id' | 'createdAt'>) {
  if (supabaseConfigured) return supabaseApi.postInboundSupabase(transaction)
  return requestAction<{ data: InboundTransaction }>('INBOUND', transaction, token)
}

export function postAdjustment(token: string, adjustment: Omit<StockAdjustment, 'id' | 'createdAt'>) {
  if (supabaseConfigured) return supabaseApi.postAdjustmentSupabase(adjustment)
  return requestAction<{ data: StockAdjustment }>('ADJUSTMENT', adjustment, token)
}

export function getAdminOverview(token: string) {
  if (supabaseConfigured) return supabaseApi.getAdminOverviewSupabase()
  return requestAction<{ data: AdminOverview }>('ADMIN_OVERVIEW', {}, token)
}

export function adminCreateUser(token: string, payload: { username: string; email: string; displayName: string; role: AuthUser['role'] }) {
  if (supabaseConfigured) return supabaseApi.adminCreateUserSupabase(token, payload)
  return requestAction<{ data: { user: AdminUser; temporaryPassword: string } }>('ADMIN_CREATE_USER', payload, token)
}

export function adminResetPassword(token: string, userId: string) {
  if (supabaseConfigured) return supabaseApi.adminResetPasswordSupabase(token, userId)
  return requestAction<{ data: { user: AdminUser; temporaryPassword: string } }>('ADMIN_RESET_PASSWORD', { userId }, token)
}

export function adminSetActive(token: string, userId: string, active: boolean) {
  if (supabaseConfigured) return supabaseApi.adminSetActiveSupabase(token, userId, active)
  return requestAction<{ data: { user: AdminUser } }>('ADMIN_SET_ACTIVE', { userId, active }, token)
}

export function adminUnlockUser(token: string, userId: string) {
  if (supabaseConfigured) return supabaseApi.adminUnlockUserSupabase(token, userId)
  return requestAction<{ data: { user: AdminUser } }>('ADMIN_UNLOCK_USER', { userId }, token)
}

export function adminSetRole(token: string, userId: string, role: AuthUser['role']) {
  if (supabaseConfigured) return supabaseApi.adminSetRoleSupabase(token, userId, role)
  return requestAction<{ data: { user: AdminUser } }>('ADMIN_SET_ROLE', { userId, role }, token)
}
