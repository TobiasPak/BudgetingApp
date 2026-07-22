import { useDateFilterStore, useDateFilterRange } from '@/stores/useDateFilterStore'
import { SpendingSummary } from '@/components/spending/SpendingSummary'

// Reads mode/range from the shared useDateFilterStore — same reasoning as
// BudgetContent, lets this mount independently as both the standalone
// SpendingPage and a dashboard tab while sharing one date filter.
export function SpendingContent() {
  const mode = useDateFilterStore((state) => state.mode)
  const range = useDateFilterRange()

  return (
    <>
      <SpendingSummary mode={mode} range={range} />
    </>
  )
}
