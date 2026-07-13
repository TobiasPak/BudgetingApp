import {
  applyBrackets,
  CA_BRACKETS_2025,
  CA_STANDARD_DEDUCTION_2025,
  CA_SDI_RATE_2025,
  SE_NET_EARNINGS_FACTOR,
  SE_SOCIAL_SECURITY_RATE,
  SE_MEDICARE_RATE,
  SS_WAGE_BASE_2026,
} from './brackets'
import type { AnnualIncomeInput } from './federal'

export interface CaliforniaTaxResult {
  w2Income: number
  selfEmploymentIncome: number
  sdi: number
  agi: number
  standardDeduction: number
  taxableIncome: number
  incomeTax: number
  totalCaliforniaTax: number
}

// California starts from federal AGI (including the federal above-the-line
// deduction for half of self-employment tax — that adjustment does carry
// over), but does NOT conform to the federal QBI deduction, and has no
// separate self-employment tax of its own: self-employment net income just
// flows into ordinary CA taxable income. SDI, by contrast, only applies to
// W-2 wages.
export function calculateCaliforniaTax({
  w2Income,
  selfEmploymentIncome,
}: AnnualIncomeInput): CaliforniaTaxResult {
  const netSelfEmploymentEarnings = selfEmploymentIncome * SE_NET_EARNINGS_FACTOR
  const seTax =
    Math.min(netSelfEmploymentEarnings, SS_WAGE_BASE_2026) * SE_SOCIAL_SECURITY_RATE +
    netSelfEmploymentEarnings * SE_MEDICARE_RATE
  const seTaxDeduction = seTax / 2

  const agi = w2Income + selfEmploymentIncome - seTaxDeduction
  const standardDeduction = CA_STANDARD_DEDUCTION_2025
  const taxableIncome = Math.max(0, agi - standardDeduction)
  const incomeTax = applyBrackets(taxableIncome, CA_BRACKETS_2025)
  const sdi = w2Income * CA_SDI_RATE_2025
  const totalCaliforniaTax = incomeTax + sdi

  return {
    w2Income,
    selfEmploymentIncome,
    sdi,
    agi,
    standardDeduction,
    taxableIncome,
    incomeTax,
    totalCaliforniaTax,
  }
}
