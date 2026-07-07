import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { getCategorySpent } from '@/lib/purchases'
import type { BudgetCategory, ChartColorToken } from '@/types/budget'
import type { Purchase } from '@/types/purchase'

// A distinct, colorful qualitative palette purely for this breakdown chart —
// the app's existing `--chart-1..5` tokens (used for category icons
// elsewhere, e.g. BudgetEnvelopeRow) are grayscale in the installed Nova
// preset, so reusing them here would make the bar/legend monotone. Same
// "extend the theme with a real token rather than fake it" approach used
// for --success/--info/--warning.
const segmentColorClass: Record<ChartColorToken, string> = {
  'chart-1': 'bg-category-1',
  'chart-2': 'bg-category-2',
  'chart-3': 'bg-category-3',
  'chart-4': 'bg-category-4',
  'chart-5': 'bg-category-5',
}

export type BudgetMetric = 'income' | 'monthlyBudgeted' | 'yearlyBudgeted'

const metricLabel: Record<BudgetMetric, string> = {
  income: '% of monthly income',
  monthlyBudgeted: '% of total monthly budget',
  yearlyBudgeted: '% of total yearly budget',
}

interface CategoryBreakdownBarProps {
  categories: BudgetCategory[]
  purchases: Purchase[]
  referenceDate: Date
  metric: BudgetMetric
  monthlyIncome: number
  monthlyBudgeted: number
  yearlyBudgeted: number
  monthlySpent: number
  yearlySpent: number
}

export function CategoryBreakdownBar({
  categories,
  purchases,
  referenceDate,
  metric,
  monthlyIncome,
  monthlyBudgeted,
  yearlyBudgeted,
  monthlySpent,
  yearlySpent,
}: CategoryBreakdownBarProps) {
  const total =
    metric === 'income'
      ? monthlyIncome
      : metric === 'monthlyBudgeted'
        ? monthlyBudgeted
        : yearlyBudgeted
  const spentAmount = metric === 'yearlyBudgeted' ? yearlySpent : monthlySpent

  const breakdown = categories
    .map((category) => {
      const monthlySpent = getCategorySpent(purchases, category, referenceDate)
      const amount = metric === 'yearlyBudgeted' ? monthlySpent * 12 : monthlySpent
      const percent = total > 0 ? (amount / total) * 100 : 0
      return { category, amount, percent }
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const hasSpending = breakdown.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Category breakdown — {metricLabel[metric]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasSpending ? (
          <>
            <div className="relative h-7 w-full overflow-hidden rounded-full bg-muted">
              <div className="flex h-full w-full">
                {breakdown.map(({ category, percent }) => (
                  <div
                    key={category.id}
                    className={cn(
                      'h-full transition-all',
                      segmentColorClass[category.color]
                    )}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                    title={`${category.name}: ${percent.toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <span className="rounded bg-background/85 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-foreground shadow-sm">
                  ${formatCurrency(spentAmount)}{' '}
                  <span className="font-normal text-muted-foreground">
                    / ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
              {breakdown.map(({ category, amount, percent }) => {
                const Icon = category.icon
                return (
                  <div key={category.id} className="flex items-start gap-2">
                    <span
                      className={cn(
                        'mt-1 size-2.5 shrink-0 rounded-full',
                        segmentColorClass[category.color]
                      )}
                    />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate text-sm font-medium">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{category.name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {percent.toFixed(1)}%
                        </span>{' '}
                        · ${formatCurrency(amount)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No spending logged for this period yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
