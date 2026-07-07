import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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

export default function BudgetPage() {
  const categories = useBudgetStore((state) => state.categories)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const paychecksPerMonth = useBudgetStore((state) => state.paychecksPerMonth)

  const [referenceDate, setReferenceDate] = useState<Date>(() => new Date())

  const monthlyIncome = getMonthlyIncome(paychecks, referenceDate)
  const averagePaycheckAmount = getAveragePaycheckAmount(paychecks)
  const targetContext = { monthlyIncome, averagePaycheckAmount, paychecksPerMonth }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <Button variant="outline" asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>

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
    </main>
  )
}
