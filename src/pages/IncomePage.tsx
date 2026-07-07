import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { MonthYearPicker } from '@/components/budget/MonthYearPicker'
import { IncomeSummary } from '@/components/income/IncomeSummary'
import { IncomeSourceRow } from '@/components/income/IncomeSourceRow'
import { AddIncomeSourceDialog } from '@/components/income/AddIncomeSourceDialog'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { getMonthlyIncome, getSourceMonthlyIncome } from '@/lib/income'

export default function IncomePage() {
  const incomeSources = useBudgetStore((state) => state.incomeSources)
  const paychecks = useBudgetStore((state) => state.paychecks)

  const [referenceDate, setReferenceDate] = useState<Date>(() => new Date())

  const monthlyIncome = getMonthlyIncome(paychecks, referenceDate)

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Income</h1>
        <Button variant="outline" asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>

      <MonthYearPicker value={referenceDate} onChange={setReferenceDate} />

      <IncomeSummary referenceDate={referenceDate} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Sources</h2>
        <AddIncomeSourceDialog />
      </div>

      <div className="divide-y rounded-xl border">
        {incomeSources.map((source) => {
          const monthlyAmount = getSourceMonthlyIncome(
            paychecks,
            source.id,
            referenceDate
          )
          const percentOfIncome =
            monthlyIncome > 0 ? (monthlyAmount / monthlyIncome) * 100 : 0
          return (
            <IncomeSourceRow
              key={source.id}
              source={source}
              monthlyAmount={monthlyAmount}
              percentOfIncome={percentOfIncome}
              referenceDate={referenceDate}
            />
          )
        })}
      </div>
    </main>
  )
}
