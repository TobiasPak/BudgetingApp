import { Receipt, Wallet, Banknote, Landmark } from 'lucide-react'
import { DashboardPanel } from '@/components/dashboard/DashboardPanel'
import { MoneyOverviewCard } from '@/components/dashboard/MoneyOverviewCard'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { isOverBudget } from '@/lib/budget'

const overBudgetListFormatter = new Intl.ListFormat('en', {
  style: 'long',
  type: 'conjunction',
})

export default function HomePage() {
  const categories = useBudgetStore((state) => state.categories)
  const totalBudgeted = categories.reduce((sum, c) => sum + c.monthlyBudgeted, 0)
  const totalSpent = categories.reduce((sum, c) => sum + c.monthlySpent, 0)
  const overCategories = categories.filter(isOverBudget)
  const onTrackCount = categories.length - overCategories.length

  const budgetInsight =
    overCategories.length === 0
      ? 'All categories are within budget.'
      : `${overBudgetListFormatter.format(overCategories.map((c) => c.name))} ${
          overCategories.length > 1 ? 'are' : 'is'
        } over budget.`

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">ClearBooks</h1>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(160px,1fr)_minmax(260px,1.3fr)_minmax(160px,1fr)]">
        <div className="flex flex-col gap-3">
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
                ${totalSpent.toLocaleString()}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  / ${totalBudgeted.toLocaleString()}
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

        <div className="flex flex-col gap-3">
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
