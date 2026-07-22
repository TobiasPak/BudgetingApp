import { BudgetEnvelopeRow } from '@/components/budget/BudgetEnvelopeRow'
import { BudgetSummary } from '@/components/budget/BudgetSummary'
import { IncomeOverview } from '@/components/budget/IncomeOverview'
import { AddBudgetDialog } from '@/components/budget/AddBudgetDialog'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { useDateFilterStore } from '@/stores/useDateFilterStore'
import {
  getAveragePaycheckAmount,
  getMonthlyIncome,
  getMonthlyTarget,
} from '@/lib/income'

// Reads referenceDate from the shared useDateFilterStore rather than
// owning its own state — this mounts independently (once as the standalone
// BudgetPage, once inside a dashboard tab), but both now deliberately share
// the same date filter rather than navigating independently.
export function BudgetContent() {
  const categories = useBudgetStore((state) => state.categories)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const paychecksPerMonth = useBudgetStore((state) => state.paychecksPerMonth)

  const referenceDate = useDateFilterStore((state) => state.referenceDate)

  const monthlyIncome = getMonthlyIncome(paychecks, referenceDate)
  const averagePaycheckAmount = getAveragePaycheckAmount(paychecks)
  const targetContext = { monthlyIncome, averagePaycheckAmount, paychecksPerMonth }

  return (
    <>
      <IncomeOverview referenceDate={referenceDate} />

      <BudgetSummary referenceDate={referenceDate} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Categories</h2>
        <AddBudgetDialog />
      </div>

      <div className="divide-y rounded-xl border">
        {categories.map((category) => (
          <BudgetEnvelopeRow
            key={category.id}
            category={category}
            monthlyTarget={getMonthlyTarget(category, targetContext)}
            referenceDate={referenceDate}
          />
        ))}
      </div>
    </>
  )
}
