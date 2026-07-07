import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { getTotalSpent } from '@/lib/spending'
import {
  SpendingPieChart,
  type SpendingMetric,
} from '@/components/spending/SpendingPieChart'

interface SpendingSummaryProps {
  referenceDate: Date
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

export function SpendingSummary({ referenceDate }: SpendingSummaryProps) {
  const categories = useBudgetStore((state) => state.categories)
  const purchases = useBudgetStore((state) => state.purchases)

  const [selectedMetric, setSelectedMetric] = useState<SpendingMetric>('monthly')

  const monthlySpent = getTotalSpent(categories, purchases, referenceDate)
  const yearlySpent = monthlySpent * 12

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setSelectedMetric('monthly')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedMetric('monthly')
            }
          }}
          className={selectableCardClass(selectedMetric === 'monthly')}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${formatCurrency(monthlySpent)}</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setSelectedMetric('yearly')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedMetric('yearly')
            }
          }}
          className={selectableCardClass(selectedMetric === 'yearly')}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Yearly Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${formatCurrency(yearlySpent)}</p>
          </CardContent>
        </Card>
      </div>

      <SpendingPieChart
        categories={categories}
        purchases={purchases}
        referenceDate={referenceDate}
        metric={selectedMetric}
        monthlySpent={monthlySpent}
        yearlySpent={yearlySpent}
      />
    </div>
  )
}
