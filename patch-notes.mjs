import fs from 'node:fs'

const path = 'src/pages/OutboundPage.tsx'
let content = fs.readFileSync(path, 'utf8')

const oldList = `function DocumentReferenceList({ documents, emptyLabel }: { documents: OutboundDocuments; emptyLabel: string }) {
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
}`

const newList = `function DocumentReferenceList({ documents, notes, emptyLabel }: { documents: OutboundDocuments; notes: string; emptyLabel: string }) {
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

if (!content.includes(oldList)) throw new Error('oldList not found')
content = content.replace(oldList, newList)

// Update all <DocumentReferenceList /> calls
content = content.replaceAll(
  '<DocumentReferenceList documents={item.documents} emptyLabel={t(\'outbound.noDocuments\')} />',
  '<DocumentReferenceList documents={item.documents} notes={item.notes} emptyLabel={t(\'outbound.noDocuments\')} />'
)
content = content.replaceAll(
  '<DocumentReferenceList documents={editDraft.documents} emptyLabel={t(\'outbound.noDocuments\')} />',
  '<DocumentReferenceList documents={editDraft.documents} notes={editTarget.notes} emptyLabel={t(\'outbound.noDocuments\')} />'
)

fs.writeFileSync(path, content)
