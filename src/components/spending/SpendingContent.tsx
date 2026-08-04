import { useDateFilterStore, useDateFilterRange } from '@/stores/useDateFilterStore'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { SpendingSummary } from '@/components/spending/SpendingSummary'
import { SpendingBankActivity } from '@/components/spending/SpendingBankActivity'

// Reads mode/range from the shared useDateFilterStore — same reasoning as
// BudgetContent, lets this mount independently as both the standalone
// SpendingPage and a dashboard tab while sharing one date filter.
export function SpendingContent() {
  const categories = useBudgetStore((state) => state.categories)
  const mode = useDateFilterStore((state) => state.mode)
  const range = useDateFilterRange()

  return (
    <>
      <SpendingSummary mode={mode} range={range} />
      <SpendingBankActivity categories={categories} range={range} />
    </>
  )
}
