import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDateFilterStore } from '@/stores/useDateFilterStore'

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Shared bookmark-tab look for both the year tab and the 12 month tabs, so
// the whole thing reads as one continuous tab strip rather than a year
// control sitting above a separate row of months.
function tabClass(isActive: boolean): string {
  return cn(
    '-mb-px rounded-t-md border border-b-0 px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
    isActive
      ? 'border-border bg-card font-medium text-card-foreground'
      : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted'
  )
}

// The shared date filter, rendered once per page (HomePage, and each of
// the 4 standalone routes) — self-contained, reads/writes
// useDateFilterStore directly rather than taking value/onChange props, so
// every render site is just `<DateFilterTabs />`. Replaces the old
// MonthYearPicker's popover+dropdown shape with an always-visible bookmark-
// style tab strip: a year tab on the left (functions exactly like a month
// tab — click it to filter by the whole year) followed by 12 month tabs,
// with prev/next arrows bookending the whole strip (prev to the left of
// the year tab, next to the right of December) to browse which year's
// tabs are shown, and a "jump to today" icon button after the next-year
// arrow (only shown while browsing away from the current month).
export function DateFilterTabs() {
  const mode = useDateFilterStore((state) => state.mode)
  const startDate = useDateFilterStore((state) => state.startDate)
  const setToMonth = useDateFilterStore((state) => state.setToMonth)
  const setToYear = useDateFilterStore((state) => state.setToYear)

  const today = new Date()
  const currentYear = today.getFullYear()

  // Which year's tab strip is currently displayed — independent from the
  // filter's actual selection, so browsing the arrows to a different year
  // doesn't itself change the filter. Only clicking the year tab or a
  // month tab commits a selection. Starts on whatever year the filter is
  // already set to.
  const [displayedYear, setDisplayedYear] = useState(startDate.getFullYear())

  const isYearActive = mode === 'year' && startDate.getFullYear() === displayedYear
  const isCurrentMonthSelected =
    mode === 'month' &&
    startDate.getFullYear() === today.getFullYear() &&
    startDate.getMonth() === today.getMonth()

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setDisplayedYear((year) => year - 1)}
        aria-label="Previous year"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <div className="flex flex-wrap justify-center gap-1 border-b">
        <button
          type="button"
          onClick={() => setToYear(new Date(displayedYear, 0, 1))}
          className={cn(tabClass(isYearActive), 'font-semibold')}
        >
          {displayedYear}
        </button>

        {MONTH_ABBR.map((name, index) => {
          const isFuture = displayedYear === currentYear && index > today.getMonth()
          const isActive =
            mode === 'month' &&
            startDate.getFullYear() === displayedYear &&
            startDate.getMonth() === index

          return (
            <button
              key={name}
              type="button"
              disabled={isFuture}
              onClick={() => setToMonth(new Date(displayedYear, index, 1))}
              className={tabClass(isActive)}
            >
              {name}
            </button>
          )
        })}
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setDisplayedYear((year) => year + 1)}
        disabled={displayedYear >= currentYear}
        aria-label="Next year"
      >
        <ChevronRight className="size-4" />
      </Button>

      {!isCurrentMonthSelected && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-2"
          onClick={() => {
            setDisplayedYear(currentYear)
            setToMonth(today)
          }}
          aria-label="Back to current month"
        >
          <CalendarDays className="size-4" />
        </Button>
      )}
    </div>
  )
}
