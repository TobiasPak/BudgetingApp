import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { getSourceMonthlyIncome } from '@/lib/income'
import type { ChartColorToken } from '@/types/budget'
import type { IncomeSource } from '@/types/incomeSource'
import type { Paycheck } from '@/types/paycheck'

// Tailwind-registered `--color-category-1..5` vars (see index.css's
// `@theme inline` block) — same token set SpendingPieChart/
// CategoryBreakdownBar use, passed straight to Recharts' `fill` as a CSS
// var reference.
const segmentColor: Record<ChartColorToken, string> = {
  'chart-1': 'var(--color-category-1)',
  'chart-2': 'var(--color-category-2)',
  'chart-3': 'var(--color-category-3)',
  'chart-4': 'var(--color-category-4)',
  'chart-5': 'var(--color-category-5)',
}

export type IncomeMetric = 'monthly' | 'yearly'

const metricLabel: Record<IncomeMetric, string> = {
  monthly: '% of monthly income',
  yearly: '% of yearly projected income',
}

interface IncomeSourcesPieChartProps {
  sources: IncomeSource[]
  paychecks: Paycheck[]
  referenceDate: Date
  metric: IncomeMetric
  monthlyIncome: number
  yearlyIncome: number
}

export function IncomeSourcesPieChart({
  sources,
  paychecks,
  referenceDate,
  metric,
  monthlyIncome,
  yearlyIncome,
}: IncomeSourcesPieChartProps) {
  const total = metric === 'yearly' ? yearlyIncome : monthlyIncome

  const breakdown = sources
    .map((source) => {
      const earnedThisPeriod = getSourceMonthlyIncome(
        paychecks,
        source.id,
        referenceDate
      )
      // Yearly projection per source stays consistent with how yearly
      // income overall is projected elsewhere (monthly × 12).
      const amount = metric === 'yearly' ? earnedThisPeriod * 12 : earnedThisPeriod
      const percent = total > 0 ? (amount / total) * 100 : 0
      return { source, amount, percent }
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const hasIncome = breakdown.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Income breakdown — {metricLabel[metric]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasIncome ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
            <div className="h-56 w-full sm:w-56 sm:shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="amount"
                    nameKey={(item) => item.source.name}
                    innerRadius="55%"
                    outerRadius="90%"
                    paddingAngle={2}
                  >
                    {breakdown.map(({ source }) => (
                      <Cell key={source.id} fill={segmentColor[source.color]} />
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
                    formatter={(value, _name, item) => [
                      `$${formatCurrency(Number(value))}`,
                      item.payload.source.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid flex-1 grid-cols-1 content-center gap-x-4 gap-y-3 sm:grid-cols-2">
              {breakdown.map(({ source, amount, percent }) => {
                const Icon = source.icon
                return (
                  <div key={source.id} className="flex items-start gap-2">
                    <span
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: segmentColor[source.color] }}
                    />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate text-sm font-medium">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{source.name}</span>
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
            No income logged for this period yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
