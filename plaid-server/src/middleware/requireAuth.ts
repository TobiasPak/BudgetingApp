import type { NextFunction, Request, Response } from 'express'
import { auth } from '../firebaseAdmin'

// Express doesn't ship request-augmentation types — extend it locally so
// downstream route handlers can read req.uid without a cast.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      uid: string
    }
  }
}

// This server is a trusted backend (like a Cloud Function would be) — it
// writes to Firestore via the Admin SDK, which bypasses firestore.rules
// entirely. That means THIS middleware is the only thing standing between
// "any request" and "write to any user's data," so every route below it
// must run through this first: verify the caller is a real signed-in
// Firebase user, and only ever act on that verified uid — never a uid
// supplied by the request body/params.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization: Bearer <Firebase ID token> header' })
    return
  }

  const idToken = header.slice('Bearer '.length)
  try {
    const decoded = await auth.verifyIdToken(idToken)
    req.uid = decoded.uid
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired ID token' })
  }
}
