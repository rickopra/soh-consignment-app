import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui'

export function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className='flex items-center justify-between border-t border-[var(--border)] px-4 py-3 sm:px-6'>
      <div className='flex flex-1 justify-between sm:hidden'>
        <Button variant='secondary' size='sm' onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>Previous</Button>
        <Button variant='secondary' size='sm' onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>Next</Button>
      </div>
      <div className='hidden sm:flex sm:flex-1 sm:items-center sm:justify-between'>
        <div>
          <p className='text-sm text-[var(--text-muted)]'>
            Showing page <span className='font-medium text-[var(--text)]'>{currentPage}</span> of <span className='font-medium text-[var(--text)]'>{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className='isolate inline-flex -space-x-px rounded-md shadow-sm' aria-label='Pagination'>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className='relative inline-flex items-center rounded-l-md border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-[var(--text-subtle)] hover:bg-[var(--surface-muted)] disabled:opacity-50'
            >
              <span className='sr-only'>Previous</span>
              <ChevronLeft className='h-4 w-4' aria-hidden='true' />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className='relative inline-flex items-center rounded-r-md border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-[var(--text-subtle)] hover:bg-[var(--surface-muted)] disabled:opacity-50'
            >
              <span className='sr-only'>Next</span>
              <ChevronRight className='h-4 w-4' aria-hidden='true' />
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}
