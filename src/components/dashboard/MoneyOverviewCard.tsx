import { PieChart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useBudgetStore } from '@/stores/useBudgetStore'
import {
  getAveragePaycheckAmount,
  getMonthlyIncome,
  getMonthlyTarget,
} from '@/lib/income'

// No dedicated tax-reserve total exists yet (only this month's contribution
// to the "Tax Savings" category) — placeholder mock constant until a real
// running tax-reserve balance is tracked.
const MOCK_TAX_RESERVE = 1100

interface Slice {
  label: string
  amount: number
  colorVar: string
  dotClass: string
}

export function MoneyOverviewCard() {
  const categories = useBudgetStore((state) => state.categories)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const paychecksPerMonth = useBudgetStore((state) => state.paychecksPerMonth)
  const bankBalance = useBudgetStore((state) => state.bankBalance)

  const monthlyIncome = getMonthlyIncome(paychecks)
  const averagePaycheckAmount = getAveragePaycheckAmount(paychecks)
  const targetContext = { monthlyIncome, averagePaycheckAmount, paychecksPerMonth }

  const totalBudgeted = categories.reduce(
    (sum, c) => sum + getMonthlyTarget(c, targetContext),
    0
  )
  const totalSpent = categories.reduce((sum, c) => sum + c.monthlySpent, 0)
  const remainingBudget = Math.max(totalBudgeted - totalSpent, 0)

  const slices: Slice[] = [
    { label: 'Spent', amount: totalSpent, colorVar: 'var(--info)', dotClass: 'bg-info' },
    {
      label: 'Tax reserve',
      amount: MOCK_TAX_RESERVE,
      colorVar: 'var(--destructive)',
      dotClass: 'bg-destructive',
    },
    {
      label: 'Remaining budget',
      amount: remainingBudget,
      colorVar: 'var(--warning)',
      dotClass: 'bg-warning',
    },
    {
      label: 'Available balance',
      amount: bankBalance,
      colorVar: 'var(--success)',
      dotClass: 'bg-success',
    },
  ]

  const total = slices.reduce((sum, s) => sum + s.amount, 0)

  let cursor = 0
  const stops = slices.map((slice) => {
    const start = cursor
    const percent = total > 0 ? (slice.amount / total) * 100 : 0
    cursor += percent
    return `${slice.colorVar} ${start}% ${cursor}%`
  })

  return (
    <Card className="h-full min-h-[200px]">
      <CardContent className="flex h-full flex-col items-center text-center">
        <div className="mb-2 flex w-full items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-info/10">
            <PieChart className="size-4 text-info" />
          </div>
          <span className="text-sm text-muted-foreground">
            Money overview &middot; this month
          </span>
        </div>

        <div
          className="relative my-2 size-44 rounded-full"
          style={{ background: `conic-gradient(${stops.join(', ')})` }}
        >
          <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-card">
            <span className="text-xl font-semibold">${total.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">total funds</span>
          </div>
        </div>

        <div className="mt-2 w-full max-w-[260px]">
          {slices.map((slice) => (
            <div key={slice.label} className="flex items-center gap-2 py-1.5">
              <span className={`size-2 shrink-0 rounded-full ${slice.dotClass}`} />
              <span className="flex-1 text-left text-sm">{slice.label}</span>
              <span className="text-sm font-medium">
                ${slice.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
