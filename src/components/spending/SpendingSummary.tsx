import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { usePeriodSnapshotStore } from '@/stores/usePeriodSnapshotStore'
import { annualize, type DateFilterMode, type DateRange } from '@/lib/period'
import {
  SpendingPieChart,
  type SpendingMetric,
} from '@/components/spending/SpendingPieChart'

interface SpendingSummaryProps {
  mode: DateFilterMode
  range: DateRange
}

// Same selectable-card-drives-chart-below pattern as BudgetSummary/
// CategoryBreakdownBar — clicking a card highlights it and switches the pie
// chart/legend to that metric's percentages.
function selectableCardClass(isSelected: boolean): string {
  return cn(
    'cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/50',
    isSelected && 'ring-2 ring-primary'
  )
}

export function SpendingSummary({ mode, range }: SpendingSummaryProps) {
  const categories = useBudgetStore((state) => state.categories)
  const purchases = useBudgetStore((state) => state.purchases)
  const windowSpent = usePeriodSnapshotStore((state) => state.totalSpent)

  const [selectedMetric, setSelectedMetric] = useState<SpendingMetric>('window')

  // Complementary granularity, same pattern as BudgetSummary/IncomeSummary:
  // an annual projection while viewing a month, a monthly average while
  // viewing a whole year.
  const secondarySpent =
    mode === 'month' ? annualize(windowSpent, mode) : annualize(windowSpent, mode) / 12

  const windowLabel = mode === 'month' ? 'Monthly Spent' : 'Yearly Spent'
  const secondaryLabel = mode === 'month' ? 'Yearly Spent' : 'Monthly Average'

  const metricLabel: Record<SpendingMetric, string> = {
    window: mode === 'month' ? '% of monthly spending' : '% of yearly spending',
    secondary:
      mode === 'month' ? '% of yearly spending' : '% of monthly average spending',
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setSelectedMetric('window')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedMetric('window')
            }
          }}
          className={selectableCardClass(selectedMetric === 'window')}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {windowLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${formatCurrency(windowSpent)}</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setSelectedMetric('secondary')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedMetric('secondary')
            }
          }}
          className={selectableCardClass(selectedMetric === 'secondary')}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {secondaryLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${formatCurrency(secondarySpent)}</p>
          </CardContent>
        </Card>
      </div>

      <SpendingPieChart
        categories={categories}
        purchases={purchases}
        range={range}
        mode={mode}
        metric={selectedMetric}
        metricLabel={metricLabel[selectedMetric]}
        windowSpent={windowSpent}
        secondarySpent={secondarySpent}
      />
    </div>
  )
}
