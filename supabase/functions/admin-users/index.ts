import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type UserRole = 'ADMIN' | 'OPERATOR'

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function temporaryPassword() {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?']
  const all = groups.join('')
  const random = crypto.getRandomValues(new Uint32Array(20))
  const characters = groups.map((group, index) => group[random[index] % group.length])
  for (let index = characters.length; index < 16; index += 1) characters.push(all[random[index] % all.length])
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const target = random[index + 4] % (index + 1)
    ;[characters[index], characters[target]] = [characters[target], characters[index]]
  }
  return characters.join('')
}

function publicUser(profile: Record<string, unknown>) {
  return {
    id: profile.id,
    username: profile.username,
    email: profile.contact_email || profile.auth_email || '',
    displayName: profile.display_name,
    role: profile.role,
    mustChangePassword: profile.must_change_password,
    lastLoginAt: profile.last_login_at || '',
    active: profile.active,
    failedAttempts: profile.failed_attempts || 0,
    lockedUntil: profile.locked_until || '',
    passwordChangedAt: profile.password_changed_at || '',
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405)

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anonKey || !serviceRoleKey) return response({ error: 'Function configuration is incomplete.' }, 500)

    const service = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const body = await request.json().catch(() => ({})) as { action?: string; payload?: Record<string, unknown> }
    const payload = body.payload || {}

    if (body.action === 'bootstrap') {
      const expectedSecret = Deno.env.get('ADMIN_BOOTSTRAP_SECRET') || ''
      const suppliedSecret = request.headers.get('x-bootstrap-key') || ''
      if (!expectedSecret || suppliedSecret !== expectedSecret) return response({ error: 'Bootstrap access denied.' }, 403)

      const username = String(payload.username || '').trim().toLowerCase()
      const displayName = String(payload.displayName || '').trim()
      const password = String(payload.password || '')
      if (!/^[a-z0-9._-]{3,40}$/.test(username)) return response({ error: 'Username format is invalid.' }, 400)
      if (!displayName || displayName.length > 80) return response({ error: 'Display name is invalid.' }, 400)
      if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) return response({ error: 'Password does not meet the minimum policy.' }, 400)

      const { data: existingProfiles, error: profilesError } = await service.from('profiles').select('*').limit(2)
      if (profilesError) return response({ error: profilesError.message }, 500)
      if ((existingProfiles || []).length > 1) return response({ error: 'Bootstrap is already complete.' }, 409)

      if (existingProfiles?.length === 1) {
        const existingProfile = existingProfiles[0]
        const { data: existingAuth, error: authLookupError } = await service.auth.admin.getUserById(existingProfile.id)
        if (authLookupError || !existingAuth.user || existingAuth.user.app_metadata?.soh_provisioned !== true) return response({ error: 'Existing account is not eligible for bootstrap repair.' }, 409)
        const { error: authUpdateError } = await service.auth.admin.updateUserById(existingProfile.id, {
          email: `${username}@users.noreply.github.com`,
          email_confirm: true,
          user_metadata: { username, display_name: displayName },
          app_metadata: { soh_provisioned: true, role: 'ADMIN' },
        })
        if (authUpdateError) return response({ error: authUpdateError.message }, 400)
        const { error: profileUpdateError } = await service.from('profiles').update({
          username,
          auth_email: `${username}@users.noreply.github.com`,
          display_name: displayName,
          role: 'ADMIN',
          active: true,
          must_change_password: true,
        }).eq('id', existingProfile.id)
        if (profileUpdateError) return response({ error: profileUpdateError.message }, 500)
        await service.from('auth_audit').insert({ event_type: 'INITIAL_ADMIN_REPAIRED', user_id: existingProfile.id, username, outcome: 'SUCCESS', details: 'Initial administrator identity repaired.' })
        return response({ success: true })
      }

      const { data: created, error: createError } = await service.auth.admin.createUser({
        email: `${username}@users.noreply.github.com`,
        password,
        email_confirm: true,
        user_metadata: { username, display_name: displayName },
        app_metadata: { soh_provisioned: true, role: 'ADMIN' },
      })
      if (createError || !created.user) return response({ error: createError?.message || 'Administrator could not be created.' }, 400)
      const { error: profileError } = await service.from('profiles').update({
        username,
        display_name: displayName,
        role: 'ADMIN',
        active: true,
        must_change_password: true,
      }).eq('id', created.user.id)
      if (profileError) return response({ error: profileError.message }, 500)
      await service.from('auth_audit').insert({ event_type: 'INITIAL_ADMIN_CREATED', user_id: created.user.id, username, outcome: 'SUCCESS', details: 'Initial administrator account provisioned.' })
      return response({ success: true })
    }

    const authorization = request.headers.get('Authorization') || ''
    if (!authorization.startsWith('Bearer ')) return response({ error: 'Authentication required.' }, 401)

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: authData, error: authError } = await userClient.auth.getUser()
    if (authError || !authData.user) return response({ error: 'Session is invalid.' }, 401)

    const { data: actor, error: actorError } = await userClient.from('profiles').select('*').eq('id', authData.user.id).single()
    if (actorError || !actor?.active || actor.must_change_password || actor.role !== 'ADMIN') return response({ error: 'Administrator access required.' }, 403)

    if (body.action === 'create') {
      const username = String(payload.username || '').trim().toLowerCase()
      const displayName = String(payload.displayName || '').trim()
      const contactEmail = String(payload.email || '').trim().toLowerCase()
      const role: UserRole = String(payload.role || 'OPERATOR').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'OPERATOR'
      if (!/^[a-z0-9._-]{3,40}$/.test(username)) return response({ error: 'Username format is invalid.' }, 400)
      if (!displayName || displayName.length > 80) return response({ error: 'Display name is invalid.' }, 400)
      if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return response({ error: 'Email format is invalid.' }, 400)

      const password = temporaryPassword()
      const authEmail = `${username}@users.noreply.github.com`
      const { data: created, error: createError } = await service.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: { username, display_name: displayName, contact_email: contactEmail },
        app_metadata: { soh_provisioned: true, role },
      })
      if (createError || !created.user) return response({ error: createError?.message || 'User could not be created.' }, 400)

      const { data: profile, error: profileError } = await service.from('profiles').update({
        username,
        display_name: displayName,
        contact_email: contactEmail || null,
        role,
        active: true,
        must_change_password: true,
      }).eq('id', created.user.id).select().single()
      if (profileError || !profile) {
        await service.auth.admin.deleteUser(created.user.id)
        return response({ error: profileError?.message || 'User profile could not be created.' }, 500)
      }

      await service.from('auth_audit').insert({ event_type: 'USER_CREATED', user_id: profile.id, username, outcome: 'SUCCESS', details: `Created by ${actor.username}.` })
      return response({ user: publicUser(profile), temporaryPassword: password })
    }

    if (body.action === 'reset-password') {
      const userId = String(payload.userId || '')
      const { data: target, error: targetError } = await service.from('profiles').select('*').eq('id', userId).single()
      if (targetError || !target) return response({ error: 'User not found.' }, 404)

      const password = temporaryPassword()
      const { error: resetError } = await service.auth.admin.updateUserById(userId, { password })
      if (resetError) return response({ error: resetError.message }, 400)

      const { data: profile, error: profileError } = await service.from('profiles').update({
        must_change_password: true,
        password_changed_at: null,
        failed_attempts: 0,
        locked_until: null,
      }).eq('id', userId).select().single()
      if (profileError || !profile) return response({ error: profileError?.message || 'User profile could not be updated.' }, 500)

      await service.from('app_sessions').update({ revoked_at: new Date().toISOString() }).eq('user_id', userId).is('revoked_at', null)
      await service.from('auth_audit').insert({ event_type: 'PASSWORD_RESET', user_id: userId, username: target.username, outcome: 'SUCCESS', details: `Reset by ${actor.username}.` })
      return response({ user: publicUser(profile), temporaryPassword: password })
    }

    return response({ error: 'Unknown action.' }, 400)
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'Unexpected server error.' }, 500)
  }
})
