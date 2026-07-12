import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'

// Route guard — the sync lifecycle (starting/stopping useBudgetStore's
// Firestore listeners) intentionally lives in useAuthStore's own
// onAuthStateChanged listener instead of here, so this component stays a
// pure routing concern with no coupling to the budget store.
export function RequireAuth() {
  const status = useAuthStore((state) => state.status)

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/sign-in" replace />
  }

  return <Outlet />
}
