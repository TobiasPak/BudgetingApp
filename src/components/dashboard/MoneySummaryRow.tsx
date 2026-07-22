import { Banknote, PiggyBank, Receipt } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { useDateFilterStore } from '@/stores/useDateFilterStore'
import { getLeftoverCash, getMonthlyIncome } from '@/lib/income'
import { getTotalSpent } from '@/lib/spending'
import { formatMonthYear } from '@/lib/period'
import { cn, formatCurrency } from '@/lib/utils'

export type PanelTone = 'info' | 'success' | 'warning' | 'destructive'

export const toneClasses: Record<
  PanelTone,
  { icon: string; iconBg: string; text: string }
> = {
  info: { icon: 'text-info', iconBg: 'bg-info/10', text: 'text-info' },
  success: { icon: 'text-success', iconBg: 'bg-success/10', text: 'text-success' },
  warning: { icon: 'text-warning', iconBg: 'bg-warning/10', text: 'text-warning' },
  destructive: {
    icon: 'text-destructive',
    iconBg: 'bg-destructive/10',
    text: 'text-destructive',
  },
}

// Shares the app-wide date filter (useDateFilterStore) — no longer always
// the current month. Labels read "in <Month> <Year>" while browsing a past
// month, and "this month" when back on the current one, so the strip never
// silently claims to be "this month" while actually showing history.
export function MoneySummaryRow() {
  const categories = useBudgetStore((state) => state.categories)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const purchases = useBudgetStore((state) => state.purchases)
  const referenceDate = useDateFilterStore((state) => state.referenceDate)

  const today = new Date()
  const isCurrentMonth =
    referenceDate.getFullYear() === today.getFullYear() &&
    referenceDate.getMonth() === today.getMonth()
  const periodLabel = isCurrentMonth
    ? 'this month'
    : `in ${formatMonthYear(referenceDate)}`

  const monthlyIncome = getMonthlyIncome(paychecks, referenceDate)
  const totalSpent = getTotalSpent(categories, purchases, referenceDate)
  const leftover = getLeftoverCash(paychecks, categories, purchases, referenceDate)
  const spentPercentOfIncome =
    monthlyIncome > 0 ? (totalSpent / monthlyIncome) * 100 : 0
  const leftoverTone: PanelTone = leftover < 0 ? 'destructive' : 'success'

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:divide-x sm:divide-border">
        <Segment
          icon={Banknote}
          tone="success"
          label={`Income ${periodLabel}`}
          value={`$${monthlyIncome.toLocaleString()}`}
        />
        <Segment
          icon={Receipt}
          tone="info"
          label={`Spent ${periodLabel}`}
          value={`$${formatCurrency(totalSpent)}`}
          sub={
            monthlyIncome > 0
              ? `${spentPercentOfIncome.toFixed(0)}% of income`
              : undefined
          }
        />
        <Segment
          icon={PiggyBank}
          tone={leftoverTone}
          label="Left over"
          value={`${leftover < 0 ? '-' : ''}$${formatCurrency(Math.abs(leftover))}`}
        />
      </CardContent>
    </Card>
  )
}

interface SegmentProps {
  icon: typeof Banknote
  tone: PanelTone
  label: string
  value: string
  sub?: string
}

function Segment({ icon: Icon, tone, label, value, sub }: SegmentProps) {
  return (
    <div className="flex flex-1 items-center gap-3 sm:px-4 first:sm:pl-0 last:sm:pr-0">
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          toneClasses[tone].iconBg
        )}
      >
        <Icon className={cn('size-5', toneClasses[tone].icon)} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">
          {value}
          {sub && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {sub}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
