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
import { getFirebaseAuth } from '@/lib/firebase'
import { ensureUserDoc } from '@/lib/firestore/users'
import { useBudgetStore } from '@/stores/useBudgetStore'

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
  } else {
    useBudgetStore.getState().stopSync()
  }
})
