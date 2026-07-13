// Tax figures used by src/lib/tax/federal.ts and california.ts. Federal and
// California don't have matching "most recently confirmed" tax years
// available (see CLAUDE.md Session Log for the research this was based
// on) — each constant below is labeled with the year it actually applies
// to rather than pretending both jurisdictions are on the same year.

export interface TaxBracket {
  rate: number
  // Upper bound of taxable income this bracket applies to; Infinity for
  // the top bracket. Brackets are marginal — each only taxes the slice of
  // income between the previous bracket's upTo and its own.
  upTo: number
}

// Federal tax year 2026, single filer.
// Source: IRS 2026 inflation adjustments, via
// https://copera.org/pera-on-the-issues/irs-releases-2026-tax-brackets-contribution-limits-other-tax-updates
export const FEDERAL_BRACKETS_2026: TaxBracket[] = [
  { rate: 0.1, upTo: 12_400 },
  { rate: 0.12, upTo: 50_400 },
  { rate: 0.22, upTo: 105_700 },
  { rate: 0.24, upTo: 201_775 },
  { rate: 0.32, upTo: 256_225 },
  { rate: 0.35, upTo: 640_600 },
  { rate: 0.37, upTo: Infinity },
]

export const FEDERAL_STANDARD_DEDUCTION_2026 = 16_100

// California tax year 2025, single filer — the most recently confirmed
// figures. 2026 CA numbers turned up this session but were inconsistent
// across sources (some blogs mislabel 2025 figures as 2026), so 2025 was
// used instead as the reliably-sourced baseline.
// Source: FTB 540 booklet, via
// https://www.nerdwallet.com/taxes/learn/california-state-tax
export const CA_BRACKETS_2025: TaxBracket[] = [
  { rate: 0.01, upTo: 11_079 },
  { rate: 0.02, upTo: 26_264 },
  { rate: 0.04, upTo: 41_452 },
  { rate: 0.06, upTo: 57_542 },
  { rate: 0.08, upTo: 72_724 },
  { rate: 0.093, upTo: 371_479 },
  { rate: 0.103, upTo: 445_771 },
  { rate: 0.113, upTo: 742_953 },
  { rate: 0.123, upTo: Infinity },
]

export const CA_STANDARD_DEDUCTION_2025 = 5_706

// Self-employment tax: 15.3% = 12.4% Social Security + 2.9% Medicare,
// applied to 92.35% of net SE earnings — the statutory adjustment that
// mirrors an employer's untaxed half of FICA, which a self-employed
// person doesn't have.
// Source: https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes
export const SE_NET_EARNINGS_FACTOR = 0.9235
export const SE_SOCIAL_SECURITY_RATE = 0.124
export const SE_MEDICARE_RATE = 0.029

// 2026 Social Security wage base — the 12.4% Social Security portion of SE
// tax stops applying above this much net SE earnings.
// Source: https://www.ssa.gov/oact/cola/cbb.html
export const SS_WAGE_BASE_2026 = 184_500

// Additional Medicare tax: 0.9% on wages + SE income combined above this
// threshold (single filers). Not inflation-indexed, so this figure is
// stable year to year, unlike the bracket tables above.
export const ADDITIONAL_MEDICARE_RATE = 0.009
export const ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = 200_000

// Federal QBI (Section 199A) deduction: 20% of qualified business income.
// No wage/UBIA phase-out is modeled here — see CLAUDE.md for why that's an
// explicit, documented simplification rather than an oversight.
export const QBI_DEDUCTION_RATE = 0.2

// California SDI (State Disability Insurance): applies to all W-2 wages,
// no wage cap since CA SB 951 removed it starting 2024. Self-employed
// income isn't subject to SDI absent Elective Coverage, which this app
// doesn't model.
// Source: https://hrwatchdog.calchamber.com/2024/11/2025-federal-social-security-california-sdi-taxable-wage-base-withholding-rates/
export const CA_SDI_RATE_2025 = 0.012

// Applies a progressive marginal bracket table to a taxable income amount.
export function applyBrackets(taxableIncome: number, brackets: TaxBracket[]): number {
  if (taxableIncome <= 0) return 0
  let tax = 0
  let previousUpTo = 0
  for (const bracket of brackets) {
    if (taxableIncome <= previousUpTo) break
    const taxableInBracket = Math.min(taxableIncome, bracket.upTo) - previousUpTo
    tax += taxableInBracket * bracket.rate
    previousUpTo = bracket.upTo
  }
  return tax
}
