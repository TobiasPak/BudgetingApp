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
// synced from Plaid (not yet wired to a real connection — see the
// "Simulate bank sync" button and functions/src/index.ts), showing only
// money received. Categorizing a transaction here creates a real Paycheck
// from it (see categorizeTransactionAsIncome in useBudgetStore), so it then
// shows up in the source breakdown/totals too, exactly like a manually-
// added paycheck. Standing in for what the not-yet-built AI categorization
// agent would eventually do automatically.
export function IncomeBankActivity({ incomeSources, range }: IncomeBankActivityProps) {
  const plaidTransactions = useBudgetStore((state) => state.plaidTransactions)
  const categorizeTransactionAsIncome = useBudgetStore(
    (state) => state.categorizeTransactionAsIncome
  )

  const transactions = plaidTransactions
    .filter((t) => t.transactionType === 'income' && isDateInRange(t.date, range))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const sourceNameById = new Map(incomeSources.map((s) => [s.id, s.name]))

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
