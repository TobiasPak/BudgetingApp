import { initializeApp } from 'firebase/app'
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

export const app = initializeApp(firebaseConfig)
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
