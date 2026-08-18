const AUTH_SETTINGS = {
  PASSWORD_ITERATIONS: 1500,
  SESSION_HOURS: 8,
  PASSWORD_CHANGE_MINUTES: 20,
  LOCK_THRESHOLD: 5,
  LOCK_MINUTES: 15,
  MAX_AUDIT_ROWS: 60,
}

const AUTH_ROLES = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
}

function ensureAuthProperties_() {
  const properties = PropertiesService.getScriptProperties()
  if (!properties.getProperty('AUTH_PEPPER')) properties.setProperty('AUTH_PEPPER', randomToken_(64))
  if (!properties.getProperty('ALLOWED_ORIGINS')) {
    properties.setProperty('ALLOWED_ORIGINS', [
      'https://rickopra.github.io',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ].join(','))
  }
}

function configureAllowedOrigins(origins) {
  const values = Array.isArray(origins) ? origins : String(origins || '').split(',')
  const normalized = values.map((value) => String(value).trim().replace(/\/$/, '')).filter(Boolean)
  if (!normalized.length) throw new Error('Minimal satu origin harus diisi.')
  normalized.forEach((origin) => {
    if (!/^https?:\/\//.test(origin)) throw new Error(`Origin tidak valid: ${origin}`)
  })
  PropertiesService.getScriptProperties().setProperty('ALLOWED_ORIGINS', normalized.join(','))
  return { origins: normalized }
}

function getAllowedOrigins_() {
  ensureAuthProperties_()
  return String(PropertiesService.getScriptProperties().getProperty('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

function renderBridge_(bridgeNonce) {
  const template = HtmlService.createTemplateFromFile('Bridge')
  template.allowedOriginsJson = JSON.stringify(getAllowedOrigins_()).replace(/</g, '\\u003c')
  template.bridgeNonceJson = JSON.stringify(sanitizeText_(bridgeNonce, 128)).replace(/</g, '\\u003c')
  return template.evaluate()
    .setTitle('SOH Consignment Bridge')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}

function bridgeRequest(request) {
  try {
    return JSON.parse(JSON.stringify(handleRequest_(request || {})))
  } catch (error) {
    return { error: error.message, code: error.code || 'REQUEST_FAILED' }
  }
}

function handleRequest_(request) {
  const action = String(request.action || '').toUpperCase()
  const payload = request.payload && typeof request.payload === 'object' ? request.payload : {}
  const token = String(request.token || '')
  const client = sanitizeText_(request.client, 240)

  if (action === 'LOGIN') return login_(payload, client)
  if (action === 'SESSION') return sessionInfo_(token)
  if (action === 'CHANGE_PASSWORD') return changePassword_(token, payload, client)
  if (action === 'LOGOUT') return logout_(token)

  if (action === 'BOOTSTRAP') {
    const context = requireSession_(token, false)
    return { data: normalizeData_(context.spreadsheet), user: publicUser_(context.user) }
  }

  if (['OUTBOUND', 'INBOUND', 'ADJUSTMENT'].includes(action)) return saveOperationalRecord_(action, payload, token)
  if (action === 'ADMIN_OVERVIEW') return adminOverview_(token)
  if (action === 'ADMIN_CREATE_USER') return adminCreateUser_(token, payload)
  if (action === 'ADMIN_RESET_PASSWORD') return adminResetPassword_(token, payload)
  if (action === 'ADMIN_SET_ACTIVE') return adminSetActive_(token, payload)
  if (action === 'ADMIN_UNLOCK_USER') return adminUnlockUser_(token, payload)
  if (action === 'ADMIN_SET_ROLE') return adminSetRole_(token, payload)

  throw requestError_('Action tidak dikenal.', 'UNKNOWN_ACTION')
}

function provisionInitialAdmin() {
  const spreadsheet = database_()
  ensureAuthProperties_()
  const users = authRecords_(spreadsheet, SHEETS.USERS)
  if (users.length) return { status: 'already_configured', userCount: users.length }

  const username = `admin-${Utilities.getUuid().slice(0, 8).toLowerCase()}`
  const temporaryPassword = generateTemporaryPassword_()
  const user = createUser_(spreadsheet, {
    username,
    email: '',
    displayName: 'System Administrator',
    role: AUTH_ROLES.ADMIN,
    password: temporaryPassword,
  })
  auditAuth_(spreadsheet, 'INITIAL_ADMIN_CREATED', user, 'SUCCESS', 'Initial administrator account provisioned.')
  return {
    status: 'created',
    username: user.username,
    temporaryPassword,
    mustChangePassword: true,
  }
}

function reissueInitialAdminCredentials() {
  const spreadsheet = database_()
  const users = authRecords_(spreadsheet, SHEETS.USERS)
  if (users.length !== 1) throw requestError_('Reissue hanya tersedia saat database memiliki tepat satu pengguna awal.', 'REISSUE_NOT_ALLOWED')
  const target = users[0]
  if (target.record.role !== AUTH_ROLES.ADMIN) throw requestError_('Pengguna awal bukan administrator.', 'REISSUE_NOT_ALLOWED')
  const temporaryPassword = generateTemporaryPassword_()
  const salt = randomToken_(24)
  const user = updateAuthRow_(spreadsheet, SHEETS.USERS, target.rowNumber, {
    passwordHash: derivePasswordHash_(temporaryPassword, salt, AUTH_SETTINGS.PASSWORD_ITERATIONS),
    passwordSalt: salt,
    passwordIterations: AUTH_SETTINGS.PASSWORD_ITERATIONS,
    mustChangePassword: true,
    failedAttempts: 0,
    lockedUntil: '',
    passwordChangedAt: '',
    updatedAt: new Date().toISOString(),
  })
  revokeUserSessions_(spreadsheet, user.id)
  auditAuth_(spreadsheet, 'INITIAL_CREDENTIAL_REISSUED', user, 'SUCCESS', 'Initial temporary credential reissued before activation.')
  return { status: 'reissued', username: user.username, temporaryPassword, mustChangePassword: true }
}

function login_(payload, client) {
  const identifier = normalizeIdentifier_(payload.identifier)
  const password = String(payload.password || '')
  if (!identifier || !password) throw requestError_('Email atau username dan password wajib diisi.', 'INVALID_CREDENTIALS')

  const spreadsheet = database_()
  const userRow = findUserRow_(spreadsheet, identifier)
  const user = userRow && userRow.record
  const genericError = 'Login gagal. Periksa email atau username dan password.'

  if (!user || !toBoolean_(user.active)) {
    auditAuth_(spreadsheet, 'LOGIN', user || { id: '', username: identifier }, 'FAILED', 'Invalid credentials or inactive account.')
    throw requestError_(genericError, 'INVALID_CREDENTIALS')
  }

  const lockedUntil = toDate_(user.lockedUntil)
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    auditAuth_(spreadsheet, 'LOGIN', user, 'BLOCKED', 'Account lock is active.')
    throw requestError_('Akun terkunci sementara. Coba kembali beberapa menit lagi.', 'ACCOUNT_LOCKED')
  }

  const candidateHash = derivePasswordHash_(password, String(user.passwordSalt || ''), Number(user.passwordIterations || AUTH_SETTINGS.PASSWORD_ITERATIONS))
  if (!constantTimeEqual_(candidateHash, String(user.passwordHash || ''))) {
    const failedAttempts = Number(user.failedAttempts || 0) + 1
    const updates = { failedAttempts, lockedUntil: '' }
    if (failedAttempts >= AUTH_SETTINGS.LOCK_THRESHOLD) updates.lockedUntil = new Date(Date.now() + AUTH_SETTINGS.LOCK_MINUTES * 60 * 1000).toISOString()
    updateAuthRow_(spreadsheet, SHEETS.USERS, userRow.rowNumber, updates)
    auditAuth_(spreadsheet, 'LOGIN', user, 'FAILED', failedAttempts >= AUTH_SETTINGS.LOCK_THRESHOLD ? 'Account locked after repeated failures.' : 'Invalid credentials.')
    throw requestError_(failedAttempts >= AUTH_SETTINGS.LOCK_THRESHOLD ? 'Akun terkunci sementara karena percobaan login berulang.' : genericError, failedAttempts >= AUTH_SETTINGS.LOCK_THRESHOLD ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS')
  }

  const now = new Date().toISOString()
  const refreshedUser = updateAuthRow_(spreadsheet, SHEETS.USERS, userRow.rowNumber, {
    failedAttempts: 0,
    lockedUntil: '',
    lastLoginAt: now,
    updatedAt: now,
  })
  const purpose = toBoolean_(refreshedUser.mustChangePassword) ? 'PASSWORD_CHANGE' : 'APP'
  const session = createSession_(spreadsheet, refreshedUser, purpose, client)
  auditAuth_(spreadsheet, 'LOGIN', refreshedUser, 'SUCCESS', purpose === 'PASSWORD_CHANGE' ? 'First login requires password change.' : 'Authenticated session created.')

  return {
    data: {
      token: session.token,
      expiresAt: session.expiresAt,
      user: publicUser_(refreshedUser),
      mustChangePassword: purpose === 'PASSWORD_CHANGE',
    },
  }
}

function sessionInfo_(token) {
  const context = requireSession_(token, true)
  return {
    data: {
      user: publicUser_(context.user),
      mustChangePassword: context.session.purpose === 'PASSWORD_CHANGE' || toBoolean_(context.user.mustChangePassword),
      expiresAt: isoValue_(context.session.expiresAt),
    },
  }
}

function changePassword_(token, payload, client) {
  const context = requireSession_(token, true)
  const newPassword = String(payload.newPassword || '')
  const currentPassword = String(payload.currentPassword || '')
  const confirmPassword = String(payload.confirmPassword || '')
  if (newPassword !== confirmPassword) throw requestError_('Konfirmasi password tidak sama.', 'PASSWORD_CONFIRMATION_MISMATCH')

  const policyErrors = passwordPolicyErrors_(newPassword, context.user)
  if (policyErrors.length) throw requestError_(policyErrors[0], 'PASSWORD_POLICY_FAILED')

  const oldHash = derivePasswordHash_(newPassword, String(context.user.passwordSalt || ''), Number(context.user.passwordIterations || AUTH_SETTINGS.PASSWORD_ITERATIONS))
  if (constantTimeEqual_(oldHash, String(context.user.passwordHash || ''))) throw requestError_('Password baru tidak boleh sama dengan password sebelumnya.', 'PASSWORD_REUSED')

  if (context.session.purpose !== 'PASSWORD_CHANGE') {
    if (!currentPassword) throw requestError_('Password saat ini wajib diisi.', 'CURRENT_PASSWORD_REQUIRED')
    const currentHash = derivePasswordHash_(currentPassword, String(context.user.passwordSalt || ''), Number(context.user.passwordIterations || AUTH_SETTINGS.PASSWORD_ITERATIONS))
    if (!constantTimeEqual_(currentHash, String(context.user.passwordHash || ''))) throw requestError_('Password saat ini tidak sesuai.', 'CURRENT_PASSWORD_INVALID')
  }

  const salt = randomToken_(24)
  const now = new Date().toISOString()
  const updatedUser = updateAuthRow_(context.spreadsheet, SHEETS.USERS, context.userRowNumber, {
    passwordHash: derivePasswordHash_(newPassword, salt, AUTH_SETTINGS.PASSWORD_ITERATIONS),
    passwordSalt: salt,
    passwordIterations: AUTH_SETTINGS.PASSWORD_ITERATIONS,
    mustChangePassword: false,
    failedAttempts: 0,
    lockedUntil: '',
    passwordChangedAt: now,
    updatedAt: now,
  })
  revokeUserSessions_(context.spreadsheet, updatedUser.id)
  const session = createSession_(context.spreadsheet, updatedUser, 'APP', client)
  auditAuth_(context.spreadsheet, 'PASSWORD_CHANGED', updatedUser, 'SUCCESS', context.session.purpose === 'PASSWORD_CHANGE' ? 'First login password changed.' : 'Password changed by user.')

  return {
    data: {
      token: session.token,
      expiresAt: session.expiresAt,
      user: publicUser_(updatedUser),
      mustChangePassword: false,
    },
  }
}

function logout_(token) {
  if (!token) return { data: { success: true } }
  const spreadsheet = database_()
  const sessionRow = findSessionRow_(spreadsheet, token)
  if (sessionRow && !sessionRow.record.revokedAt) {
    updateAuthRow_(spreadsheet, SHEETS.AUTH_SESSIONS, sessionRow.rowNumber, { revokedAt: new Date().toISOString() })
    const userRow = findUserRowById_(spreadsheet, sessionRow.record.userId)
    if (userRow) auditAuth_(spreadsheet, 'LOGOUT', userRow.record, 'SUCCESS', 'Session revoked by user.')
  }
  return { data: { success: true } }
}

function saveOperationalRecord_(action, payload, token) {
  const context = requireSession_(token, false)
  const target = { OUTBOUND: SHEETS.OUTBOUND, INBOUND: SHEETS.INBOUND, ADJUSTMENT: SHEETS.STOCK_ADJUSTMENT }[action]
  validateOperationalPayload_(action, payload)
  const record = {
    ...payload,
    id: Utilities.getUuid(),
    createdBy: context.user.displayName,
    createdAt: new Date().toISOString(),
  }
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    append_(context.spreadsheet, target, record)
  } finally {
    lock.releaseLock()
  }
  return { data: record }
}

function validateOperationalPayload_(action, payload) {
  if (!sanitizeText_(payload.partNumber, 80)) throw requestError_('Part number wajib diisi.', 'INVALID_PAYLOAD')
  if (action === 'OUTBOUND') {
    if (Number(payload.qtyRequest || 0) < 1 || Number(payload.qtySupply || 0) < 0) throw requestError_('Qty outbound tidak valid.', 'INVALID_PAYLOAD')
    if (Number(payload.qtySupply || 0) > Number(payload.qtyRequest || 0)) throw requestError_('Qty supply tidak boleh melebihi qty request.', 'INVALID_PAYLOAD')
  }
  if (action === 'INBOUND' && (Number(payload.qtyMatdoc || 0) < 1 || Number(payload.qtyActual || 0) < 0)) throw requestError_('Qty inbound tidak valid.', 'INVALID_PAYLOAD')
  if (action === 'ADJUSTMENT' && !Number.isFinite(Number(payload.physicalCount))) throw requestError_('Stok fisik tidak valid.', 'INVALID_PAYLOAD')
}
