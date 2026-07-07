import { useState } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency } from '@/lib/utils'
import { isOverBudget, progressPercent } from '@/lib/budget'
import { getCurrentPeriod, formatPeriodRange } from '@/lib/period'
import { getCategorySpent } from '@/lib/purchases'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { CategoryPurchases } from '@/components/budget/CategoryPurchases'
import type { BudgetCategory, ChartColorToken } from '@/types/budget'

const colorClass: Record<ChartColorToken, string> = {
  'chart-1': 'text-chart-1',
  'chart-2': 'text-chart-2',
  'chart-3': 'text-chart-3',
  'chart-4': 'text-chart-4',
  'chart-5': 'text-chart-5',
}

const basisLabel: Record<'paycheck' | 'monthlyIncome', string> = {
  paycheck: 'per paycheck',
  monthlyIncome: 'of monthly income',
}

interface BudgetEnvelopeRowProps {
  category: BudgetCategory
  monthlyTarget: number
  referenceDate: Date
}

export function BudgetEnvelopeRow({
  category,
  monthlyTarget,
  referenceDate,
}: BudgetEnvelopeRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const purchases = useBudgetStore((state) => state.purchases)

  const spent = getCategorySpent(purchases, category, referenceDate)
  const overBudget = isOverBudget(spent, monthlyTarget)
  const Icon = category.icon
  const period = getCurrentPeriod(category.resetDay, referenceDate)

  return (
    <div data-slot="budget-envelope-row">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4"
      >
        {/* Reset cycle — this category's current start/end date range */}
        <div className="text-xs whitespace-nowrap text-muted-foreground sm:w-28 sm:shrink-0">
          {formatPeriodRange(period)}
        </div>

        {/* Category name + overspend indicator */}
        <div className="flex items-center gap-2 sm:w-40 sm:shrink-0">
          <Icon className={cn('size-4 shrink-0', colorClass[category.color])} />
          <span className="truncate text-sm font-medium">{category.name}</span>
          {overBudget && (
            <AlertTriangle
              className="size-4 shrink-0 text-destructive"
              aria-label="Over budget"
            />
          )}
        </div>

        {/* Progress bar — the percentage rule (if any) shows just above it */}
        <div className="flex-1 space-y-1">
          {category.type === 'percentage' && (
            <p className="text-xs text-muted-foreground">
              {category.percent}% {basisLabel[category.basis]}
            </p>
          )}
          <Progress
            value={progressPercent(spent, monthlyTarget)}
            className={cn(
              overBudget && '[&_[data-slot=progress-indicator]]:bg-destructive'
            )}
          />
        </div>

        {/* Spent vs. target */}
        <div
          className={cn(
            'text-sm whitespace-nowrap sm:w-32 sm:shrink-0 sm:text-right',
            overBudget ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          ${formatCurrency(spent)} / $
          {monthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>

        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform sm:ml-1',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <CategoryPurchases category={category} referenceDate={referenceDate} />
      )}
    </div>
  )
}
