// Cloud Functions entry point.
//
// Plaid API calls now happen in the standalone `plaid-server/` (see
// CLAUDE.md) instead of here — Cloud Functions can't make outbound
// third-party calls on the free Spark plan, and Secret Manager needs
// Blaze. That design is also pull-based (the frontend calls
// plaid-server's /api/sync_transactions on demand, checkpointed via a
// stored cursor), which needs no public webhook endpoint at all — so the
// `plaidWebhook` stub that used to live here (a Plaid-push receiver) has
// been removed rather than left as dead scaffolding.
//
// categorizeTransaction remains: it's independent of which backend calls
// Plaid, and is still real, compiling scaffolding for the future AI-agent
// auto-categorization trigger — not yet connected to anything, since
// there's no AI Agent API key/provider decision yet.
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

initializeApp()
const db = getFirestore()

// AI categorization trigger. Fires whenever a new bank transaction is
// synced in (whether from plaid-server's real sync, once wired into the
// frontend, or today's "Simulate bank sync" demo action). Not connected
// to a real AI Agent API yet — needs an API key (stored as a function
// secret) and a provider decision; until then this just no-ops so new
// transactions correctly sit uncategorized for manual sorting in the UI,
// exactly as they do today.
export const categorizeTransaction = onDocumentCreated(
  'users/{uid}/plaidTransactions/{transactionId}',
  async (event) => {
    const transaction = event.data?.data()
    if (!transaction) return
    // Never categorize transfers — they're neither spending nor income.
    if (transaction.transactionType === 'transfer') return
    // Already categorized (e.g. by a manual "Categorize…" action that beat
    // this trigger to it) — nothing to do.
    if (transaction.categoryId || transaction.sourceId) return

    const { uid, transactionId } = event.params

    // TODO once an AI Agent API key + provider exist:
    // 1. Fetch this user's categories/incomeSources
    //    (users/{uid}/categories, users/{uid}/incomeSources) as the set of
    //    valid targets to choose from.
    // 2. Call the categorization API with the transaction's merchantName,
    //    amount, and plaidCategory (Plaid's own guess, informational only).
    // 3. If confident, run the same operation
    //    categorizePlaidTransactionAsSpending/AsIncome perform client-side
    //    (src/lib/firestore/writes.ts) — in one batch, create the real
    //    Purchase/Paycheck doc and mark this transaction resolved
    //    (categoryId+purchaseId or sourceId+paycheckId) — server-side here
    //    via the Admin SDK, rather than round-tripping through the client.
    // 4. If not confident, leave it uncategorized for the existing manual
    //    "Categorize…" control in the UI to handle.
    void db
    void uid
    void transactionId
    void FieldValue
  }
)
