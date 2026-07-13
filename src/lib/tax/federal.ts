import {
  applyBrackets,
  FEDERAL_BRACKETS_2026,
  FEDERAL_STANDARD_DEDUCTION_2026,
  SE_NET_EARNINGS_FACTOR,
  SE_SOCIAL_SECURITY_RATE,
  SE_MEDICARE_RATE,
  SS_WAGE_BASE_2026,
  ADDITIONAL_MEDICARE_RATE,
  ADDITIONAL_MEDICARE_THRESHOLD_SINGLE,
  QBI_DEDUCTION_RATE,
} from './brackets'

export interface AnnualIncomeInput {
  w2Income: number
  selfEmploymentIncome: number
}

// Every intermediate line item is returned, not just the total — the Tax
// page's federal breakdown card renders these directly rather than
// recomputing them.
export interface FederalTaxResult {
  w2Income: number
  selfEmploymentIncome: number
  // Net SE earnings after the 92.35% statutory adjustment — the base SE
  // tax (not income tax) is actually computed on.
  netSelfEmploymentEarnings: number
  seTax: number
  // Half of seTax — an above-the-line deduction, distinct from the
  // standard deduction below.
  seTaxDeduction: number
  additionalMedicareTax: number
  agi: number
  standardDeduction: number
  qbiDeduction: number
  taxableIncome: number
  incomeTax: number
  totalFederalTax: number
}

// Filing status: single, resident alien (standard 1040 treatment) — see
// CLAUDE.md for why that's the assumption rather than nonresident-alien
// 1040-NR treatment. This app doesn't track Schedule C business expenses
// yet, so self-employment "net profit" is modeled as the full gross
// self-employment income logged — a known simplification, not a bug.
export function calculateFederalTax({
  w2Income,
  selfEmploymentIncome,
}: AnnualIncomeInput): FederalTaxResult {
  const netSelfEmploymentEarnings = selfEmploymentIncome * SE_NET_EARNINGS_FACTOR

  const socialSecurityTax =
    Math.min(netSelfEmploymentEarnings, SS_WAGE_BASE_2026) * SE_SOCIAL_SECURITY_RATE
  const medicareTax = netSelfEmploymentEarnings * SE_MEDICARE_RATE
  const seTax = socialSecurityTax + medicareTax
  const seTaxDeduction = seTax / 2

  // Combines W-2 Medicare wages (uncapped) with net SE earnings — matches
  // how Form 8959 tests this threshold across both income types together.
  const additionalMedicareTax =
    Math.max(
      0,
      w2Income + netSelfEmploymentEarnings - ADDITIONAL_MEDICARE_THRESHOLD_SINGLE
    ) * ADDITIONAL_MEDICARE_RATE

  const agi = w2Income + selfEmploymentIncome - seTaxDeduction
  const standardDeduction = FEDERAL_STANDARD_DEDUCTION_2026
  const taxableIncomeBeforeQbi = Math.max(0, agi - standardDeduction)

  // 20% of QBI, capped at 20% of taxable income before QBI (no net capital
  // gains tracked, so that term of the statutory cap is just this figure).
  // No wage/UBIA phase-out modeled — see brackets.ts.
  const qbiDeduction = Math.max(
    0,
    Math.min(
      selfEmploymentIncome * QBI_DEDUCTION_RATE,
      taxableIncomeBeforeQbi * QBI_DEDUCTION_RATE
    )
  )

  const taxableIncome = Math.max(0, taxableIncomeBeforeQbi - qbiDeduction)
  const incomeTax = applyBrackets(taxableIncome, FEDERAL_BRACKETS_2026)
  const totalFederalTax = incomeTax + seTax + additionalMedicareTax

  return {
    w2Income,
    selfEmploymentIncome,
    netSelfEmploymentEarnings,
    seTax,
    seTaxDeduction,
    additionalMedicareTax,
    agi,
    standardDeduction,
    qbiDeduction,
    taxableIncome,
    incomeTax,
    totalFederalTax,
  }
}
