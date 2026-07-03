import { Receipt, Wallet, Banknote, Landmark } from 'lucide-react'
import { DashboardPanel } from '@/components/dashboard/DashboardPanel'
import { MoneyOverviewCard } from '@/components/dashboard/MoneyOverviewCard'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { isOverBudget } from '@/lib/budget'
import {
  getAveragePaycheckAmount,
  getMonthlyIncome,
  getMonthlyTarget,
} from '@/lib/income'
import { getCategorySpent } from '@/lib/purchases'
import { formatCurrency } from '@/lib/utils'

const overBudgetListFormatter = new Intl.ListFormat('en', {
  style: 'long',
  type: 'conjunction',
})

export default function HomePage() {
  const categories = useBudgetStore((state) => state.categories)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const purchases = useBudgetStore((state) => state.purchases)
  const paychecksPerMonth = useBudgetStore((state) => state.paychecksPerMonth)

  const monthlyIncome = getMonthlyIncome(paychecks)
  const averagePaycheckAmount = getAveragePaycheckAmount(paychecks)
  const targetContext = { monthlyIncome, averagePaycheckAmount, paychecksPerMonth }

  const totalBudgeted = categories.reduce(
    (sum, c) => sum + getMonthlyTarget(c, targetContext),
    0
  )
  const totalSpent = categories.reduce(
    (sum, c) => sum + getCategorySpent(purchases, c),
    0
  )
  const overCategories = categories.filter((c) =>
    isOverBudget(getCategorySpent(purchases, c), getMonthlyTarget(c, targetContext))
  )
  const onTrackCount = categories.length - overCategories.length

  const budgetInsight =
    overCategories.length === 0
      ? 'All categories are within budget.'
      : `${overBudgetListFormatter.format(overCategories.map((c) => c.name))} ${
          overCategories.length > 1 ? 'are' : 'is'
        } over budget.`

  return (
    <main className="flex flex-col gap-4 px-6 py-6 md:h-screen">
      <h1 className="text-2xl font-semibold tracking-tight">ClearBooks</h1>

      <div className="grid grid-cols-1 gap-3 md:min-h-0 md:flex-1 md:grid-cols-[minmax(160px,1fr)_minmax(260px,1.3fr)_minmax(160px,1fr)] md:grid-rows-1">
        <div className="flex flex-col gap-3 md:h-full">
          {/* Mock content — no Spending feature/store built yet. */}
          <DashboardPanel
            icon={Receipt}
            tone="info"
            label="Spending"
            value="$2,847"
            sub="This month · 71% of budget"
            trend={{ percent: 12, direction: 'up', tone: 'destructive' }}
            progressValue={71}
            insight="Dining out is your fastest-growing category."
          />

          <DashboardPanel
            icon={Wallet}
            tone="warning"
            label="Budget"
            value={
              <>
                ${formatCurrency(totalSpent)}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  / $
                  {totalBudgeted.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </>
            }
            sub={`${Math.round(
              (totalSpent / totalBudgeted) * 100
            )}% used · ${onTrackCount} of ${categories.length} on track`}
            progressValue={Math.min((totalSpent / totalBudgeted) * 100, 100)}
            insight={budgetInsight}
            href="/budget"
          />
        </div>

        <MoneyOverviewCard />

        <div className="flex flex-col gap-3 md:h-full">
          {/* Mock content — no Income feature/store built yet. */}
          <DashboardPanel
            icon={Banknote}
            tone="success"
            label="Income"
            value="$6,200"
            sub="Year to date · 3 sources"
            trend={{ percent: 8, direction: 'up', tone: 'success' }}
            progressValue={68}
            insight="Gig income (1099-K) is up 40% this quarter."
          />

          {/* Mock content — no Tax feature/store built yet. */}
          <DashboardPanel
            icon={Landmark}
            tone="destructive"
            label="Tax"
            value="$1,840 owed"
            sub="Q3 estimated · due Sep 15"
            progressValue={60}
            insight="Save $185/mo more to fully cover Q3."
          />
        </div>
      </div>
    </main>
  )
}
