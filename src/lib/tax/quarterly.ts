export interface QuarterlyEstimate {
  label: string
  dueDate: string
  federalAmount: number
  californiaAmount: number
  totalAmount: number
}

// Federal splits the annual estimate evenly across 4 installments.
// California does NOT — it's 30% / 40% / 0% / 30%, a genuine FTB quirk
// (no 3rd-quarter installment at all) that's easy to get wrong if you
// assume even quarters like federal.
// Source: https://www.ftb.ca.gov/forms/2025/2025-540-es-instructions.html
const FEDERAL_INSTALLMENT_PERCENTS = [0.25, 0.25, 0.25, 0.25]
const CA_INSTALLMENT_PERCENTS = [0.3, 0.4, 0, 0.3]

interface QuarterlyTotals {
  federalTotal: number
  californiaTotal: number
}

// Due dates are the standard fixed calendar dates (not adjusted for
// weekends/holidays, which shift the real due date by a day or two in some
// years) — a documented simplification consistent with this being a
// personal-budgeting estimate, not a filing system.
export function getQuarterlyEstimates(
  { federalTotal, californiaTotal }: QuarterlyTotals,
  year: number
): QuarterlyEstimate[] {
  const dueDates = [
    `${year}-04-15`,
    `${year}-06-15`,
    `${year}-09-15`,
    `${year + 1}-01-15`,
  ]

  return dueDates.map((dueDate, index) => {
    const federalAmount = federalTotal * FEDERAL_INSTALLMENT_PERCENTS[index]
    const californiaAmount = californiaTotal * CA_INSTALLMENT_PERCENTS[index]
    return {
      label: `Q${index + 1}`,
      dueDate,
      federalAmount,
      californiaAmount,
      totalAmount: federalAmount + californiaAmount,
    }
  })
}

// "Apr 15, 2026" — parses the ISO string's own Y/M/D components rather than
// `new Date(isoString)`, which parses as UTC midnight and can display as
// the previous day in negative UTC-offset timezones (same convention used
// throughout src/lib/period.ts).
export function formatDueDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return formatter.format(new Date(year, month - 1, day))
}
