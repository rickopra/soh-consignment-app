import { create } from 'zustand'
import { apiIsConfigured, changePassword as changePasswordRequest, getSession, login as loginRequest, logout as logoutRequest } from '../lib/api'
import { supabaseConfigured } from '../lib/supabaseClient'
import type { AuthSessionData, AuthUser } from '../types'

type AuthStatus = 'initializing' | 'anonymous' | 'password_change' | 'authenticated'

interface StoredSession {
  token: string
  expiresAt: string
  user: AuthUser
  mustChangePassword: boolean
}

interface AuthStore {
  status: AuthStatus
  token: string
  expiresAt: string
  user: AuthUser | null
  initialize: () => Promise<void>
  login: (identifier: string, password: string) => Promise<void>
  changePassword: (payload: { currentPassword?: string; newPassword: string; confirmPassword: string }) => Promise<void>
  logout: () => Promise<void>
  clearSession: () => void
}

const storageKey = `soh-auth-session-v2:${supabaseConfigured ? 'supabase' : 'gas'}`

function readStoredSession(): StoredSession | null {
  try {
    const value = window.sessionStorage.getItem(storageKey)
    return value ? JSON.parse(value) as StoredSession : null
  } catch {
    return null
  }
}

function persistSession(session: AuthSessionData | null) {
  try {
    if (!session) window.sessionStorage.removeItem(storageKey)
    else window.sessionStorage.setItem(storageKey, JSON.stringify(session))
  } catch {
    return
  }
}

function authState(session: AuthSessionData) {
  return {
    status: session.mustChangePassword ? 'password_change' as const : 'authenticated' as const,
    token: session.token,
    expiresAt: session.expiresAt,
    user: session.user,
  }
}

const stored = readStoredSession()

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: stored ? 'initializing' : 'anonymous',
  token: stored?.token ?? '',
  expiresAt: stored?.expiresAt ?? '',
  user: stored?.user ?? null,
  initialize: async () => {
    const token = get().token
    if (!token || !apiIsConfigured()) {
      persistSession(null)
      set({ status: 'anonymous', token: '', expiresAt: '', user: null })
      return
    }
    try {
      const response = await getSession(token)
      const session: AuthSessionData = {
        token,
        expiresAt: response.data.expiresAt,
        user: response.data.user,
        mustChangePassword: response.data.mustChangePassword,
      }
      persistSession(session)
      set(authState(session))
    } catch {
      persistSession(null)
      set({ status: 'anonymous', token: '', expiresAt: '', user: null })
    }
  },
  login: async (identifier, password) => {
    const response = await loginRequest(identifier, password)
    persistSession(response.data)
    set(authState(response.data))
  },
  changePassword: async (payload) => {
    const token = get().token
    if (!token) throw new Error('Sesi tidak tersedia.')
    const response = await changePasswordRequest(token, payload)
    persistSession(response.data)
    set(authState(response.data))
  },
  logout: async () => {
    const token = get().token
    persistSession(null)
    set({ status: 'anonymous', token: '', expiresAt: '', user: null })
    if (token) await logoutRequest(token).catch(() => undefined)
  },
  clearSession: () => {
    persistSession(null)
    set({ status: 'anonymous', token: '', expiresAt: '', user: null })
  },
}))
