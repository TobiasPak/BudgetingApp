import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { env } from './env'

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

export const auth = getAuth()
export const db = getFirestore()
