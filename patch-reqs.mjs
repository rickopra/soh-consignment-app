import fs from 'fs'

function read(p) { return fs.readFileSync(p, 'utf8') }
function write(p, d) { fs.writeFileSync(p, d) }

let ui = read('src/components/ui.tsx')
if(ui.includes('<select')) {
  let rep = "export function SelectField({ id, label, value, onChange, options, required, hint, disabled }: { id: string; label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; required?: boolean; hint?: string; disabled?: boolean }) {\n" +
  "  const [open, setOpen] = useState(false)\n" +
  "  const triggerRef = useRef<HTMLButtonElement>(null)\n" +
  "  const panelRef = useRef<HTMLDivElement>(null)\n" +
  "  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)\n" +
  "  \n" +
  "  useEffect(() => {\n" +
  "    if (!open) return\n" +
  "    const rect = triggerRef.current?.getBoundingClientRect()\n" +
  "    if (rect) setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width })\n" +
  "    const handler = (e: MouseEvent | TouchEvent) => {\n" +
  "      if (!triggerRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) {\n" +
  "        setOpen(false)\n" +
  "      }\n" +
  "    }\n" +
  "    document.addEventListener('mousedown', handler)\n" +
  "    document.addEventListener('touchstart', handler)\n" +
  "    const resize = () => setOpen(false)\n" +
  "    window.addEventListener('resize', resize)\n" +
  "    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); window.removeEventListener('resize', resize) }\n" +
  "  }, [open])\n" +
  "\n" +
  "  const selectedOption = options.find(o => o.value === value)\n" +
  "\n" +
  "  return <div className='flex flex-col'><FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel><div className='relative'>\n" +
  "    <button ref={triggerRef} type=\"button\" disabled={disabled} onClick={() => setOpen(!open)} aria-haspopup=\"listbox\" aria-expanded={open} className={cn(fieldBase, 'flex items-center justify-between text-left')}>\n" +
  "      <span className={selectedOption ? 'text-[var(--text)] truncate block' : 'text-[var(--text-subtle)] truncate block'}>{selectedOption?.label || ''}</span>\n" +
  "      <ChevronDown className='pointer-events-none shrink-0 text-[var(--text-muted)]' size={14} aria-hidden='true' />\n" +
  "    </button>\n" +
  "    {open && position && createPortal(\n" +
  "      <div ref={panelRef} role=\"listbox\" className='fixed z-[70] overflow-y-auto max-h-[300px] rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] shadow-xl' style={{ top: position.top, left: position.left, width: position.width }}>\n" +
  "        {options.map((option) => (\n" +
  "          <button key={option.value} role=\"option\" aria-selected={value === option.value} type=\"button\" className={cn('w-full text-left px-4 py-2 text-sm transition-colors focus:outline-none', value === option.value ? 'bg-[var(--brand-orange)] font-semibold text-white' : 'text-[var(--text)] hover:bg-[var(--surface-muted)]')} onClick={() => { onChange(option.value); setOpen(false); triggerRef.current?.focus() }}>\n" +
  "            {option.label}\n" +
  "          </button>\n" +
  "        ))}\n" +
  "      </div>, document.body\n" +
  "    )}\n" +
  "  </div></div>\n" +
  "}"

  ui = ui.replace(/export function SelectField\([\s\S]*?<\/div><\/div>\n}/, rep)
  write('src/components/ui.tsx', ui)
  console.log('patched select field')
}
