import { IncomeSummary } from '@/components/income/IncomeSummary'
import { IncomeSourceRow } from '@/components/income/IncomeSourceRow'
import { AddIncomeSourceDialog } from '@/components/income/AddIncomeSourceDialog'
import { IncomeBankActivity } from '@/components/income/IncomeBankActivity'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { useDateFilterStore, useDateFilterRange } from '@/stores/useDateFilterStore'
import { getIncomeInRange, getSourceIncomeInRange } from '@/lib/income'

// Reads mode/range from the shared useDateFilterStore — same reasoning as
// BudgetContent, lets this mount independently as both the standalone
// IncomePage and a dashboard tab while sharing one date filter.
export function IncomeContent() {
  const incomeSources = useBudgetStore((state) => state.incomeSources)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const plaidTransactions = useBudgetStore((state) => state.plaidTransactions)

  const mode = useDateFilterStore((state) => state.mode)
  const range = useDateFilterRange()

  const windowIncome = getIncomeInRange(paychecks, plaidTransactions, range)

  return (
    <>
      <IncomeSummary mode={mode} range={range} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Sources</h2>
        <AddIncomeSourceDialog />
      </div>

      <div className="divide-y rounded-xl border">
        {incomeSources.map((source) => {
          const sourceIncome = getSourceIncomeInRange(paychecks, source.id, range)
          const percentOfIncome =
            windowIncome > 0 ? (sourceIncome / windowIncome) * 100 : 0
          return (
            <IncomeSourceRow
              key={source.id}
              source={source}
              windowAmount={sourceIncome}
              percentOfIncome={percentOfIncome}
              range={range}
            />
          )
        })}
      </div>

      <IncomeBankActivity incomeSources={incomeSources} range={range} />
    </>
  )
}
