import { useEffect, useState } from 'react'
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
import { TransactionFilterBar } from '@/components/plaid/TransactionFilterBar'
import { applyTransactionFilters, createEmptyFilters } from '@/lib/plaidTransactionFilters'
import type { IncomeSource } from '@/types/incomeSource'

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

interface IncomeBankActivityProps {
  incomeSources: IncomeSource[]
  range: DateRange
}

// Mirrors SpendingBankActivity — a "logs" view of raw bank transactions
// synced from a real linked Plaid account (see ConnectBankButton), showing
// only money received. Categorizing a transaction here creates a real
// Paycheck from it (see categorizeTransactionAsIncome in useBudgetStore),
// so it then shows up in the source breakdown/totals too, exactly like a
// manually-added paycheck. Standing in for what the not-yet-built AI
// categorization agent would eventually do automatically.
export function IncomeBankActivity({ incomeSources, range }: IncomeBankActivityProps) {
  const plaidTransactions = useBudgetStore((state) => state.plaidTransactions)
  const categorizeTransactionAsIncome = useBudgetStore(
    (state) => state.categorizeTransactionAsIncome
  )

  const [filters, setFilters] = useState(() => createEmptyFilters(range))

  // Mirrors CategoryPurchases's established "re-default on range change"
  // pattern — see SpendingBankActivity's identical effect for the full
  // reasoning.
  useEffect(() => {
    setFilters(createEmptyFilters(range))
  }, [range])

  const candidateTransactions = plaidTransactions
    .filter((t) => t.transactionType === 'income' && isDateInRange(t.date, range))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const transactions = applyTransactionFilters(candidateTransactions, filters)

  const sourceNameById = new Map(incomeSources.map((s) => [s.id, s.name]))

  if (candidateTransactions.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Bank activity
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        <TransactionFilterBar
          transactions={candidateTransactions}
          range={range}
          filters={filters}
          onFiltersChange={setFilters}
        />
        {transactions.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No transactions match these filters.
          </p>
        )}
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {transaction.logoUrl && (
                  <img
                    src={transaction.logoUrl}
                    alt=""
                    className="size-6 shrink-0 rounded"
                  />
                )}
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
                {formatTransactionDate(transaction.date)}
                {transaction.authorizedDate &&
                  transaction.authorizedDate !== transaction.date &&
                  ` (authorized ${formatTransactionDate(transaction.authorizedDate)})`}{' '}
                · {transaction.plaidCategoryPrimary ? `${transaction.plaidCategoryPrimary} · ` : ''}
                {transaction.plaidCategory}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {transaction.accountName}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:shrink-0">
              <span className="text-sm font-medium whitespace-nowrap">
                ${formatCurrency(transaction.amount)}
              </span>
              {transaction.sourceId ? (
                <span
                  className={cn(
                    'rounded-full bg-success/10 px-2 py-0.5 text-xs whitespace-nowrap text-success'
                  )}
                >
                  {sourceNameById.get(transaction.sourceId) ?? 'Categorized'}
                </span>
              ) : incomeSources.length > 0 ? (
                <Select
                  onValueChange={(sourceId) =>
                    categorizeTransactionAsIncome(transaction.id, sourceId, {
                      date: transaction.date,
                      amount: transaction.amount,
                    })
                  }
                >
                  <SelectTrigger className="w-36 text-xs" size="sm">
                    <SelectValue placeholder="Categorize…" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeSources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Add a source first
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
