import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { isDateInRange, type DateRange } from '@/lib/period'
import { useBudgetStore } from '@/stores/useBudgetStore'
import type { BudgetCategory } from '@/types/budget'

// Same reasoning as elsewhere in this app: build the display date from the
// string's own year/month/day rather than `new Date(dateStr)`, to avoid the
// UTC-midnight parsing shift.
function formatTransactionDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

interface SpendingBankActivityProps {
  categories: BudgetCategory[]
  range: DateRange
}

// A "logs" view of raw bank transactions synced from Plaid (not yet wired
// to a real connection — see the "Simulate bank sync" button and
// functions/src/index.ts) — distinct from the category rows above it,
// which only ever show already-categorized Purchase records. Categorizing
// a transaction here creates a real Purchase from it (see
// categorizeTransactionAsSpending in useBudgetStore), so it then shows up
// in the category breakdown/totals too, exactly like a manually-added
// purchase. Standing in for what the not-yet-built AI categorization agent
// would eventually do automatically.
export function SpendingBankActivity({ categories, range }: SpendingBankActivityProps) {
  const plaidTransactions = useBudgetStore((state) => state.plaidTransactions)
  const categorizeTransactionAsSpending = useBudgetStore(
    (state) => state.categorizeTransactionAsSpending
  )

  const transactions = plaidTransactions
    .filter((t) => t.transactionType === 'spending' && isDateInRange(t.date, range))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))

  if (transactions.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Bank activity
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {transaction.merchantName}
                </span>
                {transaction.pending && (
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
                    Pending
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {formatTransactionDate(transaction.date)} · {transaction.plaidCategory}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:shrink-0">
              <span className="text-sm font-medium whitespace-nowrap">
                ${formatCurrency(transaction.amount)}
              </span>
              {transaction.categoryId ? (
                <span
                  className={cn(
                    'rounded-full bg-success/10 px-2 py-0.5 text-xs whitespace-nowrap text-success'
                  )}
                >
                  {categoryNameById.get(transaction.categoryId) ?? 'Categorized'}
                </span>
              ) : categories.length > 0 ? (
                <Select
                  onValueChange={(categoryId) =>
                    categorizeTransactionAsSpending(transaction.id, categoryId, {
                      date: transaction.date,
                      description: transaction.merchantName,
                      amount: transaction.amount,
                    })
                  }
                >
                  <SelectTrigger className="w-36 text-xs" size="sm">
                    <SelectValue placeholder="Categorize…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Add a category first
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
