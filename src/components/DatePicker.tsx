import { createPortal } from 'react-dom'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isToday, isValid, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage'
import { cn } from '../lib/utils'

type DatePickerProps = {
  id: string
  label?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  hint?: string
  disabled?: boolean
  error?: string
}

const fieldBase = 'min-h-10 w-full border-0 border-b border-[var(--border-strong)] bg-transparent px-0 pb-1.5 pt-0 text-sm text-[var(--text)] outline-none transition-[border-color] placeholder:text-[var(--text-subtle)] focus:border-[var(--brand-accent)] disabled:cursor-not-allowed disabled:opacity-60'

function FieldLabel({ htmlFor, children, required, hint }: { htmlFor: string; children: ReactNode; required?: boolean; hint?: string }) {
  return <label htmlFor={htmlFor} className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]'>{children}{required && <span className='ml-1 text-[var(--brand-accent)]' aria-hidden='true'>*</span>}{hint && <span className='ml-2 font-normal normal-case text-[var(--text-subtle)]'>{hint}</span>}</label>
}

function parseDateValue(value: string) {
  if (!value) return null
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

export function DatePicker({ id, label, value, onChange, required, hint, disabled, error }: DatePickerProps) {
  const { language } = useLanguage()
  const calendarId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selectedDate = parseDateValue(value)
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate ?? new Date()))
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const locale = language === 'id' ? 'id-ID' : 'en-US'
  const text = language === 'id'
    ? { select: 'Pilih tanggal', previous: 'Bulan sebelumnya', next: 'Bulan berikutnya', today: 'Hari ini', clear: 'Hapus', calendar: 'Pilih tanggal' }
    : { select: 'Select date', previous: 'Previous month', next: 'Next month', today: 'Today', clear: 'Clear', calendar: 'Date picker' }

  const formattedValue = selectedDate
    ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(selectedDate)
    : ''
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(viewMonth)
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, index + 1)))
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  })

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(304, window.innerWidth - 32)
      const estimatedHeight = 365
      const top = rect.bottom + estimatedHeight <= window.innerHeight ? rect.bottom + 8 : Math.max(16, rect.top - estimatedHeight - 8)
      const left = Math.min(Math.max(16, rect.left), Math.max(16, window.innerWidth - width - 16))
      setPosition({ top, left, width })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open) setViewMonth(startOfMonth(selectedDate ?? new Date()))
  }, [open, value])

  const selectDate = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'))
    setOpen(false)
    triggerRef.current?.focus()
  }

  const moveFocus = (index: number) => {
    const dayButtons = panelRef.current?.querySelectorAll<HTMLButtonElement>('[data-calendar-day]')
    if (!dayButtons || index < 0 || index >= dayButtons.length) return
    dayButtons[index].focus()
  }

  const handleDayKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const movement: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (event.key in movement) {
      event.preventDefault()
      moveFocus(index + movement[event.key])
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const rowStart = index - (index % 7)
      moveFocus(event.key === 'Home' ? rowStart : rowStart + 6)
    }
  }

  return (
    <div className='relative flex flex-col'>
      {label && <FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel>}
      <button
        ref={triggerRef}
        id={id}
        type='button'
        disabled={disabled}
        aria-haspopup='dialog'
        aria-expanded={open}
        aria-controls={open ? calendarId : undefined}
        aria-required={required}
        aria-invalid={Boolean(error)}
        onClick={() => setOpen((current) => !current)}
        className={cn(fieldBase, 'flex items-center justify-between text-left', open && 'border-[var(--brand-accent)]', error && 'border-[var(--danger)]')}
      >
        <span className={formattedValue ? 'text-[var(--text)]' : 'text-[var(--text-subtle)]'}>{formattedValue || text.select}</span>
        <CalendarDays size={16} className='shrink-0 text-[var(--text-muted)]' aria-hidden='true' />
      </button>
      {error && <p className='mt-1 text-[11px] text-[var(--danger)]'>{error}</p>}
      {open && position && createPortal(
        <div
          ref={panelRef}
          id={calendarId}
          role='dialog'
          aria-label={text.calendar}
          className='fixed z-[70] rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-xl'
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <div className='flex items-center justify-between gap-3'>
            <button type='button' onClick={() => setViewMonth((current) => subMonths(current, 1))} aria-label={text.previous} className='flex h-9 w-9 items-center justify-center rounded-[7px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]'><ChevronLeft size={17} aria-hidden='true' /></button>
            <p className='text-sm font-semibold capitalize text-[var(--text)]'>{monthLabel}</p>
            <button type='button' onClick={() => setViewMonth((current) => addMonths(current, 1))} aria-label={text.next} className='flex h-9 w-9 items-center justify-center rounded-[7px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]'><ChevronRight size={17} aria-hidden='true' /></button>
          </div>
          <div className='mt-4 grid grid-cols-7 gap-1' aria-hidden='true'>
            {weekdayLabels.map((weekday, index) => <span key={`${weekday}-${index}`} className='py-1 text-center text-[10px] font-semibold uppercase text-[var(--text-subtle)]'>{weekday}</span>)}
          </div>
          <div className='mt-1 grid grid-cols-7 gap-1'>
            {calendarDays.map((day, index) => {
              const selected = Boolean(selectedDate && isSameDay(day, selectedDate))
              const outsideMonth = day.getMonth() !== viewMonth.getMonth()
              return <button
                key={day.toISOString()}
                data-calendar-day
                type='button'
                tabIndex={selected || (!selectedDate && isToday(day)) ? 0 : index === 0 ? 0 : -1}
                aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(day)}
                aria-pressed={selected}
                onClick={() => selectDate(day)}
                onKeyDown={(event) => handleDayKeyDown(event, index)}
                className={cn(
                  'flex h-9 w-full items-center justify-center rounded-[7px] text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
                  selected ? 'bg-[var(--brand-accent)] font-semibold text-white hover:bg-[var(--brand-accent)]' : outsideMonth ? 'text-[var(--text-subtle)] hover:bg-[var(--surface-muted)]' : 'text-[var(--text)] hover:bg-[var(--surface-muted)]',
                  isToday(day) && !selected && 'border border-[var(--brand-accent)] font-semibold text-[var(--brand-accent)]',
                )}
              >{day.getDate()}</button>
            })}
          </div>
          <div className='mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3'>
            <button type='button' onClick={() => selectDate(new Date())} className='text-xs font-semibold text-[var(--brand-blue)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]'>{text.today}</button>
            {value && <button type='button' onClick={() => { onChange(''); setOpen(false); triggerRef.current?.focus() }} className='text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]'>{text.clear}</button>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}