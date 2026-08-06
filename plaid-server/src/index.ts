import express from 'express'
import cors from 'cors'
import { env } from './env'
import { linkTokenRouter } from './routes/linkToken'
import { exchangeTokenRouter } from './routes/exchangeToken'
import { syncTransactionsRouter } from './routes/syncTransactions'
import { syncBalanceRouter } from './routes/syncBalance'
// Importing firebaseAdmin.ts here (rather than only from files that use
// `db`/`auth`) is what actually runs initializeApp() at startup — routes
// only import the already-initialized `db`/`auth` exports.
import './firebaseAdmin'

const app = express()
app.use(cors({ origin: env.corsOrigin }))
app.use(express.json())

app.use('/api', linkTokenRouter)
app.use('/api', exchangeTokenRouter)
app.use('/api', syncTransactionsRouter)
app.use('/api', syncBalanceRouter)

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(env.port, () => {
  console.log(`plaid-server listening on http://localhost:${env.port} (PLAID_ENV=${env.plaidEnv})`)
})
