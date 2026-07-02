import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useBudgetStore } from '@/stores/useBudgetStore'

export function BudgetSummary() {
  const categories = useBudgetStore((state) => state.categories)

  const monthlyBudgeted = categories.reduce((sum, c) => sum + c.monthlyBudgeted, 0)
  const monthlySpent = categories.reduce((sum, c) => sum + c.monthlySpent, 0)
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
            ${monthlySpent.toLocaleString()}{' '}
            <span className="text-base font-normal text-muted-foreground">
              / ${monthlyBudgeted.toLocaleString()}
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
            ${yearlySpent.toLocaleString()}{' '}
            <span className="text-base font-normal text-muted-foreground">
              / ${yearlyBudgeted.toLocaleString()}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
