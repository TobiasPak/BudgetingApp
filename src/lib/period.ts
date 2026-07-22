export interface Period {
  start: string // ISO date "YYYY-MM-DD" — first day of the current cycle
  end: string // ISO date "YYYY-MM-DD" — last day of the current cycle (day before next reset)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

// Not every month has a 31st (or 30th, for Feb) — clamp the requested reset
// day down to whatever the last real day of that month is, so a reset day
// of 31 becomes Feb 28/29 instead of overflowing into March.
function clampDayToMonth(year: number, month: number, day: number): number {
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  return Math.min(day, lastDayOfMonth)
}

// Computes the currently-active recurring monthly cycle for a category with
// the given reset day. E.g. resetDay=5, reference=July 20 → cycle runs
// July 5 through August 4 (the day before the next reset).
export function getCurrentPeriod(
  resetDay: number,
  reference: Date = new Date()
): Period {
  const year = reference.getFullYear()
  const month = reference.getMonth() + 1 // 1-indexed, matches clampDayToMonth
  const day = reference.getDate()

  let startYear = year
  let startMonth = month
  // If today is before this month's reset day, the cycle we're currently in
  // actually started last month.
  if (day < clampDayToMonth(year, month, resetDay)) {
    startMonth -= 1
    if (startMonth === 0) {
      startMonth = 12
      startYear -= 1
    }
  }
  const startDay = clampDayToMonth(startYear, startMonth, resetDay)
  const start = formatIsoDate(startYear, startMonth, startDay)

  let endMonth = startMonth + 1
  let endYear = startYear
  if (endMonth === 13) {
    endMonth = 1
    endYear += 1
  }
  const nextResetDay = clampDayToMonth(endYear, endMonth, resetDay)
  const endDateObj = new Date(endYear, endMonth - 1, nextResetDay)
  endDateObj.setDate(endDateObj.getDate() - 1)
  const end = formatIsoDate(
    endDateObj.getFullYear(),
    endDateObj.getMonth() + 1,
    endDateObj.getDate()
  )

  return { start, end }
}

// Default date (ISO "YYYY-MM-DD") for a new record when the user is
// looking at `referenceDate`'s month. Viewing the current month defaults
// to today (unchanged prior behavior); viewing a past month defaults to
// somewhere inside that month instead of always landing on today's date —
// makes it quick to backfill a paycheck/purchase you forgot to log while
// you're already looking at that period.
export function defaultDateForReference(referenceDate: Date): string {
  const today = new Date()
  const isCurrentMonth =
    referenceDate.getFullYear() === today.getFullYear() &&
    referenceDate.getMonth() === today.getMonth()
  const base = isCurrentMonth ? today : referenceDate
  return formatIsoDate(base.getFullYear(), base.getMonth() + 1, base.getDate())
}

// "July 2026" — shared by MonthYearPicker's trigger label and
// MoneySummaryRow's "in <Month> <Year>" wording when browsing a past month,
// so both stay in sync if the display format ever changes.
export function formatMonthYear(date: Date): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  })
  return formatter.format(date)
}

// "Jul 5 – Aug 4" — parses the ISO string's own components rather than
// `new Date(isoString)`, which parses as UTC midnight and can display as
// the previous day in negative UTC-offset timezones.
export function formatPeriodRange(period: Period): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const toLocalDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return `${formatter.format(toLocalDate(period.start))} – ${formatter.format(
    toLocalDate(period.end)
  )}`
}
