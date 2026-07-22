import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
const recaptchaSiteKey = import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY

export const app = initializeApp(firebaseConfig)

// App Check attaches a reCAPTCHA v3 attestation token to every Firebase
// request, so the backend can tell a genuine instance of this app apart
// from a script that copied the config values above (those aren't secret —
// this is what actually gates access, alongside firestore.rules). Only
// initialized when a site key is configured: .env.local (emulator-first
// dev) deliberately has none, since the emulators don't check App Check
// and there's nothing real to protect there. Both staging and production
// currently have this registered in Firebase Console but left in
// "Unenforced" (monitor-only) mode — see CLAUDE.md for the plan to flip
// enforcement on.
if (recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export const db = getFirestore(app)

// connectFirestoreEmulator must run before any other Firestore operation
// touches `db` — safe here since this is the first thing done with `db`
// after creating it, synchronously at module load.
if (useEmulators) {
  connectFirestoreEmulator(db, 'localhost', 8080)
}

// getAuth() validates the API key eagerly and throws if it's missing/malformed,
// unlike getFirestore(). Lazily initialize so importing this module never
// crashes the app before .env.local is configured with real Firebase values.
let authInstance: Auth | undefined
export function getFirebaseAuth(): Auth {
  const isFirstInit = !authInstance
  authInstance ??= getAuth(app)
  if (isFirstInit && useEmulators) {
    connectAuthEmulator(authInstance, 'http://localhost:9099', {
      disableWarnings: true,
    })
  }
  return authInstance
}
