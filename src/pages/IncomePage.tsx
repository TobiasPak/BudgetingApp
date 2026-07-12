import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { IncomeContent } from '@/components/income/IncomeContent'

export default function IncomePage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Income</h1>
        <Button variant="outline" asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>

      <IncomeContent />
    </main>
  )
}
