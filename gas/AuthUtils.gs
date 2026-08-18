function requireSession_(token, allowPasswordChange) {
  if (!token) throw requestError_('Sesi tidak ditemukan. Silakan login kembali.', 'SESSION_REQUIRED')
  const spreadsheet = database_()
  const sessionRow = findSessionRow_(spreadsheet, token)
  if (!sessionRow) throw requestError_('Sesi tidak valid. Silakan login kembali.', 'SESSION_INVALID')
  const session = sessionRow.record
  const expiresAt = toDate_(session.expiresAt)
  if (session.revokedAt || !expiresAt || expiresAt.getTime() <= Date.now()) throw requestError_('Sesi sudah berakhir. Silakan login kembali.', 'SESSION_EXPIRED')
  const userRow = findUserRowById_(spreadsheet, session.userId)
  if (!userRow || !toBoolean_(userRow.record.active)) throw requestError_('Akun tidak aktif.', 'ACCOUNT_INACTIVE')
  if (!allowPasswordChange && (session.purpose === 'PASSWORD_CHANGE' || toBoolean_(userRow.record.mustChangePassword))) {
    throw requestError_('Password harus diganti sebelum membuka aplikasi.', 'PASSWORD_CHANGE_REQUIRED')
  }

  const lastSeenAt = toDate_(session.lastSeenAt)
  if (!lastSeenAt || Date.now() - lastSeenAt.getTime() > 5 * 60 * 1000) {
    sessionRow.record = updateAuthRow_(spreadsheet, SHEETS.AUTH_SESSIONS, sessionRow.rowNumber, { lastSeenAt: new Date().toISOString() })
  }
  return {
    spreadsheet,
    user: userRow.record,
    userRowNumber: userRow.rowNumber,
    session: sessionRow.record,
    sessionRowNumber: sessionRow.rowNumber,
  }
}

function requireAdmin_(token) {
  const context = requireSession_(token, false)
  if (context.user.role !== AUTH_ROLES.ADMIN) throw requestError_('Akses administrator diperlukan.', 'ADMIN_REQUIRED')
  return context
}

function createSession_(spreadsheet, user, purpose, client) {
  const token = randomToken_(48)
  const now = new Date()
  const ttl = purpose === 'PASSWORD_CHANGE' ? AUTH_SETTINGS.PASSWORD_CHANGE_MINUTES * 60 * 1000 : AUTH_SETTINGS.SESSION_HOURS * 60 * 60 * 1000
  const record = {
    id: Utilities.getUuid(),
    userId: user.id,
    tokenHash: hashToken_(token),
    purpose,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttl).toISOString(),
    lastSeenAt: now.toISOString(),
    revokedAt: '',
    client: sanitizeText_(client, 240),
  }
  append_(spreadsheet, SHEETS.AUTH_SESSIONS, record)
  return { token, expiresAt: record.expiresAt }
}

function revokeUserSessions_(spreadsheet, userId) {
  const now = new Date().toISOString()
  authRecords_(spreadsheet, SHEETS.AUTH_SESSIONS).forEach((row) => {
    if (String(row.record.userId) === String(userId) && !row.record.revokedAt) {
      updateAuthRow_(spreadsheet, SHEETS.AUTH_SESSIONS, row.rowNumber, { revokedAt: now })
    }
  })
}

function findSessionRow_(spreadsheet, token) {
  const tokenHash = hashToken_(token)
  return authRecords_(spreadsheet, SHEETS.AUTH_SESSIONS).find((row) => constantTimeEqual_(String(row.record.tokenHash || ''), tokenHash)) || null
}

function findUserRow_(spreadsheet, identifier) {
  const normalized = normalizeIdentifier_(identifier)
  return authRecords_(spreadsheet, SHEETS.USERS).find((row) => normalizeIdentifier_(row.record.username) === normalized || normalizeIdentifier_(row.record.email) === normalized) || null
}

function findUserRowById_(spreadsheet, userId) {
  return authRecords_(spreadsheet, SHEETS.USERS).find((row) => String(row.record.id) === String(userId)) || null
}

function requireTargetUser_(spreadsheet, userId) {
  const row = findUserRowById_(spreadsheet, userId)
  if (!row) throw requestError_('Pengguna tidak ditemukan.', 'USER_NOT_FOUND')
  return row
}

function ensureAnotherActiveAdmin_(spreadsheet, excludedUserId) {
  const available = authRecords_(spreadsheet, SHEETS.USERS).some((row) => row.record.id !== excludedUserId && row.record.role === AUTH_ROLES.ADMIN && toBoolean_(row.record.active))
  if (!available) throw requestError_('Minimal satu administrator aktif harus tetap tersedia.', 'LAST_ADMIN_PROTECTED')
}

function authRecords_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName)
  if (!sheet || sheet.getLastRow() < 2) return []
  const values = sheet.getDataRange().getValues()
  const headers = values[0].map(String)
  return values.slice(1).map((row, index) => {
    const record = {}
    headers.forEach((header, column) => { record[header] = row[column] })
    return { rowNumber: index + 2, record }
  }).filter((row) => Object.keys(row.record).some((key) => row.record[key] !== ''))
}

function updateAuthRow_(spreadsheet, sheetName, rowNumber, updates) {
  const sheet = spreadsheet.getSheetByName(sheetName)
  if (!sheet) throw new Error(`Sheet ${sheetName} tidak ditemukan.`)
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String)
  const existing = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0]
  const record = {}
  const values = headers.map((header, index) => {
    const value = Object.prototype.hasOwnProperty.call(updates, header) ? updates[header] : existing[index]
    record[header] = value
    return value
  })
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values])
  return record
}

function auditAuth_(spreadsheet, eventType, user, outcome, details) {
  append_(spreadsheet, SHEETS.AUTH_AUDIT, {
    id: Utilities.getUuid(),
    eventType: sanitizeText_(eventType, 80),
    userId: user && user.id ? user.id : '',
    username: user && user.username ? user.username : '',
    outcome: sanitizeText_(outcome, 20),
    details: sanitizeText_(details, 500),
    createdAt: new Date().toISOString(),
  })
}

function passwordPolicyErrors_(password, user) {
  const errors = []
  if (password.length < 12) errors.push('Password minimal 12 karakter.')
  if (password.length > 128) errors.push('Password maksimal 128 karakter.')
  if (!/[a-z]/.test(password)) errors.push('Password harus memiliki huruf kecil.')
  if (!/[A-Z]/.test(password)) errors.push('Password harus memiliki huruf besar.')
  if (!/[0-9]/.test(password)) errors.push('Password harus memiliki angka.')
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password harus memiliki simbol.')
  const lowered = password.toLowerCase()
  const username = normalizeUsername_(user && user.username)
  const emailPrefix = normalizeEmail_(user && user.email).split('@')[0]
  if (username.length >= 3 && lowered.includes(username)) errors.push('Password tidak boleh memuat username.')
  if (emailPrefix.length >= 3 && lowered.includes(emailPrefix)) errors.push('Password tidak boleh memuat bagian awal email.')
  if (['password', 'admin123', 'qwerty', 'welcome'].some((word) => lowered.includes(word))) errors.push('Password terlalu mudah ditebak.')
  return errors
}

function derivePasswordHash_(password, salt, iterations) {
  ensureAuthProperties_()
  const pepper = PropertiesService.getScriptProperties().getProperty('AUTH_PEPPER')
  const key = Utilities.newBlob(`${password}:${pepper}`).getBytes()
  let block = Utilities.computeHmacSha256Signature(Utilities.newBlob(`${salt}:1`).getBytes(), key)
  const result = block.slice()
  for (let index = 1; index < iterations; index += 1) {
    block = Utilities.computeHmacSha256Signature(block, key)
    for (let byteIndex = 0; byteIndex < result.length; byteIndex += 1) result[byteIndex] = result[byteIndex] ^ block[byteIndex]
  }
  return Utilities.base64Encode(result)
}

function hashToken_(token) {
  ensureAuthProperties_()
  const pepper = PropertiesService.getScriptProperties().getProperty('AUTH_PEPPER')
  return Utilities.base64Encode(Utilities.computeHmacSha256Signature(String(token || ''), pepper))
}

function constantTimeEqual_(left, right) {
  const first = String(left || '')
  const second = String(right || '')
  let mismatch = first.length ^ second.length
  const length = Math.max(first.length, second.length)
  for (let index = 0; index < length; index += 1) {
    const firstCode = index < first.length ? first.charCodeAt(index) : 0
    const secondCode = index < second.length ? second.charCodeAt(index) : 0
    mismatch |= firstCode ^ secondCode
  }
  return mismatch === 0
}

function randomToken_(byteLength) {
  let bytes = []
  while (bytes.length < byteLength) {
    const seed = `${Utilities.getUuid()}:${new Date().getTime()}:${Math.random()}`
    bytes = bytes.concat(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed, Utilities.Charset.UTF_8))
  }
  return Utilities.base64EncodeWebSafe(bytes.slice(0, byteLength)).replace(/=+$/, '')
}

function generateTemporaryPassword_() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%&*?'
  const all = upper + lower + digits + symbols
  const seed = randomToken_(48)
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed, Utilities.Charset.UTF_8)
  const characters = [upper[Math.abs(digest[0]) % upper.length], lower[Math.abs(digest[1]) % lower.length], digits[Math.abs(digest[2]) % digits.length], symbols[Math.abs(digest[3]) % symbols.length]]
  for (let index = 4; index < 16; index += 1) characters.push(all[Math.abs(digest[index]) % all.length])
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const target = Math.abs(digest[(index + 16) % digest.length]) % (index + 1)
    const current = characters[index]
    characters[index] = characters[target]
    characters[target] = current
  }
  return characters.join('')
}

function publicUser_(user) {
  return {
    id: String(user.id || ''),
    username: String(user.username || ''),
    email: String(user.email || ''),
    displayName: String(user.displayName || ''),
    role: String(user.role || AUTH_ROLES.OPERATOR),
    mustChangePassword: toBoolean_(user.mustChangePassword),
    lastLoginAt: isoValue_(user.lastLoginAt),
  }
}

function adminUser_(user) {
  return {
    ...publicUser_(user),
    active: toBoolean_(user.active),
    failedAttempts: Number(user.failedAttempts || 0),
    lockedUntil: isoValue_(user.lockedUntil),
    passwordChangedAt: isoValue_(user.passwordChangedAt),
    createdAt: isoValue_(user.createdAt),
    updatedAt: isoValue_(user.updatedAt),
  }
}

function normalizeIdentifier_(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeUsername_(value) {
  return normalizeIdentifier_(value)
}

function normalizeEmail_(value) {
  return normalizeIdentifier_(value)
}

function normalizeRole_(value) {
  const role = String(value || AUTH_ROLES.OPERATOR).toUpperCase()
  if (![AUTH_ROLES.ADMIN, AUTH_ROLES.OPERATOR].includes(role)) throw requestError_('Role tidak valid.', 'INVALID_ROLE')
  return role
}

function sanitizeText_(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength || 500)
}

function toBoolean_(value) {
  return value === true || String(value).toLowerCase() === 'true'
}

function toDate_(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isoValue_(value) {
  const date = toDate_(value)
  return date ? date.toISOString() : ''
}

function requestError_(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}
