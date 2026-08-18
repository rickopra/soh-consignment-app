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

async function callGas(action?: string, payload?: unknown) {
  const gasUrl = process.env.GAS_WEB_APP_URL
  const secret = process.env.GAS_API_SECRET
  if (!gasUrl || !secret) throw new Error('Google Sheets backend belum dikonfigurasi.')

  const gasResponse = action
    ? await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ secret, action, payload }),
        redirect: 'follow',
      })
    : await fetch(`${gasUrl}?secret=${encodeURIComponent(secret)}`, { redirect: 'follow' })

  const result = await gasResponse.json() as { error?: string }
  if (!gasResponse.ok || result.error) throw new Error(result.error ?? `GAS request failed: ${gasResponse.status}`)
  return result
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {})
  const route = routeFromPath(event.path)

  try {
    if (route === 'health' && event.httpMethod === 'GET') {
      return response(200, { status: 'ok', backend: Boolean(process.env.GAS_WEB_APP_URL) })
    }
    if (route === 'bootstrap' && event.httpMethod === 'GET') {
      return response(200, await callGas())
    }

    const actions: Record<string, string> = {
      outbound: 'OUTBOUND',
      inbound: 'INBOUND',
      adjustment: 'ADJUSTMENT',
    }
    if (event.httpMethod === 'POST' && actions[route]) {
      if ((event.body?.length ?? 0) > 64_000) return response(413, { message: 'Payload terlalu besar.' })
      const payload = JSON.parse(event.body ?? '{}')
      return response(200, await callGas(actions[route], payload))
    }

    return response(404, { message: 'Route tidak ditemukan.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected API error'
    return response(502, { message })
  }
}
