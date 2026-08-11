import { Plus, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { toIsoDate, type DateRange } from '@/lib/period'
import {
  createEmptyFilters,
  getDistinctAccounts,
  getDistinctDetails,
  getDistinctTypes,
  hasActiveFilters,
  type TransactionFilters,
} from '@/lib/plaidTransactionFilters'
import type { PlaidTransaction } from '@/types/plaidTransaction'

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return next
}

interface FilterFacetPickerProps {
  label: string
  options: { value: string; label: string }[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}

// One "Add <facet>" button + Popover checkbox list — shared shape for all
// three facets below (category/subcategory/account). Selecting an option
// both adds its pill (rendered by the parent, not here — see
// TransactionFilterBar's shared pill row) and leaves the dropdown open, so
// several values can be added in one pass; unchecking here removes a pill
// exactly like clicking its X does. Mirrors PlaidCategoryPicker's
// chips+Popover+Checkbox pattern (src/components/budget/
// PlaidCategoryPicker.tsx) but as three independent flat facets instead of
// one primary/detail tree, since the user asked for primary and secondary
// buckets to be separately addable, not nested.
function FilterFacetPicker({ label, options, selected, onChange }: FilterFacetPickerProps) {
  if (options.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="size-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-64 overflow-y-auto">
        <div className="space-y-1">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={selected.has(option.value)}
                onCheckedChange={() => onChange(toggle(selected, option.value))}
              />
              {option.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface FilterPill {
  key: string
  label: string
  onRemove: () => void
}

interface TransactionFilterBarProps {
  // The type/range-filtered candidate list (before this bar's own filters
  // apply) — facet dropdown options are generated from this, so they
  // reflect what's actually in the current month/year, not the full Plaid
  // taxonomy.
  transactions: PlaidTransaction[]
  range: DateRange
  filters: TransactionFilters
  onFiltersChange: (filters: TransactionFilters) => void
}

// Shared by SpendingBankActivity/IncomeBankActivity — a search box, three
// explicit "Add <facet>" pickers (category/subcategory/account, each an
// independent multi-select over what's actually present in the current
// month/year), and a date sub-range, layered on top of whichever
// month/year the shared date filter already has selected. Lives in
// components/plaid/ rather than components/spending/ or components/income/
// since it's genuinely shared, Plaid-transaction-shaped UI, not tied to
// either feature's own data model.
//
// Filters are opt-in by design — nothing is pre-selected from what's
// present (an earlier version auto-rendered a pill per distinct
// type/account, which the user found confusing and asked to replace with
// an explicit add-a-filter flow instead).
export function TransactionFilterBar({
  transactions,
  range,
  filters,
  onFiltersChange,
}: TransactionFilterBarProps) {
  const typeOptions = getDistinctTypes(transactions)
  const detailOptions = getDistinctDetails(transactions)
  const accountOptions = getDistinctAccounts(transactions)
  const rangeStartIso = toIsoDate(range.start)
  const rangeEndIso = toIsoDate(range.end)

  const typeLabelByValue = new Map(typeOptions.map((o) => [o.value, o.label]))
  const detailLabelByValue = new Map(detailOptions.map((o) => [o.value, o.label]))
  const accountLabelByValue = new Map(accountOptions.map((o) => [o.value, o.label]))

  const pills: FilterPill[] = [
    ...[...filters.types].map((value) => ({
      key: `type:${value}`,
      label: `Category: ${typeLabelByValue.get(value) ?? value}`,
      onRemove: () => onFiltersChange({ ...filters, types: toggle(filters.types, value) }),
    })),
    ...[...filters.details].map((value) => ({
      key: `detail:${value}`,
      label: `Subcategory: ${detailLabelByValue.get(value) ?? value}`,
      onRemove: () => onFiltersChange({ ...filters, details: toggle(filters.details, value) }),
    })),
    ...[...filters.accounts].map((value) => ({
      key: `account:${value}`,
      label: `Account: ${accountLabelByValue.get(value) ?? value}`,
      onRemove: () => onFiltersChange({ ...filters, accounts: toggle(filters.accounts, value) }),
    })),
  ]

  return (
    <div className="space-y-2.5 pb-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder="Search by merchant…"
          className="h-8 pl-8 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterFacetPicker
          label="Category"
          options={typeOptions}
          selected={filters.types}
          onChange={(next) => onFiltersChange({ ...filters, types: next })}
        />
        <FilterFacetPicker
          label="Subcategory"
          options={detailOptions}
          selected={filters.details}
          onChange={(next) => onFiltersChange({ ...filters, details: next })}
        />
        <FilterFacetPicker
          label="Account"
          options={accountOptions}
          selected={filters.accounts}
          onChange={(next) => onFiltersChange({ ...filters, accounts: next })}
        />
      </div>

      {pills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pills.map((pill) => (
            <span
              key={pill.key}
              className={cn(
                'inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground'
              )}
            >
              {pill.label}
              <button
                type="button"
                onClick={pill.onRemove}
                aria-label={`Remove ${pill.label}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="tx-filter-start">
            From
          </label>
          <Input
            id="tx-filter-start"
            type="date"
            className="h-8 w-36 text-xs"
            min={rangeStartIso}
            max={filters.endDate}
            value={filters.startDate}
            onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="tx-filter-end">
            To
          </label>
          <Input
            id="tx-filter-end"
            type="date"
            className="h-8 w-36 text-xs"
            min={filters.startDate}
            max={rangeEndIso}
            value={filters.endDate}
            onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
          />
        </div>
        {hasActiveFilters(filters, range) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange(createEmptyFilters(range))}
          >
            <X className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
