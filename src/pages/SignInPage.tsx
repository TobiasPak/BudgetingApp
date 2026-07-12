import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SignInForm } from '@/components/auth/SignInForm'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { useAuthStore } from '@/stores/useAuthStore'

type Mode = 'signIn' | 'signUp'

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>('signIn')
  const status = useAuthStore((state) => state.status)

  // RequireAuth only guards routes *nested* under it — this route is a
  // sibling, so a successful sign-in/sign-up needs its own redirect back to
  // the dashboard rather than relying on the guard to notice.
  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">ClearBooks</CardTitle>
          <CardDescription>
            {mode === 'signUp'
              ? 'Create an account to get started.'
              : 'Sign in to your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Keyed on mode so switching between sign-in/sign-up remounts the
              form fresh — clears stale field values/errors and swaps the
              active Zod schema without needing a reactive resolver. */}
          <SignInForm key={mode} mode={mode} />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleSignInButton />

          <Button
            type="button"
            variant="link"
            className="w-full"
            onClick={() => setMode(mode === 'signUp' ? 'signIn' : 'signUp')}
          >
            {mode === 'signUp'
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
