import { IncomeSummary } from '@/components/income/IncomeSummary'
import { IncomeSourceRow } from '@/components/income/IncomeSourceRow'
import { AddIncomeSourceDialog } from '@/components/income/AddIncomeSourceDialog'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { useDateFilterStore } from '@/stores/useDateFilterStore'
import { getMonthlyIncome, getSourceMonthlyIncome } from '@/lib/income'

// Reads referenceDate from the shared useDateFilterStore — same reasoning
// as BudgetContent, lets this mount independently as both the standalone
// IncomePage and a dashboard tab while sharing one date filter.
export function IncomeContent() {
  const incomeSources = useBudgetStore((state) => state.incomeSources)
  const paychecks = useBudgetStore((state) => state.paychecks)

  const referenceDate = useDateFilterStore((state) => state.referenceDate)

  const monthlyIncome = getMonthlyIncome(paychecks, referenceDate)

  return (
    <>
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
    </>
  )
}
