import type { Handler } from '@netlify/functions'

function response(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
    body: JSON.stringify(body),
  }
}

function routeFromPath(path: string) {
  const segments = path.split('/').filter(Boolean)
  const apiIndex = segments.lastIndexOf('api')
  return apiIndex >= 0 ? segments.slice(apiIndex + 1).join('/') : segments.at(-1) ?? ''
}

function bearerToken(header?: string) {
  const match = String(header ?? '').match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? ''
}

function statusForCode(code?: string) {
  if (['SESSION_REQUIRED', 'SESSION_INVALID', 'SESSION_EXPIRED', 'INVALID_CREDENTIALS'].includes(code ?? '')) return 401
  if (['ADMIN_REQUIRED', 'ACCOUNT_INACTIVE', 'SELF_DEACTIVATION_BLOCKED', 'SELF_ROLE_CHANGE_BLOCKED', 'LAST_ADMIN_PROTECTED'].includes(code ?? '')) return 403
  if (code === 'ACCOUNT_LOCKED') return 423
  if (['INVALID_PAYLOAD', 'INVALID_USERNAME', 'INVALID_EMAIL', 'INVALID_DISPLAY_NAME', 'INVALID_ROLE', 'USER_EXISTS', 'PASSWORD_POLICY_FAILED', 'PASSWORD_CONFIRMATION_MISMATCH', 'PASSWORD_REUSED', 'CURRENT_PASSWORD_REQUIRED', 'CURRENT_PASSWORD_INVALID'].includes(code ?? '')) return 400
  if (code === 'USER_NOT_FOUND') return 404
  return 502
}

async function callGas(action: string, payload: unknown, token: string, client: string) {
  const gasUrl = process.env.GAS_WEB_APP_URL
  const secret = process.env.GAS_API_SECRET
  if (!gasUrl || !secret) throw new Error('Google Sheets backend belum dikonfigurasi.')

  const gasResponse = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ secret, action, payload, token, client }),
    redirect: 'follow',
  })
  const result = await gasResponse.json() as { error?: string; code?: string }
  if (!gasResponse.ok) throw new Error(`GAS request failed: ${gasResponse.status}`)
  return result
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {})
  const route = routeFromPath(event.path)

  try {
    if (route === 'health' && event.httpMethod === 'GET') return response(200, { status: 'ok', backend: Boolean(process.env.GAS_WEB_APP_URL) })
    if (route !== 'request' || event.httpMethod !== 'POST') return response(404, { error: 'Route tidak ditemukan.', code: 'ROUTE_NOT_FOUND' })
    if ((event.body?.length ?? 0) > 64_000) return response(413, { error: 'Payload terlalu besar.', code: 'PAYLOAD_TOO_LARGE' })

    const body = JSON.parse(event.body ?? '{}') as { action?: string; payload?: unknown }
    const action = String(body.action ?? '').toUpperCase()
    if (!action) return response(400, { error: 'Action wajib diisi.', code: 'UNKNOWN_ACTION' })
    const result = await callGas(action, body.payload ?? {}, bearerToken(event.headers.authorization), `${event.headers.host ?? 'netlify'} | ${event.headers['user-agent'] ?? ''}`.slice(0, 240))
    if (result.error) return response(statusForCode(result.code), result)
    return response(200, result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected API error'
    return response(502, { error: message, code: 'PROXY_ERROR' })
  }
}
