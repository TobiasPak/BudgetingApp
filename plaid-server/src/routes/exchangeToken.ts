import { Router } from 'express'
import { plaidClient } from '../plaidClient'
import { requireAuth } from '../middleware/requireAuth'
import { db } from '../firebaseAdmin'
import { fetchAccountsMap } from '../lib/plaidAccounts'
import type { PlaidAccountInfo, PlaidItemDoc, UserDocPlaidFields } from '../types'

export const exchangeTokenRouter = Router()

// POST /api/exchange_public_token — called once Plaid Link succeeds on the
// frontend. Exchanges the short-lived public_token for a long-lived
// access_token and stores it server-side only, at
// users/{uid}/plaidItems/{itemId} — a collection firestore.rules denies
// all client access to (see the plaidItems rule), since access_token
// grants ongoing read access to the linked bank account.
exchangeTokenRouter.post('/exchange_public_token', requireAuth, async (req, res) => {
  const { publicToken, institutionName } = req.body as {
    publicToken?: string
    institutionName?: string
  }
  if (!publicToken) {
    res.status(400).json({ error: 'publicToken is required' })
    return
  }

  try {
    const exchange = await plaidClient.itemPublicTokenExchange({ public_token: publicToken })
    const { access_token: accessToken, item_id: itemId } = exchange.data

    // Best-effort — a failure here shouldn't fail the whole link, since
    // syncOneItem's self-healing backfill (syncTransactions.ts) will pick
    // real account names up on the next sync anyway.
    let accounts: Record<string, PlaidAccountInfo> | undefined
    try {
      accounts = await fetchAccountsMap(accessToken)
    } catch (error) {
      console.error('accountsGet failed during exchange_public_token (non-fatal)', error)
    }

    // Conditional spread rather than a plain `accounts` key — Firestore's
    // Admin SDK throws on an explicit `undefined` field value (no
    // ignoreUndefinedProperties configured), so accountsGet failing above
    // must not put an `accounts: undefined` key on the write.
    const item: PlaidItemDoc = {
      itemId,
      accessToken,
      institutionName,
      ...(accounts ? { accounts } : {}),
    }
    const userFields: UserDocPlaidFields = { hasLinkedBank: true }

    // Batched so a crash between the two writes can't leave the item
    // stored but the flag unset (or vice versa).
    const batch = db.batch()
    batch.set(db.collection('users').doc(req.uid).collection('plaidItems').doc(itemId), item)
    batch.set(db.collection('users').doc(req.uid), userFields, { merge: true })
    await batch.commit()

    res.json({ itemId })
  } catch (error) {
    console.error('exchange_public_token failed', error)
    res.status(502).json({ error: 'Failed to exchange Plaid public token' })
  }
})
