import { useState } from 'react'
import { BudgetEnvelopeRow } from '@/components/budget/BudgetEnvelopeRow'
import { BudgetSummary } from '@/components/budget/BudgetSummary'
import { IncomeOverview } from '@/components/budget/IncomeOverview'
import { AddBudgetDialog } from '@/components/budget/AddBudgetDialog'
import { MonthYearPicker } from '@/components/budget/MonthYearPicker'
import { useBudgetStore } from '@/stores/useBudgetStore'
import {
  getAveragePaycheckAmount,
  getMonthlyIncome,
  getMonthlyTarget,
} from '@/lib/income'

// Owns its own referenceDate state (rather than accepting it as a prop) so
// this can be mounted twice independently — once as the standalone
// BudgetPage, once inside a dashboard tab — each with its own month
// navigation, with no state to lift or thread from a shared parent.
export function BudgetContent() {
  const categories = useBudgetStore((state) => state.categories)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const paychecksPerMonth = useBudgetStore((state) => state.paychecksPerMonth)

  const [referenceDate, setReferenceDate] = useState<Date>(() => new Date())

  const monthlyIncome = getMonthlyIncome(paychecks, referenceDate)
  const averagePaycheckAmount = getAveragePaycheckAmount(paychecks)
  const targetContext = { monthlyIncome, averagePaycheckAmount, paychecksPerMonth }

  return (
    <>
      <MonthYearPicker value={referenceDate} onChange={setReferenceDate} />

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
