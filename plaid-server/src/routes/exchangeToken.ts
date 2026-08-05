import { Router } from 'express'
import { plaidClient } from '../plaidClient'
import { requireAuth } from '../middleware/requireAuth'
import { db } from '../firebaseAdmin'
import type { PlaidItemDoc } from '../types'

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

    const item: PlaidItemDoc = { itemId, accessToken, institutionName }
    await db.collection('users').doc(req.uid).collection('plaidItems').doc(itemId).set(item)

    res.json({ itemId })
  } catch (error) {
    console.error('exchange_public_token failed', error)
    res.status(502).json({ error: 'Failed to exchange Plaid public token' })
  }
})
