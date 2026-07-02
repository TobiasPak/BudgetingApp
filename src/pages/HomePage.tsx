import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">ClearBooks</h1>
      <p className="text-muted-foreground">
        Foundation is set up — features coming soon.
      </p>
      <div className="flex items-center gap-3">
        <Button disabled>Get Started</Button>
        <Button variant="outline" asChild>
          <Link to="/about">About</Link>
        </Button>
      </div>
    </main>
  )
}
