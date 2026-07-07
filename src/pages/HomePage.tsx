import { Receipt, Wallet, Banknote, Landmark } from 'lucide-react'
import { DashboardPanel } from '@/components/dashboard/DashboardPanel'
import { MoneyOverviewCard } from '@/components/dashboard/MoneyOverviewCard'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { isOverBudget } from '@/lib/budget'
import {
  getAveragePaycheckAmount,
  getMonthlyIncome,
  getMonthlyTarget,
  getSourceMonthlyIncome,
  getYearlyProjectedIncome,
} from '@/lib/income'
import { getCategorySpent } from '@/lib/purchases'
import { getTotalSpent } from '@/lib/spending'
import { formatCurrency } from '@/lib/utils'

const overBudgetListFormatter = new Intl.ListFormat('en', {
  style: 'long',
  type: 'conjunction',
})

export default function HomePage() {
  const categories = useBudgetStore((state) => state.categories)
  const incomeSources = useBudgetStore((state) => state.incomeSources)
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

  const totalSpentThisMonth = getTotalSpent(categories, purchases)
  const spentPercentOfIncome =
    monthlyIncome > 0 ? (totalSpentThisMonth / monthlyIncome) * 100 : 0
  const topSpendingCategory = categories
    .map((c) => ({ category: c, spent: getCategorySpent(purchases, c) }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)[0]?.category

  const spendingInsight = topSpendingCategory
    ? `${topSpendingCategory.name} is your top spending category this month.`
    : 'No spending logged yet this month.'

  const yearlyProjectedIncome = getYearlyProjectedIncome(monthlyIncome)
  const sourceBreakdown = incomeSources
    .map((source) => ({
      source,
      amount: getSourceMonthlyIncome(paychecks, source.id),
    }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount)
  const topIncomeSource = sourceBreakdown[0]
  const topSourcePercent =
    topIncomeSource && monthlyIncome > 0
      ? (topIncomeSource.amount / monthlyIncome) * 100
      : 0

  const incomeInsight = topIncomeSource
    ? `${topIncomeSource.source.name} makes up ${topSourcePercent.toFixed(0)}% of income this month.`
    : 'No income logged yet this month.'

  return (
    <main className="flex flex-col gap-4 px-6 py-6 md:h-screen">
      <h1 className="text-2xl font-semibold tracking-tight">ClearBooks</h1>

      <div className="grid grid-cols-1 gap-3 md:min-h-0 md:flex-1 md:grid-cols-[minmax(160px,1fr)_minmax(260px,1.3fr)_minmax(160px,1fr)] md:grid-rows-1">
        <div className="flex flex-col gap-3 md:h-full">
          <DashboardPanel
            icon={Receipt}
            tone="info"
            label="Spending"
            value={
              <>
                ${formatCurrency(totalSpentThisMonth)}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  / ${monthlyIncome.toLocaleString()}
                </span>
              </>
            }
            sub={
              monthlyIncome > 0
                ? `${spentPercentOfIncome.toFixed(0)}% of income this month`
                : 'This month'
            }
            progressValue={Math.min(spentPercentOfIncome, 100)}
            insight={spendingInsight}
            href="/spending"
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
          <DashboardPanel
            icon={Banknote}
            tone="success"
            label="Income"
            value={
              <>
                ${formatCurrency(monthlyIncome)}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  / $
                  {yearlyProjectedIncome.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                  /yr
                </span>
              </>
            }
            sub={`This month · ${sourceBreakdown.length} of ${incomeSources.length} sources`}
            progressValue={Math.min(topSourcePercent, 100)}
            insight={incomeInsight}
            href="/income"
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
