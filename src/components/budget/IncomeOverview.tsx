import { Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useBudgetStore } from '@/stores/useBudgetStore'
import {
  getCurrentMonthPaychecks,
  getMonthlyIncome,
  getYearlyProjectedIncome,
} from '@/lib/income'
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

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
})

interface IncomeOverviewProps {
  referenceDate: Date
}

export function IncomeOverview({ referenceDate }: IncomeOverviewProps) {
  const paychecks = useBudgetStore((state) => state.paychecks)
  const bankBalance = useBudgetStore((state) => state.bankBalance)
  const setBankBalance = useBudgetStore((state) => state.setBankBalance)
  const removePaycheck = useBudgetStore((state) => state.removePaycheck)

  const today = new Date()
  const isCurrentMonth =
    referenceDate.getFullYear() === today.getFullYear() &&
    referenceDate.getMonth() === today.getMonth()

  const monthlyIncome = getMonthlyIncome(paychecks, referenceDate)
  const yearlyProjected = getYearlyProjectedIncome(monthlyIncome)
  const thisMonthPaychecks = getCurrentMonthPaychecks(paychecks, referenceDate)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Income
        </CardTitle>
        <AddPaycheckDialog referenceDate={referenceDate} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {isCurrentMonth
                ? 'Earned this month'
                : `Earned in ${monthLabelFormatter.format(referenceDate)}`}
            </p>
            <p className="text-3xl font-bold">
              ${monthlyIncome.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projected this year</p>
            <p className="text-xl font-semibold">
              ${yearlyProjected.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="bankBalance" className="text-xs text-muted-foreground">
              Bank balance
            </Label>
            <Input
              id="bankBalance"
              type="number"
              step="0.01"
              value={bankBalance}
              onChange={(e) => setBankBalance(e.target.valueAsNumber || 0)}
              className="h-8 text-xl font-semibold"
            />
          </div>
        </div>

        {thisMonthPaychecks.length > 0 && (
          <div className="space-y-1 border-t pt-3">
            {thisMonthPaychecks.map((paycheck) => (
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
                    onClick={() => removePaycheck(paycheck.id)}
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
