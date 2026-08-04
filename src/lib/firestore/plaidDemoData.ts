import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { demoPlaidTransactions } from '@/lib/plaidDemoData'

// Seeds fake bank transactions for the "Simulate bank sync" demo action —
// stands in for a real Plaid transactions-sync webhook until an actual
// developer sandbox account exists (see functions/src/index.ts). Mirrors
// loadDemoData's batch-write pattern: bypasses src/lib/firestore/writes.ts's
// writePlaidTransaction (which is one setDoc per call) so all ~10 writes
// land in a single writeBatch instead.
export async function simulateBankSync(uid: string): Promise<void> {
  const batch = writeBatch(db)

  for (const transaction of demoPlaidTransactions) {
    batch.set(doc(collection(db, 'users', uid, 'plaidTransactions')), {
      ...transaction,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  await batch.commit()
}
