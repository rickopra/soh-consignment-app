$path = 'src/pages/OutboundPage.tsx'
$content = Get-Content $path -Raw

$oldTbody = "const documents = Object.entries(item.documents).filter(([, v]) => v).map(([k, v]) => ``${k.toUpperCase()}: ${v}``).join(' Â· ')"
$newTbody = "const docsEntries = Object.entries(item.documents).filter(([, v]) => v)"
$content = $content.Replace($oldTbody, $newTbody)

$oldTableCell = "<td><p className='max-w-[220px] text-xs leading-5 text-[var(--text-muted)]'>{documents || 'â€”'}</p></td>"
$newTableCell = "<td><div className='flex max-w-[240px] flex-wrap gap-1.5'>{docsEntries.map(([k, v]) => (<span key={k} className='inline-flex items-center rounded bg-[#e8f0f5] px-1.5 py-0.5 text-[10px] font-semibold text-[#164c70] dark:bg-[#143247] dark:text-[#b9d9eb]'>{k.toUpperCase()}: <span className='ml-1 font-normal'>{v}</span></span>))}{docsEntries.length === 0 && <span className='text-xs text-[var(--text-muted)]'>â€”</span>}</div></td>"
$content = $content.Replace($oldTableCell, $newTableCell)

$oldMobileCard = "const outstanding = Math.max(0, item.qtyRequest - item.qtySupply)"
$newMobileCard = "const outstanding = Math.max(0, item.qtyRequest - item.qtySupply)`n            const docsEntries = Object.entries(item.documents).filter(([, v]) => v)"
$content = $content.Replace($oldMobileCard, $newMobileCard)

$oldMobileEnd = "</div>`n              </li>"
$newMobileEnd = "</div>`n                {docsEntries.length > 0 && <div className='mt-3 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3'>{docsEntries.map(([k, v]) => (<span key={k} className='inline-flex items-center rounded bg-[#e8f0f5] px-1.5 py-0.5 text-[10px] font-semibold text-[#164c70] dark:bg-[#143247] dark:text-[#b9d9eb]'>{k.toUpperCase()}: <span className='ml-1 font-normal'>{v}</span></span>))}</div>}`n              </li>"
$content = $content.Replace($oldMobileEnd, $newMobileEnd)

$oldEditHeader = "<p className='mt-1 text-xs text-[var(--text-subtle)]'>{formatDate(editTarget.requestDate)} â€” {editTarget.requester}</p>`n            </div>"
$newEditHeader = "<p className='mt-1 text-xs text-[var(--text-subtle)]'>{formatDate(editTarget.requestDate)} â€” {editTarget.requester}</p>`n              {Object.entries(editTarget.documents).some(([, v]) => v) && <div className='mt-3 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3'>{Object.entries(editTarget.documents).filter(([, v]) => v).map(([k, v]) => (<span key={k} className='inline-flex items-center rounded bg-[#e8f0f5] px-1.5 py-0.5 text-[10px] font-semibold text-[#164c70] dark:bg-[#143247] dark:text-[#b9d9eb]'>{k.toUpperCase()}: <span className='ml-1 font-normal'>{v}</span></span>))}</div>}`n            </div>"
$content = $content.Replace($oldEditHeader, $newEditHeader)

[System.IO.File]::WriteAllText((Resolve-Path $path), $content)
