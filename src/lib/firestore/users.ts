import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Called on every sign-in (including a returning user). `merge: true` makes
// this idempotent — it never clobbers an existing bankBalance/
// paychecksPerMonth, it only fills them in the first time a user's root doc
// doesn't exist yet.
export function ensureUserDoc(uid: string) {
  return setDoc(
    doc(db, 'users', uid),
    { bankBalance: 0, paychecksPerMonth: 2, createdAt: serverTimestamp() },
    { merge: true }
  )
}
