import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { env } from './env'

if (env.useFirebaseEmulators) {
  // Must be set before initializeApp() — the Admin SDK checks these env
  // vars at init time to redirect Auth/Firestore calls to the local
  // emulators instead of production. No real credential is needed at all
  // in this mode (the emulators don't check them), matching the
  // frontend's VITE_USE_FIREBASE_EMULATORS behavior in src/lib/firebase.ts.
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
  initializeApp({ projectId: env.firebaseProjectId })
} else {
  // GOOGLE_APPLICATION_CREDENTIALS (set in .env) points the Admin SDK at a
  // downloaded service account key — applicationDefault() picks it up
  // automatically via that env var, the standard mechanism outside of a
  // Cloud Functions/Cloud Run environment (which get credentials injected
  // for free). This is what lets a plain Node server act as a trusted
  // backend the same way a Cloud Function would.
  initializeApp({
    credential: applicationDefault(),
    projectId: env.firebaseProjectId,
  })
}

export const auth = getAuth()
export const db = getFirestore()
