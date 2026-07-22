import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatMonthYear } from '@/lib/period'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const YEARS_BACK = 5

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

// Anchored to the 15th of the month — a stable mid-month reference point
// so getCurrentPeriod resolves "this category's cycle during the selected
// month" consistently regardless of its own resetDay (see
// src/lib/period.ts). Clamped so you can never navigate past the current
// month — there's no future ledger to show yet.
function makeReferenceDate(year: number, month: number, today: Date): Date {
  const candidate = new Date(year, month, 15)
  return candidate > today && !isSameMonth(candidate, today) ? today : candidate
}

interface MonthYearPickerProps {
  value: Date
  onChange: (date: Date) => void
}

export function MonthYearPicker({ value, onChange }: MonthYearPickerProps) {
  const [open, setOpen] = useState(false)
  const today = new Date()
  const isCurrentMonth = isSameMonth(value, today)
  const isCurrentYear = value.getFullYear() === today.getFullYear()

  function handleChange(year: number, month: number) {
    onChange(makeReferenceDate(year, month, today))
  }

  const yearOptions = Array.from(
    { length: YEARS_BACK + 1 },
    (_, i) => today.getFullYear() - i
  )

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => handleChange(value.getFullYear(), value.getMonth() - 1)}
        aria-label="Previous month"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <CalendarDays className="size-3.5" />
            {formatMonthYear(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="flex gap-2">
            <Select
              value={String(value.getMonth())}
              onValueChange={(month) => handleChange(value.getFullYear(), Number(month))}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, index) => (
                  <SelectItem
                    key={name}
                    value={String(index)}
                    disabled={isCurrentYear && index > today.getMonth()}
                  >
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(value.getFullYear())}
              onValueChange={(year) => handleChange(Number(year), value.getMonth())}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => handleChange(value.getFullYear(), value.getMonth() + 1)}
        disabled={isCurrentMonth}
        aria-label="Next month"
      >
        <ChevronRight className="size-4" />
      </Button>

      {!isCurrentMonth && (
        <Button
          variant="link"
          size="sm"
          onClick={() => handleChange(today.getFullYear(), today.getMonth())}
        >
          Back to current
        </Button>
      )}
    </div>
  )
}
