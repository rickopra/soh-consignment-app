import { createClient } from '@supabase/supabase-js'

const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const publishableKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()
const backend = String(import.meta.env.VITE_DATA_BACKEND ?? '').trim().toLowerCase()

export const supabaseConfigured = backend !== 'gas' && Boolean(url && publishableKey)

export const supabase = supabaseConfigured
  ? createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: window.sessionStorage,
      },
    })
  : null

export const SUPABASE_AUTH_DOMAIN = 'users.noreply.github.com'

export function authEmailForIdentifier(identifier: string) {
  const normalized = identifier.trim().toLowerCase()
  return normalized.includes('@') ? normalized : `${normalized}@${SUPABASE_AUTH_DOMAIN}`
}
