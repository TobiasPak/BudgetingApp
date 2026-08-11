import { Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { usePeriodSnapshotStore } from '@/stores/usePeriodSnapshotStore'
import { getPaychecksInRange } from '@/lib/income'
import { annualize, formatRangeLabel, type DateFilterMode, type DateRange } from '@/lib/period'
import { formatCurrency } from '@/lib/utils'
import { AddPaycheckDialog } from '@/components/budget/AddPaycheckDialog'

// Same reasoning as isInMonth in src/lib/income.ts: build the display date
// from the string's own year/month/day rather than `new Date(dateStr)`, to
// avoid the UTC-midnight parsing quirk shifting it a day in some timezones.
function formatPaycheckDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

interface IncomeOverviewProps {
  mode: DateFilterMode
  range: DateRange
}

export function IncomeOverview({ mode, range }: IncomeOverviewProps) {
  const paychecks = useBudgetStore((state) => state.paychecks)
  const currentBankBalance = useBudgetStore((state) => state.bankBalance)
  const hasLinkedBank = useBudgetStore((state) => state.hasLinkedBank)
  const removePaycheck = useBudgetStore((state) => state.removePaycheck)
  const windowIncome = usePeriodSnapshotStore((state) => state.totalIncome)
  const snapshotBankBalance = usePeriodSnapshotStore((state) => state.bankBalance)
  const snapshotBankBalanceAsOf = usePeriodSnapshotStore((state) => state.bankBalanceAsOf)

  const today = new Date()
  const isCurrentWindow =
    mode === 'month'
      ? range.start.getFullYear() === today.getFullYear() &&
        range.start.getMonth() === today.getMonth()
      : range.start.getFullYear() === today.getFullYear()

  // Complementary granularity, mirroring BudgetSummary: an annual projection
  // while viewing a month, a monthly average while viewing a whole year.
  const secondaryLabel = mode === 'month' ? 'Projected this year' : 'Monthly average'
  const secondaryValue =
    mode === 'month' ? annualize(windowIncome, mode) : annualize(windowIncome, mode) / 12
  const rangePaychecks = getPaychecksInRange(paychecks, range)

  // The currently-open period always has the freshest possible number
  // straight off the users/{uid} root doc (no snapshot round-trip needed —
  // plaid-server writes both on every sync anyway). A past period reads its
  // own frozen snapshot instead, since Plaid has no "balance as of a past
  // date" API — bankBalanceAsOf is a real timestamp, formatted with
  // new Date() directly (unlike a bare "YYYY-MM-DD" string, a full ISO
  // datetime string has no UTC-midnight ambiguity to work around).
  const displayedBalance = isCurrentWindow ? currentBankBalance : snapshotBankBalance
  const balanceAsOfLabel =
    !isCurrentWindow && snapshotBankBalanceAsOf
      ? `as of ${new Date(snapshotBankBalanceAsOf).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      : undefined

  const earnedLabel = isCurrentWindow
    ? mode === 'month'
      ? 'Earned this month'
      : 'Earned this year'
    : `Earned in ${formatRangeLabel(mode, range)}`

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Income
        </CardTitle>
        <AddPaycheckDialog range={range} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">{earnedLabel}</p>
            <p className="text-3xl font-bold">${formatCurrency(windowIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{secondaryLabel}</p>
            <p className="text-xl font-semibold">${formatCurrency(secondaryValue)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Bank balance{hasLinkedBank ? ' (from linked bank)' : ''}
            </Label>
            {/* Never a fillable input, in any state — always the real,
                Plaid-sourced number (or an honest "not available"/"connect
                a bank" placeholder). A manual entry would just get
                silently overwritten by the next sync anyway. */}
            {!hasLinkedBank ? (
              <p className="h-8 text-sm leading-8 text-muted-foreground">
                Connect a bank to see your balance
              </p>
            ) : displayedBalance !== undefined ? (
              <p className="h-8 text-xl font-semibold leading-8">
                ${formatCurrency(displayedBalance)}
                {balanceAsOfLabel && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {balanceAsOfLabel}
                  </span>
                )}
              </p>
            ) : (
              <p className="h-8 text-sm leading-8 text-muted-foreground">Not available</p>
            )}
          </div>
        </div>

        {rangePaychecks.length > 0 && (
          <div className="space-y-1 border-t pt-3">
            {rangePaychecks.map((paycheck) => (
              <div
                key={paycheck.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {formatPaycheckDate(paycheck.date)}
                </span>
                <div className="flex items-center gap-2">
                  <span>${paycheck.amount.toLocaleString()}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removePaycheck(paycheck.id, paycheck.date)}
                    aria-label={`Remove paycheck from ${formatPaycheckDate(paycheck.date)}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
