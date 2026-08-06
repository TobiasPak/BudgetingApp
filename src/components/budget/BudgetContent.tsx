import { BudgetEnvelopeRow } from '@/components/budget/BudgetEnvelopeRow'
import { BudgetSummary } from '@/components/budget/BudgetSummary'
import { IncomeOverview } from '@/components/budget/IncomeOverview'
import { AddBudgetDialog } from '@/components/budget/AddBudgetDialog'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { useDateFilterStore, useDateFilterRange } from '@/stores/useDateFilterStore'
import { getTargetForMode } from '@/lib/budget'
import {
  getAveragePaycheckAmount,
  getMonthlyIncomeEquivalent,
  getMonthlyTarget,
} from '@/lib/income'

// Reads mode/range from the shared useDateFilterStore rather than owning
// its own state — this mounts independently (once as the standalone
// BudgetPage, once inside a dashboard tab), but both now deliberately share
// the same date filter rather than navigating independently.
export function BudgetContent() {
  const categories = useBudgetStore((state) => state.categories)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const plaidTransactions = useBudgetStore((state) => state.plaidTransactions)
  const paychecksPerMonth = useBudgetStore((state) => state.paychecksPerMonth)

  const mode = useDateFilterStore((state) => state.mode)
  const range = useDateFilterRange()

  const monthlyIncome = getMonthlyIncomeEquivalent(paychecks, plaidTransactions, mode, range)
  const averagePaycheckAmount = getAveragePaycheckAmount(paychecks)
  const targetContext = { monthlyIncome, averagePaycheckAmount, paychecksPerMonth }

  return (
    <>
      <IncomeOverview mode={mode} range={range} />

      <BudgetSummary mode={mode} range={range} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Categories</h2>
        <AddBudgetDialog />
      </div>

      <div className="divide-y rounded-xl border">
        {categories.map((category) => (
          <BudgetEnvelopeRow
            key={category.id}
            category={category}
            target={getTargetForMode(getMonthlyTarget(category, targetContext), mode)}
            mode={mode}
            range={range}
          />
        ))}
      </div>
    </>
  )
}
