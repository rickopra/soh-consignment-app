import fs from 'node:fs'

const outboundPath = 'src/pages/OutboundPage.tsx'
let outbound = fs.readFileSync(outboundPath, 'utf8')

const helperAnchor = `function toEditDraft(tx: OutboundTransaction): OutboundUpdate {
  return { qtyRequest: tx.qtyRequest, qtySupply: tx.qtySupply, documents: { ...tx.documents }, notes: tx.notes }
}
`
const helper = `${helperAnchor}
const documentFields: Array<{ key: keyof OutboundDocuments; label: string }> = [
  { key: 'pr', label: 'PR' },
  { key: 'po', label: 'PO' },
  { key: 'so', label: 'SO' },
  { key: 'dn', label: 'DN' },
  { key: 'invoice', label: 'Invoice' },
]

function DocumentReferenceList({ documents, emptyLabel }: { documents: OutboundDocuments; emptyLabel: string }) {
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
`
if (!outbound.includes(helperAnchor)) throw new Error('Helper anchor not found')
outbound = outbound.replace(helperAnchor, helper)

const mobileClose = `                </div>
              </li>`
const mobileDocuments = `                </div>
                <div className='mt-3 border-t border-[var(--border)] pt-3'>
                  <p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'>{t('outbound.documents')}</p>
                  <DocumentReferenceList documents={item.documents} emptyLabel={t('outbound.noDocuments')} />
                </div>
              </li>`
if (!outbound.includes(mobileClose)) throw new Error('Mobile card anchor not found')
outbound = outbound.replace(mobileClose, mobileDocuments)

outbound = outbound.replace("<table className='data-table min-w-[820px]'>", "<table className='data-table min-w-[1080px]'>")
outbound = outbound.replace(/\n\s+const documents = Object\.entries\(item\.documents\).*?\n\s+return \(/, '\n              return (')
outbound = outbound.replace(/<td><p className='max-w-\[220px\][^']*'>\{documents \|\| '[^']*'\}<\/p><\/td>/, "<td className='min-w-[260px]'><DocumentReferenceList documents={item.documents} emptyLabel={t('outbound.noDocuments')} /></td>")

const editHeaderPattern = /(<p className='mt-1 text-xs text-\[var\(--text-subtle\)\]'>\{formatDate\(editTarget\.requestDate\)\}.*?\{editTarget\.requester\}<\/p>)\n            <\/div>/
if (!editHeaderPattern.test(outbound)) throw new Error('Edit header anchor not found')
outbound = outbound.replace(editHeaderPattern, `$1
              <div className='mt-3 border-t border-[var(--border)] pt-3'>
                <p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'>{t('outbound.documents')}</p>
                <DocumentReferenceList documents={editDraft.documents} emptyLabel={t('outbound.noDocuments')} />
              </div>
            </div>`)

fs.writeFileSync(outboundPath, outbound)

const messagesPath = 'src/i18n/messages/outbound.ts'
let messages = fs.readFileSync(messagesPath, 'utf8')
messages = messages.replace("    'outbound.documentsHint': 'Isi minimal satu nomor dokumen untuk Consignment atau Service Point.',", "    'outbound.documentsHint': 'Isi minimal satu nomor dokumen untuk Consignment atau Service Point.',\n    'outbound.noDocuments': 'Belum ada nomor dokumen.',")
messages = messages.replace("    'outbound.documentsHint': 'Enter at least one document number for Consignment or Service Point.',", "    'outbound.documentsHint': 'Enter at least one document number for Consignment or Service Point.',\n    'outbound.noDocuments': 'No document number recorded.',")
fs.writeFileSync(messagesPath, messages)
