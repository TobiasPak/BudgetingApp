import { create } from 'zustand'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { toast } from 'sonner'
import { getFirebaseAuth } from '@/lib/firebase'
import { ensureUserDoc } from '@/lib/firestore/users'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { usePeriodSnapshotStore } from '@/stores/usePeriodSnapshotStore'
import { syncTransactions, syncBalance } from '@/lib/plaidServer'

interface AuthState {
  user: User | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  error: string | null
  signInEmail: (email: string, password: string) => Promise<void>
  signUpEmail: (email: string, password: string) => Promise<void>
  signInGoogle: () => Promise<void>
  signOutUser: () => Promise<void>
}

function friendlyAuthError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: unknown }).code)
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.'
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password.'
      case 'auth/weak-password':
        return 'Password is too weak.'
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled.'
      default:
        return code.replace('auth/', '').replace(/-/g, ' ')
    }
  }
  return err instanceof Error ? err.message : 'Something went wrong.'
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  // Starts 'loading' — RequireAuth gates on this so the app never flashes a
  // logged-out UI before Firebase resolves a persisted session on refresh.
  status: 'loading',
  error: null,

  signInEmail: async (email, password) => {
    set({ error: null })
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
    } catch (err) {
      set({ error: friendlyAuthError(err) })
    }
  },
  signUpEmail: async (email, password) => {
    set({ error: null })
    try {
      await createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
    } catch (err) {
      set({ error: friendlyAuthError(err) })
    }
  },
  signInGoogle: async () => {
    set({ error: null })
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
    } catch (err) {
      set({ error: friendlyAuthError(err) })
    }
  },
  signOutUser: async () => {
    await signOut(getFirebaseAuth())
  },
}))

// One-shot: waits for useBudgetStore's Firestore listeners to report at
// least once (hasLinkedBank reflects the real synced doc only once
// `loading` flips false — it's still the pre-hydration default right when
// startSync is called) before deciding whether to kick off a Plaid
// re-sync (transactions + balance, independent calls so one failing
// doesn't block the other). Re-checks the signed-in uid before actually
// syncing, so a sign-out that happens before hydration completes doesn't
// fire a stale sync. A sync failure (e.g. plaid-server not running) must
// never block or break sign-in itself — reported via toast only, same as
// every other write failure in this app.
function syncPlaidDataOnceReady(uid: string) {
  const unsubscribe = useBudgetStore.subscribe((state) => {
    if (state.loading) return
    unsubscribe()
    if (useAuthStore.getState().user?.uid !== uid) return
    if (!state.hasLinkedBank || !import.meta.env.VITE_PLAID_SERVER_URL) return
    syncTransactions().catch((err) => {
      toast.error("Couldn't sync transactions", {
        description: err instanceof Error ? err.message : String(err),
      })
    })
    syncBalance().catch((err) => {
      toast.error("Couldn't sync bank balance", {
        description: err instanceof Error ? err.message : String(err),
      })
    })
  })
}

// Module-level, registered once — not a hook/Provider, matching this app's
// existing "no Context besides TanStack Query" convention and mirroring the
// module-level-singleton pattern getFirebaseAuth() already establishes.
// Drives useBudgetStore's Firestore sync directly (rather than the budget
// store importing this one) to keep the dependency graph one-directional
// and avoid a circular import.
onAuthStateChanged(getFirebaseAuth(), (user) => {
  useAuthStore.setState({
    user,
    status: user ? 'authenticated' : 'unauthenticated',
  })
  if (user) {
    void ensureUserDoc(user.uid)
    useBudgetStore.getState().startSync(user.uid)
    usePeriodSnapshotStore.getState().start(user.uid)
    syncPlaidDataOnceReady(user.uid)
  } else {
    useBudgetStore.getState().stopSync()
    usePeriodSnapshotStore.getState().stop()
  }
})
