interface Env {
  GAS_WEB_APP_URL: string
  GAS_API_SECRET: string
}

type Context = {
  request: Request
  env: Env
  params: { path?: string | string[] }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function routeName(path?: string | string[]) {
  return Array.isArray(path) ? path.join('/') : path ?? ''
}

async function callGas(env: Env, action?: string, payload?: unknown) {
  if (!env.GAS_WEB_APP_URL || !env.GAS_API_SECRET) {
    throw new Error('Google Sheets backend belum dikonfigurasi.')
  }

  const response = action
    ? await fetch(env.GAS_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ secret: env.GAS_API_SECRET, action, payload }),
        redirect: 'follow',
      })
    : await fetch(`${env.GAS_WEB_APP_URL}?secret=${encodeURIComponent(env.GAS_API_SECRET)}`, {
        redirect: 'follow',
      })

  const result = await response.json() as { error?: string }
  if (!response.ok || result.error) {
    throw new Error(result.error ?? `GAS request failed with ${response.status}`)
  }
  return result
}

export async function onRequest({ request, env, params }: Context) {
  const route = routeName(params.path)

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'GET, POST, OPTIONS' } })
  }

  try {
    if (route === 'health' && request.method === 'GET') {
      return json({ status: 'ok', backend: Boolean(env.GAS_WEB_APP_URL) })
    }
    if (route === 'bootstrap' && request.method === 'GET') {
      return json(await callGas(env))
    }

    const actions: Record<string, string> = {
      outbound: 'OUTBOUND',
      inbound: 'INBOUND',
      adjustment: 'ADJUSTMENT',
    }
    if (request.method === 'POST' && actions[route]) {
      const contentLength = Number(request.headers.get('Content-Length') ?? 0)
      if (contentLength > 64_000) return json({ message: 'Payload terlalu besar.' }, 413)
      const payload = await request.json()
      return json(await callGas(env, actions[route], payload))
    }

    return json({ message: 'Route tidak ditemukan.' }, 404)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected API error'
    return json({ message }, 502)
  }
}
