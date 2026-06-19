import "server-only";
import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK (server only). Used by API route handlers for privileged,
 * ledger-affecting operations.
 *
 * Preferred production runtime on Firebase App Hosting:
 *   Use Application Default Credentials from the backend service account.
 *
 * Optional explicit service account env:
 *   FIREBASE_SERVICE_ACCOUNT_JSON={"project_id":"...","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n..."}
 *
 * Alternative split env:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * Never prefix server credentials with NEXT_PUBLIC and never commit them.
 */

/** A value counts as set only if it's present and not a template placeholder. */
const isReal = (v?: string) => Boolean(v) && !/PASTE_|your-project|REDACTED/i.test(v!);

const hasServiceAccountJson = isReal(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
const hasSplitServiceAccount =
  isReal(process.env.FIREBASE_PROJECT_ID) &&
  isReal(process.env.FIREBASE_CLIENT_EMAIL) &&
  isReal(process.env.FIREBASE_PRIVATE_KEY);
const hasApplicationDefaultCredentials =
  isReal(process.env.GOOGLE_CLOUD_PROJECT) ||
  isReal(process.env.GCLOUD_PROJECT) ||
  isReal(process.env.FIREBASE_CONFIG);

export const isAdminConfigured =
  hasServiceAccountJson || hasSplitServiceAccount || hasApplicationDefaultCredentials;

function serviceAccountFromJson(): ServiceAccount {
  try {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key?.replace(/\\n/g, "\n"),
    };
  } catch (error) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${
        error instanceof Error ? error.message : "unknown parse error"
      }`,
    );
  }
}

function serviceAccountFromSplitEnv(): ServiceAccount {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  };
}

function adminApp(): App {
  if (getApps().length) return getApp();
  if (!isAdminConfigured) {
    throw new Error(
      "Firebase Admin is not configured. Run on Firebase App Hosting/Google Cloud, or set FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.",
    );
  }
  if (!hasServiceAccountJson && !hasSplitServiceAccount) {
    return initializeApp({ credential: applicationDefault() });
  }
  return initializeApp({
    credential: cert(
      hasServiceAccountJson ? serviceAccountFromJson() : serviceAccountFromSplitEnv(),
    ),
  });
}

export const adminDb = () => getFirestore(adminApp());
export const adminAuth = () => getAuth(adminApp());
