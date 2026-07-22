import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { getCategorySpent } from '@/lib/purchases'
import type { DateFilterMode, DateRange } from '@/lib/period'
import type { BudgetCategory, ChartColorToken } from '@/types/budget'
import type { Purchase } from '@/types/purchase'

// Tailwind-registered `--color-category-1..5` vars (see index.css's
// `@theme inline` block) — same token set CategoryBreakdownBar uses via
// `bg-category-*` classes, but here passed straight to Recharts' `fill` as a
// CSS var reference, the standard shadcn/Recharts charting convention.
const segmentColor: Record<ChartColorToken, string> = {
  'chart-1': 'var(--color-category-1)',
  'chart-2': 'var(--color-category-2)',
  'chart-3': 'var(--color-category-3)',
  'chart-4': 'var(--color-category-4)',
  'chart-5': 'var(--color-category-5)',
}

// 'window' measures against the selected window's own total spend (a month
// or a year, whichever the shared filter is set to); 'secondary' measures
// against the complementary granularity — an annual projection while
// viewing a month, a monthly average while viewing a whole year (see
// SpendingSummary, which computes these and owns the mode-aware labels).
export type SpendingMetric = 'window' | 'secondary'

interface SpendingPieChartProps {
  categories: BudgetCategory[]
  purchases: Purchase[]
  range: DateRange
  mode: DateFilterMode
  metric: SpendingMetric
  metricLabel: string
  windowSpent: number
  secondarySpent: number
}

export function SpendingPieChart({
  categories,
  purchases,
  range,
  mode,
  metric,
  metricLabel,
  windowSpent,
  secondarySpent,
}: SpendingPieChartProps) {
  const total = metric === 'secondary' ? secondarySpent : windowSpent

  const breakdown = categories
    .map((category) => {
      const categorySpent = getCategorySpent(purchases, category, range)
      const amount =
        metric === 'secondary'
          ? mode === 'month'
            ? categorySpent * 12
            : categorySpent / 12
          : categorySpent
      const percent = total > 0 ? (amount / total) * 100 : 0
      return { category, name: category.name, amount, percent }
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const hasSpending = breakdown.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Spending breakdown — {metricLabel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasSpending ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
            <div className="h-56 w-full sm:w-56 sm:shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="90%"
                    paddingAngle={2}
                  >
                    {breakdown.map(({ category }) => (
                      <Cell key={category.id} fill={segmentColor[category.color]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 12,
                    }}
                    formatter={(value, name) => [
                      `$${formatCurrency(Number(value))}`,
                      String(name),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid flex-1 grid-cols-1 content-center gap-x-4 gap-y-3 sm:grid-cols-2">
              {breakdown.map(({ category, amount, percent }) => {
                const Icon = category.icon
                return (
                  <div key={category.id} className="flex items-start gap-2">
                    <span
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: segmentColor[category.color] }}
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
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No spending logged for this period yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
