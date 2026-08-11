import { toIsoDate, type DateRange } from '@/lib/period'
import { detailLabel, primaryLabel } from '@/lib/plaidCategories'
import type { PlaidTransaction } from '@/types/plaidTransaction'

// Local, per-section filter state layered on top of the shared date filter's
// month/year range — search + three explicit add-button-driven facets
// (primary category, secondary/detailed category, account) + a narrower
// date sub-range. Never persisted or shared across components; each of
// SpendingBankActivity/IncomeBankActivity owns its own instance, reset
// whenever the outer `range` changes (its facet options are only
// meaningful against that range's own transactions).
export interface TransactionFilters {
  search: string
  types: Set<string>
  details: Set<string>
  accounts: Set<string>
  startDate: string
  endDate: string
}

// Sub-range starts pinned to the outer range's own bounds — narrowing is
// opt-in (move either date inward), not a second range to fill in from
// scratch. types/details/accounts start empty — nothing is filtered until
// the user explicitly adds a pill via the Add-filter dropdowns.
export function createEmptyFilters(range: DateRange): TransactionFilters {
  return {
    search: '',
    types: new Set(),
    details: new Set(),
    accounts: new Set(),
    startDate: toIsoDate(range.start),
    endDate: toIsoDate(range.end),
  }
}

export function hasActiveFilters(filters: TransactionFilters, range: DateRange): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.types.size > 0 ||
    filters.details.size > 0 ||
    filters.accounts.size > 0 ||
    filters.startDate !== toIsoDate(range.start) ||
    filters.endDate !== toIsoDate(range.end)
  )
}

// Distinct plaidCategoryPrimary values actually present in `transactions`,
// as {value, label} pairs sorted alphabetically by label — these are the
// options offered in the "Add category" dropdown, generated from real data
// rather than the full Plaid taxonomy, same "only show what's actually
// there" convention as CategoryBreakdownBar omitting zero-spend categories.
// Transactions missing plaidCategoryPrimary (optional — see
// PlaidTransaction) simply don't contribute an option.
export function getDistinctTypes(
  transactions: PlaidTransaction[]
): { value: string; label: string }[] {
  const values = new Set(
    transactions.map((t) => t.plaidCategoryPrimary).filter((v): v is string => Boolean(v))
  )
  return [...values]
    .map((value) => ({ value, label: primaryLabel(value) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

// Same idea for plaidCategory (the detailed/secondary bucket) — options for
// the "Add subcategory" dropdown. Labeled via each transaction's own
// plaidCategoryPrimary (not a guessed one), since detailLabel needs to know
// which primary prefix to strip.
export function getDistinctDetails(
  transactions: PlaidTransaction[]
): { value: string; label: string }[] {
  const seen = new Map<string, string>()
  for (const t of transactions) {
    if (t.plaidCategory && !seen.has(t.plaidCategory)) {
      seen.set(t.plaidCategory, t.plaidCategoryPrimary ?? '')
    }
  }
  return [...seen.entries()]
    .map(([value, primary]) => ({ value, label: detailLabel(value, primary) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

// Same idea for accountName — always present (not optional), so no filter
// step is needed. Used as the "Add account" dropdown's options.
export function getDistinctAccounts(
  transactions: PlaidTransaction[]
): { value: string; label: string }[] {
  return [...new Set(transactions.map((t) => t.accountName))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }))
}

export function applyTransactionFilters(
  transactions: PlaidTransaction[],
  filters: TransactionFilters
): PlaidTransaction[] {
  const search = filters.search.trim().toLowerCase()
  return transactions.filter((t) => {
    if (search && !t.merchantName.toLowerCase().includes(search)) return false
    if (filters.types.size > 0 && (!t.plaidCategoryPrimary || !filters.types.has(t.plaidCategoryPrimary))) {
      return false
    }
    if (filters.details.size > 0 && !filters.details.has(t.plaidCategory)) return false
    if (filters.accounts.size > 0 && !filters.accounts.has(t.accountName)) return false
    if (t.date < filters.startDate || t.date > filters.endDate) return false
    return true
  })
}
