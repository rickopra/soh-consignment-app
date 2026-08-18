function adminOverview_(token) {
  const context = requireAdmin_(token)
  const users = authRecords_(context.spreadsheet, SHEETS.USERS).map((row) => adminUser_(row.record))
  const now = Date.now()
  const sessions = authRecords_(context.spreadsheet, SHEETS.AUTH_SESSIONS)
    .filter((row) => !row.record.revokedAt && toDate_(row.record.expiresAt) && toDate_(row.record.expiresAt).getTime() > now)
    .map((row) => {
      const userRow = findUserRowById_(context.spreadsheet, row.record.userId)
      return {
        id: row.record.id,
        userId: row.record.userId,
        username: userRow ? userRow.record.username : '',
        displayName: userRow ? userRow.record.displayName : 'Unknown user',
        purpose: row.record.purpose,
        createdAt: isoValue_(row.record.createdAt),
        expiresAt: isoValue_(row.record.expiresAt),
        lastSeenAt: isoValue_(row.record.lastSeenAt),
        client: sanitizeText_(row.record.client, 240),
      }
    })
  const audit = authRecords_(context.spreadsheet, SHEETS.AUTH_AUDIT)
    .slice(-AUTH_SETTINGS.MAX_AUDIT_ROWS)
    .reverse()
    .map((row) => ({
      id: row.record.id,
      eventType: row.record.eventType,
      userId: row.record.userId,
      username: row.record.username,
      outcome: row.record.outcome,
      details: row.record.details,
      createdAt: isoValue_(row.record.createdAt),
    }))
  const lockedUsers = users.filter((user) => user.lockedUntil && new Date(user.lockedUntil).getTime() > now).length
  return {
    data: {
      metrics: {
        totalUsers: users.length,
        activeUsers: users.filter((user) => user.active).length,
        lockedUsers,
        activeSessions: sessions.length,
      },
      users,
      sessions,
      audit,
    },
  }
}

function adminCreateUser_(token, payload) {
  const context = requireAdmin_(token)
  const temporaryPassword = generateTemporaryPassword_()
  const user = createUser_(context.spreadsheet, {
    username: payload.username,
    email: payload.email,
    displayName: payload.displayName,
    role: payload.role,
    password: temporaryPassword,
  })
  auditAuth_(context.spreadsheet, 'USER_CREATED', context.user, 'SUCCESS', `Created user ${user.username} with role ${user.role}.`)
  return { data: { user: adminUser_(user), temporaryPassword } }
}

function adminResetPassword_(token, payload) {
  const context = requireAdmin_(token)
  const target = requireTargetUser_(context.spreadsheet, payload.userId)
  const temporaryPassword = generateTemporaryPassword_()
  const salt = randomToken_(24)
  const now = new Date().toISOString()
  const user = updateAuthRow_(context.spreadsheet, SHEETS.USERS, target.rowNumber, {
    passwordHash: derivePasswordHash_(temporaryPassword, salt, AUTH_SETTINGS.PASSWORD_ITERATIONS),
    passwordSalt: salt,
    passwordIterations: AUTH_SETTINGS.PASSWORD_ITERATIONS,
    mustChangePassword: true,
    failedAttempts: 0,
    lockedUntil: '',
    passwordChangedAt: '',
    updatedAt: now,
  })
  revokeUserSessions_(context.spreadsheet, user.id)
  auditAuth_(context.spreadsheet, 'PASSWORD_RESET', context.user, 'SUCCESS', `Reset password for ${user.username}.`)
  return { data: { user: adminUser_(user), temporaryPassword } }
}

function adminSetActive_(token, payload) {
  const context = requireAdmin_(token)
  const target = requireTargetUser_(context.spreadsheet, payload.userId)
  const active = toBoolean_(payload.active)
  if (target.record.id === context.user.id && !active) throw requestError_('Akun yang sedang dipakai tidak dapat dinonaktifkan.', 'SELF_DEACTIVATION_BLOCKED')
  if (!active && target.record.role === AUTH_ROLES.ADMIN) ensureAnotherActiveAdmin_(context.spreadsheet, target.record.id)
  const user = updateAuthRow_(context.spreadsheet, SHEETS.USERS, target.rowNumber, { active, updatedAt: new Date().toISOString() })
  if (!active) revokeUserSessions_(context.spreadsheet, user.id)
  auditAuth_(context.spreadsheet, active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', context.user, 'SUCCESS', `${active ? 'Activated' : 'Deactivated'} user ${user.username}.`)
  return { data: { user: adminUser_(user) } }
}

function adminUnlockUser_(token, payload) {
  const context = requireAdmin_(token)
  const target = requireTargetUser_(context.spreadsheet, payload.userId)
  const user = updateAuthRow_(context.spreadsheet, SHEETS.USERS, target.rowNumber, { failedAttempts: 0, lockedUntil: '', updatedAt: new Date().toISOString() })
  auditAuth_(context.spreadsheet, 'USER_UNLOCKED', context.user, 'SUCCESS', `Unlocked user ${user.username}.`)
  return { data: { user: adminUser_(user) } }
}

function adminSetRole_(token, payload) {
  const context = requireAdmin_(token)
  const target = requireTargetUser_(context.spreadsheet, payload.userId)
  const role = normalizeRole_(payload.role)
  if (target.record.id === context.user.id && role !== AUTH_ROLES.ADMIN) throw requestError_('Role akun yang sedang dipakai tidak dapat diturunkan.', 'SELF_ROLE_CHANGE_BLOCKED')
  if (target.record.role === AUTH_ROLES.ADMIN && role !== AUTH_ROLES.ADMIN) ensureAnotherActiveAdmin_(context.spreadsheet, target.record.id)
  const user = updateAuthRow_(context.spreadsheet, SHEETS.USERS, target.rowNumber, { role, updatedAt: new Date().toISOString() })
  revokeUserSessions_(context.spreadsheet, user.id)
  auditAuth_(context.spreadsheet, 'USER_ROLE_CHANGED', context.user, 'SUCCESS', `Changed ${user.username} role to ${role}.`)
  return { data: { user: adminUser_(user) } }
}

function createUser_(spreadsheet, input) {
  const username = normalizeUsername_(input.username)
  const email = normalizeEmail_(input.email)
  const displayName = sanitizeText_(input.displayName, 80)
  const role = normalizeRole_(input.role)
  const password = String(input.password || '')
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw requestError_('Username harus 3 sampai 40 karakter dan hanya memakai huruf kecil, angka, titik, garis bawah, atau tanda minus.', 'INVALID_USERNAME')
  if (email && !/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(email)) throw requestError_('Format email tidak valid.', 'INVALID_EMAIL')
  if (!displayName) throw requestError_('Nama pengguna wajib diisi.', 'INVALID_DISPLAY_NAME')
  if (findUserRow_(spreadsheet, username) || (email && findUserRow_(spreadsheet, email))) throw requestError_('Username atau email sudah digunakan.', 'USER_EXISTS')

  const policyErrors = passwordPolicyErrors_(password, { username, email })
  if (policyErrors.length) throw requestError_(policyErrors[0], 'PASSWORD_POLICY_FAILED')
  const salt = randomToken_(24)
  const now = new Date().toISOString()
  const user = {
    id: Utilities.getUuid(),
    username,
    email,
    displayName,
    role,
    passwordHash: derivePasswordHash_(password, salt, AUTH_SETTINGS.PASSWORD_ITERATIONS),
    passwordSalt: salt,
    passwordIterations: AUTH_SETTINGS.PASSWORD_ITERATIONS,
    mustChangePassword: true,
    active: true,
    failedAttempts: 0,
    lockedUntil: '',
    lastLoginAt: '',
    passwordChangedAt: '',
    createdAt: now,
    updatedAt: now,
  }
  append_(spreadsheet, SHEETS.USERS, user)
  return user
}
