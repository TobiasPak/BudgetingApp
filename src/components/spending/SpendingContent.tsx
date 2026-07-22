import { useDateFilterStore } from '@/stores/useDateFilterStore'
import { SpendingSummary } from '@/components/spending/SpendingSummary'

// Reads referenceDate from the shared useDateFilterStore — same reasoning
// as BudgetContent, lets this mount independently as both the standalone
// SpendingPage and a dashboard tab while sharing one date filter.
export function SpendingContent() {
  const referenceDate = useDateFilterStore((state) => state.referenceDate)

  return (
    <>
      <SpendingSummary referenceDate={referenceDate} />
    </>
  )
}
