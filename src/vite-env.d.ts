/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_USE_FIREBASE_EMULATORS: string
  // Optional — App Check is skipped entirely when this is unset (see
  // src/lib/firebase.ts), which is the intended state for .env.local.
  readonly VITE_FIREBASE_RECAPTCHA_SITE_KEY?: string
  // Optional — the origin plaid-server is running at (see src/lib/plaidServer.ts).
  // Only .env.local has a real value today; staging/production have no
  // deployed plaid-server yet. Not a secret — it's just a URL, the actual
  // Plaid client id/secret never reach the frontend either way.
  readonly VITE_PLAID_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
