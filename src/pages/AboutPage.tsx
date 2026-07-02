import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function AboutPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">About ClearBooks</h1>
      <p className="text-muted-foreground max-w-md">
        A California personal &amp; business finance and tax app for W-2, 1099,
        self-employed, and gig workers.
      </p>
      <Button variant="outline" asChild>
        <Link to="/">Back home</Link>
      </Button>
    </main>
  )
}
