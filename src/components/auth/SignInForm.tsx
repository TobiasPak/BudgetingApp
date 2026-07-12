import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  signInSchema,
  signUpSchema,
  type SignUpInput,
} from '@/lib/schemas/auth'

interface SignInFormProps {
  mode: 'signIn' | 'signUp'
}

// Parent (SignInPage) is expected to remount this with a fresh `key` when
// `mode` toggles — simplest way to swap the active Zod schema/resolver and
// clear any stale error/field state between a sign-in attempt and a
// sign-up attempt, rather than reactively re-deriving the resolver.
export function SignInForm({ mode }: SignInFormProps) {
  const signInEmail = useAuthStore((state) => state.signInEmail)
  const signUpEmail = useAuthStore((state) => state.signUpEmail)
  const error = useAuthStore((state) => state.error)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    // Cast needed because signInSchema's inferred shape lacks
    // confirmPassword — at runtime this is fine, since confirmPassword
    // never mounts/submits in signIn mode (shouldUnregister below).
    resolver: zodResolver(
      mode === 'signUp' ? signUpSchema : signInSchema
    ) as unknown as Resolver<SignUpInput>,
    defaultValues: { email: '', password: '', confirmPassword: '' },
    // Only relevant in signIn mode, where confirmPassword never mounts —
    // same conditionally-rendered-field gotcha as AddBudgetDialog.
    shouldUnregister: true,
  })

  async function onSubmit(data: SignUpInput) {
    if (mode === 'signUp') {
      await signUpEmail(data.email, data.password)
    } else {
      await signInEmail(data.email, data.password)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {mode === 'signUp' && (
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {mode === 'signUp' ? 'Create account' : 'Sign in'}
      </Button>
    </form>
  )
}
