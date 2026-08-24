import fs from 'node:fs'

const path = 'src/pages/OutboundPage.tsx'
let content = fs.readFileSync(path, 'utf8')

content = content.replace(
  "import { ArrowUpFromLine, Pencil, Plus, Search } from 'lucide-react'",
  "import { ArrowUpFromLine, MessageSquareText, Pencil, Plus, Search } from 'lucide-react'",
)

const oldComponents = `function DocumentReferenceList({ documents, notes, emptyLabel }: { documents: OutboundDocuments; notes: string; emptyLabel: string }) {
  const entries = documentFields.filter(({ key }) => documents[key].trim())
  const hasDocs = entries.length > 0
  const hasNotes = notes.trim().length > 0
  
  if (!hasDocs && !hasNotes) return <span className='text-xs text-[var(--text-subtle)]'>{emptyLabel}</span>
  
  return (
    <div className='flex flex-col gap-2'>
      {hasDocs && (
        <div className='flex flex-wrap gap-1.5'>
          {entries.map(({ key, label }) => (
            <span key={key} title={label + ': ' + documents[key]} className='inline-flex min-w-0 items-center gap-1.5 rounded-[5px] border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-[11px] leading-4'>
              <span className='shrink-0 font-bold text-[var(--brand-blue)]'>{label}</span>
              <span className='break-all font-medium tabular-nums text-[var(--text)]'>{documents[key]}</span>
            </span>
          ))}
        </div>
      )}
      {hasNotes && <p className='max-w-[300px] text-[11px] italic leading-4 text-[var(--text-muted)]' title={notes}>* {notes}</p>}
    </div>
  )
}`

const newComponents = `function DocumentReferenceList({ documents, emptyLabel }: { documents: OutboundDocuments; emptyLabel: string }) {
  const entries = documentFields.filter(({ key }) => documents[key].trim())
  if (!entries.length) return <span className='text-xs text-[var(--text-subtle)]'>{emptyLabel}</span>
  return (
    <div className='flex flex-wrap gap-1.5'>
      {entries.map(({ key, label }) => (
        <span key={key} title={label + ': ' + documents[key]} className='inline-flex min-w-0 items-center gap-1.5 rounded-[5px] border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-[11px] leading-4'>
          <span className='shrink-0 font-bold text-[var(--brand-blue)]'>{label}</span>
          <span className='break-all font-medium tabular-nums text-[var(--text)]'>{documents[key]}</span>
        </span>
      ))}
    </div>
  )
}

function NotesPreview({ notes, emptyLabel, full = false }: { notes: string; emptyLabel: string; full?: boolean }) {
  const value = notes.trim()
  if (!value) return <span className='text-xs text-[var(--text-subtle)]'>{emptyLabel}</span>
  return (
    <div className='flex min-w-0 items-start gap-2 text-[var(--text-muted)]'>
      <MessageSquareText size={14} className='mt-0.5 shrink-0 text-[var(--brand-orange)]' aria-hidden='true' />
      <p title={value} className={full ? 'whitespace-pre-wrap break-words text-xs leading-5 text-[var(--text-muted)]' : 'max-w-[240px] truncate text-xs leading-5 text-[var(--text-muted)]'}>{value}</p>
    </div>
  )
}`

if (!content.includes(oldComponents)) throw new Error('Document component block not found')
content = content.replace(oldComponents, newComponents)
content = content.replace(
  "`${item.partNumber} ${item.requester} ${Object.values(item.documents).join(' ')}`",
  "`${item.partNumber} ${item.requester} ${Object.values(item.documents).join(' ')} ${item.notes}`",
)
content = content.replaceAll(
  "<DocumentReferenceList documents={item.documents} notes={item.notes} emptyLabel={t('outbound.noDocuments')} />",
  "<DocumentReferenceList documents={item.documents} emptyLabel={t('outbound.noDocuments')} />",
)
content = content.replace(
  `                  <DocumentReferenceList documents={item.documents} emptyLabel={t('outbound.noDocuments')} />
                </div>
              </li>`,
  `                  <DocumentReferenceList documents={item.documents} emptyLabel={t('outbound.noDocuments')} />
                </div>
                <div className='mt-3 border-t border-[var(--border)] pt-3'>
                  <p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'>{t('outbound.notes')}</p>
                  <NotesPreview notes={item.notes} emptyLabel={t('outbound.noNotes')} full />
                </div>
              </li>`,
)
content = content.replace("<table className='data-table min-w-[1080px]'>", "<table className='data-table min-w-[1260px]'>")
content = content.replace(
  "<th scope='col'>{t('outbound.documents')}</th><th scope='col' className='text-right'>{t('outbound.action')}</th>",
  "<th scope='col'>{t('outbound.documents')}</th><th scope='col'>{t('outbound.notes')}</th><th scope='col' className='text-right'>{t('outbound.action')}</th>",
)
content = content.replace(
  "<td className='min-w-[260px]'><DocumentReferenceList documents={item.documents} emptyLabel={t('outbound.noDocuments')} /></td><td className='text-right'>",
  "<td className='min-w-[260px]'><DocumentReferenceList documents={item.documents} emptyLabel={t('outbound.noDocuments')} /></td><td className='min-w-[220px]'><NotesPreview notes={item.notes} emptyLabel={t('outbound.noNotes')} /></td><td className='text-right'>",
)
content = content.replace("<td colSpan={8}", "<td colSpan={9}")
content = content.replace(
  "<DocumentReferenceList documents={editDraft.documents} notes={editTarget.notes} emptyLabel={t('outbound.noDocuments')} />",
  "<DocumentReferenceList documents={editDraft.documents} emptyLabel={t('outbound.noDocuments')} />",
)
content = content.replace(
  `                <DocumentReferenceList documents={editDraft.documents} emptyLabel={t('outbound.noDocuments')} />
              </div>
            </div>`,
  `                <DocumentReferenceList documents={editDraft.documents} emptyLabel={t('outbound.noDocuments')} />
              </div>
              <div className='mt-3 border-t border-[var(--border)] pt-3'>
                <p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'>{t('outbound.notes')}</p>
                <NotesPreview notes={editDraft.notes} emptyLabel={t('outbound.noNotes')} full />
              </div>
            </div>`,
)

fs.writeFileSync(path, content)

const messagesPath = 'src/i18n/messages/outbound.ts'
let messages = fs.readFileSync(messagesPath, 'utf8')
messages = messages.replace(
  "    'outbound.noDocuments': 'Belum ada nomor dokumen.',",
  "    'outbound.noDocuments': 'Belum ada nomor dokumen.',\n    'outbound.noNotes': 'Belum ada catatan.',",
)
messages = messages.replace(
  "    'outbound.searchPlaceholder': 'Cari peminta atau nomor part',",
  "    'outbound.searchPlaceholder': 'Cari peminta, part, dokumen, atau catatan',",
)
messages = messages.replace(
  "    'outbound.noDocuments': 'No document number recorded.',",
  "    'outbound.noDocuments': 'No document number recorded.',\n    'outbound.noNotes': 'No notes recorded.',",
)
messages = messages.replace(
  "    'outbound.searchPlaceholder': 'Search requester or part number',",
  "    'outbound.searchPlaceholder': 'Search requester, part, document, or notes',",
)
fs.writeFileSync(messagesPath, messages)
