import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { PlaidCategoryGroup } from '@/lib/plaidCategories'

interface PlaidCategoryPickerProps {
  groups: PlaidCategoryGroup[]
  value: string[]
  onChange: (value: string[]) => void
}

function labelFor(bucketValue: string, groups: PlaidCategoryGroup[]): string {
  for (const group of groups) {
    if (group.primary === bucketValue) return group.label
    const detail = group.details.find((d) => d.value === bucketValue)
    if (detail) return `${group.label} → ${detail.label}`
  }
  return bucketValue
}

// Auto-categorize bucket picker — matches an approved mockup: removable
// chips for whatever's selected, and a Popover-hosted checkbox tree
// (primary bucket groups, each with a checkbox for "match the whole
// bucket" plus individually-checkable detailed children). Shared by
// AddBudgetDialog/AddIncomeSourceDialog and their edit-buckets dialogs —
// see src/lib/plaidCategories.ts for SPENDING_PLAID_CATEGORIES (passed
// here by the budget side) vs. INCOME_PLAID_CATEGORY (income side).
export function PlaidCategoryPicker({ groups, value, onChange }: PlaidCategoryPickerProps) {
  const selected = new Set(value)

  function toggleDetail(detailValue: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(detailValue)
    else next.delete(detailValue)
    onChange(Array.from(next))
  }

  function togglePrimary(group: PlaidCategoryGroup, checked: boolean) {
    const next = new Set(selected)
    for (const detail of group.details) {
      if (checked) next.add(detail.value)
      else next.delete(detail.value)
    }
    onChange(Array.from(next))
  }

  function removeChip(bucketValue: string) {
    onChange(value.filter((v) => v !== bucketValue))
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((bucketValue) => (
            <span
              key={bucketValue}
              className={cn(
                'inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground'
              )}
            >
              {labelFor(bucketValue, groups)}
              <button
                type="button"
                onClick={() => removeChip(bucketValue)}
                aria-label={`Remove ${labelFor(bucketValue, groups)}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="size-3.5" />
            Select Plaid categories
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-72 w-72 overflow-y-auto">
          <div className="space-y-3">
            {groups.map((group) => {
              const allChecked = group.details.every((d) => selected.has(d.value))
              const someChecked = !allChecked && group.details.some((d) => selected.has(d.value))
              return (
                <div key={group.primary}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                      onCheckedChange={(checked) => togglePrimary(group, checked === true)}
                    />
                    {group.label}
                  </label>
                  <div className="mt-1 space-y-1 pl-6">
                    {group.details.map((detail) => (
                      <label
                        key={detail.value}
                        className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Checkbox
                          checked={selected.has(detail.value)}
                          onCheckedChange={(checked) => toggleDetail(detail.value, checked === true)}
                        />
                        {detail.label}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
