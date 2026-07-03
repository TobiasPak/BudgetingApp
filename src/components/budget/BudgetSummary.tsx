import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { useBudgetStore } from '@/stores/useBudgetStore'
import {
  getAveragePaycheckAmount,
  getMonthlyIncome,
  getMonthlyTarget,
} from '@/lib/income'
import { getCategorySpent } from '@/lib/purchases'

export function BudgetSummary() {
  const categories = useBudgetStore((state) => state.categories)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const purchases = useBudgetStore((state) => state.purchases)
  const paychecksPerMonth = useBudgetStore((state) => state.paychecksPerMonth)

  const monthlyIncome = getMonthlyIncome(paychecks)
  const averagePaycheckAmount = getAveragePaycheckAmount(paychecks)
  const targetContext = { monthlyIncome, averagePaycheckAmount, paychecksPerMonth }

  const monthlyBudgeted = categories.reduce(
    (sum, c) => sum + getMonthlyTarget(c, targetContext),
    0
  )
  const monthlySpent = categories.reduce(
    (sum, c) => sum + getCategorySpent(purchases, c),
    0
  )
  const yearlyBudgeted = monthlyBudgeted * 12
  const yearlySpent = monthlySpent * 12

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              'text-2xl font-semibold',
              monthlySpent > monthlyBudgeted && 'text-destructive'
            )}
          >
            ${formatCurrency(monthlySpent)}{' '}
            <span className="text-base font-normal text-muted-foreground">
              / ${monthlyBudgeted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Yearly
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              'text-2xl font-semibold',
              yearlySpent > yearlyBudgeted && 'text-destructive'
            )}
          >
            ${formatCurrency(yearlySpent)}{' '}
            <span className="text-base font-normal text-muted-foreground">
              / ${yearlyBudgeted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
