import { adminMessages } from './messages/admin'
import { authMessages } from './messages/auth'
import { baseMessages } from './messages/base'
import { dashboardMessages } from './messages/dashboard'
import { errorMessages } from './messages/errors'
import { inboundMessages } from './messages/inbound'
import { inventoryMessages } from './messages/inventory'
import { navigationMessages } from './messages/navigation'
import { outboundMessages } from './messages/outbound'
import { refillMessages } from './messages/refill'

export type Language = 'id' | 'en'

export const translations = {
  id: {
    ...baseMessages.id,
    ...navigationMessages.id,
    ...authMessages.id,
    ...dashboardMessages.id,
    ...inventoryMessages.id,
    ...outboundMessages.id,
    ...inboundMessages.id,
    ...refillMessages.id,
    ...adminMessages.id,
    ...errorMessages.id,
  },
  en: {
    ...baseMessages.en,
    ...navigationMessages.en,
    ...authMessages.en,
    ...dashboardMessages.en,
    ...inventoryMessages.en,
    ...outboundMessages.en,
    ...inboundMessages.en,
    ...refillMessages.en,
    ...adminMessages.en,
    ...errorMessages.en,
  },
} as const

export type TranslationKey = keyof typeof translations.id
export type TranslationParams = Record<string, string | number>

export function translate(language: Language, key: TranslationKey, params?: TranslationParams) {
  let message: string = translations[language][key]
  if (!params) return message
  Object.entries(params).forEach(([name, value]) => {
    message = message.replaceAll(`{{${name}}}`, String(value))
  })
  return message
}
