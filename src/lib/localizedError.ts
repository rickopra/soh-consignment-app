import { ApiError } from './api'
import type { Language, TranslationKey } from '../i18n/translations'

const errorKeys: Record<string, TranslationKey> = {
  REQUEST_FAILED: 'error.requestFailed', BRIDGE_TIMEOUT: 'error.bridgeTimeout', BRIDGE_LOAD_FAILED: 'error.bridgeLoadFailed', BRIDGE_NOT_READY: 'error.bridgeNotReady', REQUEST_TIMEOUT: 'error.requestTimeout', BACKEND_NOT_CONFIGURED: 'error.backendNotConfigured', SESSION_REQUIRED: 'error.sessionRequired', SESSION_INVALID: 'error.sessionInvalid', SESSION_EXPIRED: 'error.sessionExpired', ACCOUNT_INACTIVE: 'error.accountInactive', PASSWORD_CHANGE_REQUIRED: 'error.passwordChangeRequired', ADMIN_REQUIRED: 'error.adminRequired', USER_NOT_FOUND: 'error.userNotFound', LAST_ADMIN_PROTECTED: 'error.lastAdminProtected', INVALID_ROLE: 'error.invalidRole', SELF_DEACTIVATION_BLOCKED: 'error.selfDeactivationBlocked', SELF_ROLE_CHANGE_BLOCKED: 'error.selfRoleChangeBlocked', INVALID_USERNAME: 'error.invalidUsername', INVALID_EMAIL: 'error.invalidEmail', INVALID_DISPLAY_NAME: 'error.invalidDisplayName', USER_EXISTS: 'error.userExists', PASSWORD_POLICY_FAILED: 'error.passwordPolicyFailed', INVALID_CREDENTIALS: 'error.invalidCredentials', ACCOUNT_LOCKED: 'error.accountLocked', PASSWORD_CONFIRMATION_MISMATCH: 'error.passwordMismatch', PASSWORD_REUSED: 'error.passwordReused', CURRENT_PASSWORD_REQUIRED: 'error.currentPasswordRequired', CURRENT_PASSWORD_INVALID: 'error.currentPasswordInvalid',
}

export function localizedError(error: unknown, language: Language, t: (key: TranslationKey) => string, fallback: TranslationKey) {
  if (error instanceof ApiError && errorKeys[error.code]) return t(errorKeys[error.code])
  if (language === 'id' && error instanceof Error && error.message) return error.message
  return t(fallback)
}
