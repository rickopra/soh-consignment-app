import fs from 'node:fs'

const messagesPath = 'src/i18n/messages/inbound.ts'
let messages = fs.readFileSync(messagesPath, 'utf8')
messages = messages.replace(
  "'inbound.references': 'Referensi penerimaan',",
  "'inbound.references': 'Referensi penerimaan',\n    'inbound.noReferences': 'Belum ada referensi.',\n    'inbound.noNotes': 'Belum ada catatan.',"
)
messages = messages.replace(
  "'inbound.references': 'Receipt references',",
  "'inbound.references': 'Receipt references',\n    'inbound.noReferences': 'No references.',\n    'inbound.noNotes': 'No notes.',"
)
fs.writeFileSync(messagesPath, messages)
