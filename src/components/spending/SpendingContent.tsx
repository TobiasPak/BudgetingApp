import { useState } from 'react'
import { MonthYearPicker } from '@/components/budget/MonthYearPicker'
import { SpendingSummary } from '@/components/spending/SpendingSummary'

// Owns its own referenceDate state — same reasoning as BudgetContent, lets
// this mount independently as both the standalone SpendingPage and a
// dashboard tab.
export function SpendingContent() {
  const [referenceDate, setReferenceDate] = useState<Date>(() => new Date())

  return (
    <>
      <MonthYearPicker value={referenceDate} onChange={setReferenceDate} />

      <SpendingSummary referenceDate={referenceDate} />
    </>
  )
}
