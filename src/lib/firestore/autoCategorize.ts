import { collection, deleteField, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { resolveAutoCategory } from '@/lib/plaidCategoryMatch'
import { categorizePlaidTransactionAsSpending, categorizePlaidTransactionAsIncome } from './writes'
import type {
  FirestoreCategoryDoc,
  FirestoreIncomeSourceDoc,
  FirestorePlaidTransactionDoc,
} from './types'

// True if the Purchase/Paycheck a "categorized" transaction points to still
// actually exists. A transaction can end up with categoryId/purchaseId (or
// sourceId/paycheckId) set but pointing at a doc that's gone — normally
// this can't happen now that deletePurchase/deletePaycheck (writes.ts)
// clear the back-reference on delete, but any transaction that got into
// this state before that fix (or via some other future drift) would
// otherwise stay permanently stuck.
async function isLinkTargetPresent(
  uid: string,
  transaction: FirestorePlaidTransactionDoc
): Promise<boolean> {
  if (transaction.purchaseId) {
    return (await getDoc(doc(db, 'users', uid, 'purchases', transaction.purchaseId))).exists()
  }
  if (transaction.paycheckId) {
    return (await getDoc(doc(db, 'users', uid, 'paychecks', transaction.paycheckId))).exists()
  }
  return false
}

async function clearStaleCategorization(uid: string, transactionId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'plaidTransactions', transactionId), {
    categoryId: deleteField(),
    purchaseId: deleteField(),
    sourceId: deleteField(),
    paycheckId: deleteField(),
    updatedAt: serverTimestamp(),
  })
}

// Sweeps every currently-uncategorized plaidTransaction against the user's
// full, current set of categories/incomeSources and their
// autoCategorizeBuckets, applying any match via the same
// categorizePlaidTransactionAsSpending/AsIncome path the manual
// "Categorize…" control uses. Always requeries fresh from Firestore rather
// than trusting whatever's in the Zustand store — same "don't trust
// in-memory state" convention recomputeSnapshot.ts already established.
//
// Resolving against the FULL current set (not just the category/source that
// just changed) is what makes "most specific match wins" correct: an older,
// more broadly-mapped category can't accidentally steal a transaction that
// rightfully belongs to a newer, more specifically-mapped one, or vice
// versa. Called unconditionally after every write that could change a
// bucket mapping (writeCategory/writeIncomeSource/updateCategoryBuckets/
// updateIncomeSourceBuckets) — cheap to just re-run each time rather than
// tracking exactly what changed.
//
// Runs sequentially, not in parallel: each match triggers its own
// transactional write plus a recomputeSnapshot pass (itself more
// queries/writes), and this is a one-time sweep, not a hot path, so
// there's no reason to risk bursting many concurrent writes for the sake
// of speed here.
export async function runAutoCategorizeBackfill(uid: string): Promise<void> {
  const [categoriesSnap, sourcesSnap, transactionsSnap] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'categories')),
    getDocs(collection(db, 'users', uid, 'incomeSources')),
    getDocs(collection(db, 'users', uid, 'plaidTransactions')),
  ])

  const categories = categoriesSnap.docs.map((d) => {
    const data = d.data() as FirestoreCategoryDoc
    return { id: d.id, autoCategorizeBuckets: data.autoCategorizeBuckets }
  })
  const incomeSources = sourcesSnap.docs.map((d) => {
    const data = d.data() as FirestoreIncomeSourceDoc
    return { id: d.id, autoCategorizeBuckets: data.autoCategorizeBuckets }
  })

  for (const transactionDoc of transactionsSnap.docs) {
    let transaction = transactionDoc.data() as FirestorePlaidTransactionDoc

    if (transaction.categoryId || transaction.sourceId) {
      if (await isLinkTargetPresent(uid, transaction)) continue
      // Self-heal a phantom categorization (see isLinkTargetPresent) so
      // this transaction is eligible for a fresh match below instead of
      // staying stuck — this is what lets a transaction affected by the
      // now-fixed delete bug recover the next time any category/source's
      // bucket mapping is saved.
      await clearStaleCategorization(uid, transactionDoc.id)
      transaction = {
        ...transaction,
        categoryId: undefined,
        purchaseId: undefined,
        sourceId: undefined,
        paycheckId: undefined,
      }
    }

    const match = resolveAutoCategory(
      {
        transactionType: transaction.transactionType,
        plaidCategory: transaction.plaidCategory,
        plaidCategoryPrimary: transaction.plaidCategoryPrimary,
      },
      categories,
      incomeSources
    )
    if (!match) continue

    if (match.kind === 'category') {
      await categorizePlaidTransactionAsSpending(uid, transactionDoc.id, match.id, {
        date: transaction.date,
        description: transaction.merchantName,
        amount: transaction.amount,
      })
    } else {
      await categorizePlaidTransactionAsIncome(uid, transactionDoc.id, match.id, {
        date: transaction.date,
        amount: transaction.amount,
      })
    }
  }
}
