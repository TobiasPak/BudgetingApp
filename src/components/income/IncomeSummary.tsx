import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { getMonthlyIncome, getYearlyProjectedIncome } from '@/lib/income'
import {
  IncomeSourcesPieChart,
  type IncomeMetric,
} from '@/components/income/IncomeSourcesPieChart'

interface IncomeSummaryProps {
  referenceDate: Date
}

// Same selectable-card-drives-chart-below pattern as BudgetSummary/
// SpendingSummary — clicking a card highlights it and switches the pie
// chart/legend to that metric's percentages.
function selectableCardClass(isSelected: boolean): string {
  return cn(
    'cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/50',
    isSelected && 'ring-2 ring-primary'
  )
}

export function IncomeSummary({ referenceDate }: IncomeSummaryProps) {
  const incomeSources = useBudgetStore((state) => state.incomeSources)
  const paychecks = useBudgetStore((state) => state.paychecks)

  const [selectedMetric, setSelectedMetric] = useState<IncomeMetric>('monthly')

  const monthlyIncome = getMonthlyIncome(paychecks, referenceDate)
  const yearlyIncome = getYearlyProjectedIncome(monthlyIncome)

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
              Earned This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${formatCurrency(monthlyIncome)}</p>
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
              Projected This Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${formatCurrency(yearlyIncome)}</p>
          </CardContent>
        </Card>
      </div>

      <IncomeSourcesPieChart
        sources={incomeSources}
        paychecks={paychecks}
        referenceDate={referenceDate}
        metric={selectedMetric}
        monthlyIncome={monthlyIncome}
        yearlyIncome={yearlyIncome}
      />
    </div>
  )
}
