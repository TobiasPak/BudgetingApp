// Cloud Functions entry point.
//
// Both functions below are real, compiling scaffolding for the Plaid + AI
// categorization integration — not yet wired to a real Plaid or AI Agent
// API, since neither has credentials configured yet (see CLAUDE.md). Each
// is written to match the exact data shapes the frontend already expects
// (src/lib/firestore/types.ts's FirestorePlaidTransactionDoc,
// src/lib/firestore/writes.ts's categorizePlaidTransactionAsSpending/
// AsIncome), so filling in the real API calls is the only work left once
// credentials exist — no data-model changes needed on either side.
import { onRequest } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

initializeApp()
const db = getFirestore()

// Plaid webhook receiver. Plaid calls this URL whenever new transactions
// are available for a linked account (the `SYNC_UPDATES_AVAILABLE`
// webhook). Not connected to a real Plaid app yet — needs a developer
// sandbox account (client id + secret, stored as function secrets via
// `firebase functions:secrets:set`, never as client env vars) and the
// `plaid` npm package added to functions/package.json.
export const plaidWebhook = onRequest(async (req, res) => {
  // TODO once Plaid credentials exist:
  // 1. Verify the webhook signature (the `Plaid-Verification` header)
  //    against the Plaid client secret.
  // 2. Look up which uid this item_id belongs to (a users/{uid} ->
  //    plaidItemId mapping stored when the user first links their bank via
  //    Plaid Link — not built yet either).
  // 3. Call transactionsSync with that item's stored cursor to fetch
  //    new/modified/removed transactions since the last sync.
  // 4. For each new transaction, write it into
  //    users/{uid}/plaidTransactions using the Firestore doc id = Plaid's
  //    own transaction_id (so re-syncing the same transaction naturally
  //    dedups via set(..., {merge: true}) instead of creating a
  //    duplicate), matching FirestorePlaidTransactionDoc's shape:
  //    accountName, amount (positive), date, merchantName, plaidCategory,
  //    transactionType ('spending' | 'income' | 'transfer' — derive from
  //    Plaid's own signed amount and category), pending, createdAt/
  //    updatedAt via FieldValue.serverTimestamp().
  void req
  res.status(501).send('Plaid integration not configured yet')
})

// AI categorization trigger. Fires whenever a new bank transaction is
// synced in (whether from the real webhook above, once built, or today's
// "Simulate bank sync" demo action). Not connected to a real AI Agent API
// yet — needs an API key (stored as a function secret) and a provider
// decision; until then this just no-ops so new transactions correctly sit
// uncategorized for manual sorting in the UI, exactly as they do today.
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
