import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { MonthYearPicker } from '@/components/budget/MonthYearPicker'
import { TaxContent } from '@/components/tax/TaxContent'
import { useDateFilterStore } from '@/stores/useDateFilterStore'

export default function TaxPage() {
  const referenceDate = useDateFilterStore((state) => state.referenceDate)
  const setReferenceDate = useDateFilterStore((state) => state.setReferenceDate)

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tax</h1>
        <Button variant="outline" asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>

      <MonthYearPicker value={referenceDate} onChange={setReferenceDate} />

      <TaxContent />
    </main>
  )
}
