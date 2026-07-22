import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency } from '@/lib/utils'
import { IncomeSourcePaychecks } from '@/components/income/IncomeSourcePaychecks'
import type { DateRange } from '@/lib/period'
import type { IncomeSource } from '@/types/incomeSource'
import type { ChartColorToken } from '@/types/budget'

const colorClass: Record<ChartColorToken, string> = {
  'chart-1': 'text-chart-1',
  'chart-2': 'text-chart-2',
  'chart-3': 'text-chart-3',
  'chart-4': 'text-chart-4',
  'chart-5': 'text-chart-5',
}

interface IncomeSourceRowProps {
  source: IncomeSource
  windowAmount: number
  percentOfIncome: number
  range: DateRange
}

export function IncomeSourceRow({
  source,
  windowAmount,
  percentOfIncome,
  range,
}: IncomeSourceRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const Icon = source.icon

  return (
    <div data-slot="income-source-row">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="flex items-center gap-2 sm:w-40 sm:shrink-0">
          <Icon className={cn('size-4 shrink-0', colorClass[source.color])} />
          <span className="truncate text-sm font-medium">{source.name}</span>
        </div>

        <div className="flex-1">
          <Progress value={Math.min(percentOfIncome, 100)} />
        </div>

        <div className="text-sm whitespace-nowrap text-muted-foreground sm:w-40 sm:shrink-0 sm:text-right">
          ${formatCurrency(windowAmount)}{' '}
          <span className="text-xs">
            ({percentOfIncome > 0 ? `${percentOfIncome.toFixed(1)}%` : '—'})
          </span>
        </div>

        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform sm:ml-1',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && <IncomeSourcePaychecks source={source} range={range} />}
    </div>
  )
}
