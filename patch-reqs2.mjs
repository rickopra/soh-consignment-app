import fs from 'fs'

function read(p) { return fs.readFileSync(p, 'utf8') }
function write(p, d) { fs.writeFileSync(p, d) }

// Inbound table selisih column
let inbound = read('src/pages/InboundPage.tsx')

if (!inbound.includes('inbound.difference')) {
  console.log('No difference string in table')
}

inbound = inbound.replace(
  "<th>{t('inbound.actualQty')}</th><th scope='col'>{t('inbound.references')}",
  "<th>{t('inbound.actualQty')}</th><th scope='col'>{isId ? 'Selisih' : 'Diff'}</th><th scope='col'>{t('inbound.references')}"
).replace(
  "<th scope='col' className='text-right'>{t('inbound.actualQty')}</th><th scope='col'>{t('inbound.references')}",
  "<th scope='col' className='text-right'>{t('inbound.actualQty')}</th><th scope='col' className='text-right'>{isId ? 'Selisih' : 'Diff'}</th><th scope='col'>{t('inbound.references')}"
)

inbound = inbound.replace(
  "<td className='text-right font-semibold text-[var(--text)]'>{formatNumber(item.qtyActual)}</td>\n                  <td><p className='max-w-[240px] text-xs leading-5 text-[var(--text-muted)]'>{refs || 'â€� '}</p></td>",
  "<td className='text-right font-semibold text-[var(--text)]'>{formatNumber(item.qtyActual)}</td><td className='text-right'>{item.qtyMatdoc !== item.qtyActual ? <span className=\"text-[var(--warning)] font-semibold\">{formatNumber(Math.abs(item.qtyMatdoc - item.qtyActual))}</span> : <span className=\"text-[var(--text-subtle)]\">-</span>}</td>\n                  <td><p className='max-w-[240px] text-xs leading-5 text-[var(--text-muted)]'>{refs || 'â€� '}</p></td>"
)

write('src/pages/InboundPage.tsx', inbound)
console.log('patched inbound list')
