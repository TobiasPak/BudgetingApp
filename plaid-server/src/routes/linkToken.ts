import { Router } from 'express'
import { CountryCode, Products } from 'plaid'
import { plaidClient } from '../plaidClient'
import { requireAuth } from '../middleware/requireAuth'

export const linkTokenRouter = Router()

// POST /api/create_link_token — the frontend calls this before launching
// Plaid Link. client_user_id ties the resulting Link session to the
// verified Firebase uid, not anything the client could spoof.
linkTokenRouter.post('/create_link_token', requireAuth, async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: req.uid },
      client_name: 'ClearBooks',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    })
    res.json({ linkToken: response.data.link_token })
  } catch (error) {
    console.error('create_link_token failed', error)
    res.status(502).json({ error: 'Failed to create Plaid Link token' })
  }
})
