import "server-only";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK (server only). Used by API route handlers for privileged,
 * ledger-affecting operations. Configure with a service account via env:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * (see .env.example). The private key keeps its literal "\n" newlines in env.
 */

/** A value counts as set only if it's present and not a template placeholder. */
const isReal = (v?: string) => Boolean(v) && !/PASTE_|your-project/i.test(v!);

export const isAdminConfigured =
  isReal(process.env.FIREBASE_PROJECT_ID) &&
  isReal(process.env.FIREBASE_CLIENT_EMAIL) &&
  isReal(process.env.FIREBASE_PRIVATE_KEY);

function adminApp(): App {
  if (getApps().length) return getApp();
  if (!isAdminConfigured) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminDb = () => getFirestore(adminApp());
export const adminAuth = () => getAuth(adminApp());
