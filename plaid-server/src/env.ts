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

// When true, firebaseAdmin.ts points the Admin SDK at the local Auth/
// Firestore emulators instead of production Firebase — matching the
// frontend's VITE_USE_FIREBASE_EMULATORS. A real service account key
// (GOOGLE_APPLICATION_CREDENTIALS) is only required when this is false,
// since the emulators don't check credentials at all.
const useFirebaseEmulators = process.env.USE_FIREBASE_EMULATORS === 'true'

export const env = {
  plaidClientId: required('PLAID_CLIENT_ID'),
  plaidSecret: required('PLAID_SECRET'),
  plaidEnv: plaidEnv as 'sandbox' | 'production',
  useFirebaseEmulators,
  googleApplicationCredentials: useFirebaseEmulators
    ? undefined
    : required('GOOGLE_APPLICATION_CREDENTIALS'),
  firebaseProjectId: required('FIREBASE_PROJECT_ID'),
  port: Number(process.env.PORT ?? 8090),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
}
