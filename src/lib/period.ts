// How the shared date filter (useDateFilterStore) is currently set — a
// whole calendar month, or a whole calendar year. Drives whether "yearly"
// figures are the range's own total (year) or need projecting via ×12
// (month) — see `annualize` below.
export type DateFilterMode = 'month' | 'year'

// The shared filter's selected window — both ends inclusive, local dates
// (not UTC), matching this file's existing "compare Y/M/D components, never
// new Date(isoString)" convention throughout.
export interface DateRange {
  start: Date
  end: Date
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

function toIsoDate(date: Date): string {
  return formatIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

// ISO "YYYY-MM-DD" strings compare correctly with plain </> operators
// (zero-padded, big-endian) — no Date parsing needed for the range check,
// same reasoning as the rest of this file.
export function isDateInRange(dateStr: string, range: DateRange): boolean {
  return dateStr >= toIsoDate(range.start) && dateStr <= toIsoDate(range.end)
}

export function monthBounds(date: Date): DateRange {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
  }
}

export function yearBounds(date: Date): DateRange {
  return {
    start: new Date(date.getFullYear(), 0, 1),
    end: new Date(date.getFullYear(), 11, 31),
  }
}

// Projects an amount that fell within the selected window onto a full
// year. 'month' scales it ×12 (unchanged prior behavior); 'year' returns it
// as-is, since a year-mode range already covers the whole year — nothing to
// project.
export function annualize(amountInRange: number, mode: DateFilterMode): number {
  return mode === 'month' ? amountInRange * 12 : amountInRange
}

// Default date (ISO "YYYY-MM-DD") for a new record when the user is looking
// at `range`. Defaults to today if today falls within the selected range
// (unchanged prior behavior for the common case); otherwise defaults to the
// range's start — makes it quick to backfill a paycheck/purchase you forgot
// to log while you're already looking at that period.
export function defaultDateForRange(range: DateRange): string {
  const todayIso = toIsoDate(new Date())
  return isDateInRange(todayIso, range) ? todayIso : toIsoDate(range.start)
}

// "July 2026" — used for MoneySummaryRow's "in <Month> <Year>" wording.
export function formatMonthYear(date: Date): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  })
  return formatter.format(date)
}

// "July 2026" (month mode) or "2026" (year mode) — the plain-language label
// for whatever the shared filter is currently set to. Used anywhere a
// screen needs to say what window it's showing: BudgetEnvelopeRow's date
// column (replacing the old per-category resetDay cycle display, now that
// the shared filter's range governs every category's spend — see
// src/lib/purchases.ts) and MoneySummaryRow's "in <label>" wording.
export function formatRangeLabel(mode: DateFilterMode, range: DateRange): string {
  return mode === 'month' ? formatMonthYear(range.start) : String(range.start.getFullYear())
}
