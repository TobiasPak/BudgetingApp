import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var ${name} — copy plaid-server/.env.example to .env and fill it in.`)
  }
  return value
}

const plaidEnv = process.env.PLAID_ENV ?? 'sandbox'
if (plaidEnv !== 'sandbox' && plaidEnv !== 'production') {
  throw new Error(`PLAID_ENV must be 'sandbox' or 'production', got '${plaidEnv}'`)
}

export const env = {
  plaidClientId: required('PLAID_CLIENT_ID'),
  plaidSecret: required('PLAID_SECRET'),
  plaidEnv: plaidEnv as 'sandbox' | 'production',
  googleApplicationCredentials: required('GOOGLE_APPLICATION_CREDENTIALS'),
  firebaseProjectId: required('FIREBASE_PROJECT_ID'),
  port: Number(process.env.PORT ?? 8090),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
}
