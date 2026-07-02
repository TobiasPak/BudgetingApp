import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { isOverBudget, progressPercent } from '@/lib/budget'
import type { BudgetCategory, ChartColorToken } from '@/types/budget'

const colorClass: Record<ChartColorToken, string> = {
  'chart-1': 'text-chart-1',
  'chart-2': 'text-chart-2',
  'chart-3': 'text-chart-3',
  'chart-4': 'text-chart-4',
  'chart-5': 'text-chart-5',
}

export function BudgetEnvelopeCard({ category }: { category: BudgetCategory }) {
  const overBudget = isOverBudget(category)
  const Icon = category.icon

  return (
    <Card data-slot="budget-envelope-card">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Icon className={cn('size-4', colorClass[category.color])} />
        <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
        {overBudget && (
          <AlertTriangle
            className="ml-auto size-4 text-destructive"
            aria-label="Over budget"
          />
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress
          value={progressPercent(category)}
          className={cn(
            overBudget && '[&_[data-slot=progress-indicator]]:bg-destructive'
          )}
        />
        <p
          className={cn(
            'text-sm text-muted-foreground',
            overBudget && 'text-destructive'
          )}
        >
          ${category.monthlySpent.toLocaleString()} / $
          {category.monthlyBudgeted.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}
