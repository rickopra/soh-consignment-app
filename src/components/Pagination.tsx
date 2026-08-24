import { useId } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage'
import { Button, SelectField } from './ui'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  itemsPerPage?: number
  onItemsPerPageChange?: (size: number) => void
}

const pageSizeOptions = [10, 20, 50, 100].map((size) => ({ value: String(size), label: String(size) }))

export function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage = 20, onItemsPerPageChange }: PaginationProps) {
  const { t } = useLanguage()
  const selectId = useId()
  const normalizedTotalPages = Math.max(1, totalPages)

  if (totalPages <= 1 && !onItemsPerPageChange) return null

  return (
    <div className='flex flex-col gap-4 border-t border-[var(--border)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6'>
      <div className='flex flex-wrap items-end gap-4'>
        {onItemsPerPageChange && (
          <div className='w-[148px]'>
            <SelectField
              id={`${selectId}-page-size`}
              label={t('common.rowsPerPage')}
              value={String(itemsPerPage)}
              onChange={(value) => onItemsPerPageChange(Number(value))}
              options={pageSizeOptions}
              variant='surface'
            />
          </div>
        )}
        <p className='pb-3 text-sm text-[var(--text-muted)]' aria-live='polite'>
          {t('common.pageSummary', { page: currentPage, total: normalizedTotalPages })}
        </p>
      </div>

      <nav className='flex items-center gap-2' aria-label={t('common.pagination')}>
        <Button variant='secondary' size='sm' onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
          <ChevronLeft size={15} aria-hidden='true' />
          {t('common.previous')}
        </Button>
        <Button variant='secondary' size='sm' onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= normalizedTotalPages || totalPages === 0}>
          {t('common.next')}
          <ChevronRight size={15} aria-hidden='true' />
        </Button>
      </nav>
    </div>
  )
}
