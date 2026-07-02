import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BudgetEnvelopeCard } from '@/components/budget/BudgetEnvelopeCard'
import { BudgetSummary } from '@/components/budget/BudgetSummary'
import { useBudgetStore } from '@/stores/useBudgetStore'

export default function BudgetPage() {
  const categories = useBudgetStore((state) => state.categories)

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <Button variant="outline" asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>

      <BudgetSummary />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <BudgetEnvelopeCard key={category.id} category={category} />
        ))}
      </div>
    </main>
  )
}
