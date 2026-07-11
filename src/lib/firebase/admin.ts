import "server-only";
import { getApps, initializeApp, applicationDefault, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase-only server data/auth adapter.
 *
 * Occasion.ng now runs on Firebase App Hosting with Firestore as the server
 * datastore. Server code uses Firebase Admin SDK with App Hosting default
 * credentials, or FIREBASE_SERVICE_ACCOUNT_JSON for local/non-Google runtimes.
 */

type WhereOp = "==";

type JsonRecord = Record<string, unknown>;

interface FirebaseServiceAccountJson {
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

export interface AdminDocumentSnapshot<T = unknown> {
  exists: boolean;
  data(): T | undefined;
}

export interface AdminQuerySnapshot<T = unknown> {
  docs: Array<{ id: string; data(): T; ref: AdminDocumentReference<T> }>;
  forEach(cb: (doc: { id: string; data(): T; ref: AdminDocumentReference<T> }) => void): void;
}

function firebaseProjectId() {
  return process.env.FIREBASE_AUTH_PROJECT_ID
    || process.env.FIREBASE_PROJECT_ID
    || process.env.GOOGLE_CLOUD_PROJECT
    || process.env.GCLOUD_PROJECT;
}

function firebaseApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawServiceAccount) {
    const serviceAccount = JSON.parse(rawServiceAccount) as FirebaseServiceAccountJson;
    return initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
      projectId: serviceAccount.project_id ?? firebaseProjectId(),
    });
  }

  return initializeApp({ credential: applicationDefault(), projectId: firebaseProjectId() });
}

function firestore(): Firestore {
  return getFirestore(firebaseApp());
}

function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, withoutUndefined(v)]),
    );
  }
  return value;
}

class FirestoreDocumentSnapshot<T = unknown> implements AdminDocumentSnapshot<T> {
  constructor(private snap: FirebaseFirestore.DocumentSnapshot) {}
  get exists() { return this.snap.exists; }
  data() { return this.snap.data() as T | undefined; }
}

class FirestoreQuerySnapshot<T = unknown> implements AdminQuerySnapshot<T> {
  docs: Array<{ id: string; data(): T; ref: AdminDocumentReference<T> }>;
  constructor(snap: FirebaseFirestore.QuerySnapshot) {
    this.docs = snap.docs.map((doc) => ({ id: doc.id, data: () => doc.data() as T, ref: new AdminDocumentReference<T>(doc.ref) }));
  }
  forEach(cb: (doc: { id: string; data(): T; ref: AdminDocumentReference<T> }) => void) { this.docs.forEach(cb); }
}

export class AdminDocumentReference<T = unknown> {
  constructor(public ref: FirebaseFirestore.DocumentReference, public id = ref.id) {}
  async get(): Promise<AdminDocumentSnapshot<T>> { return new FirestoreDocumentSnapshot<T>(await this.ref.get()); }
  async set(data: T, options?: { merge?: boolean }): Promise<void> {
    const clean = withoutUndefined(data) as FirebaseFirestore.DocumentData;
    if (options?.merge) await this.ref.set(clean, { merge: true });
    else await this.ref.set(clean);
  }
  async update(data: Partial<T>): Promise<void> { await this.ref.update(withoutUndefined(data) as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>); }
}

export class AdminQuery<T = unknown> {
  constructor(public query: FirebaseFirestore.Query) {}
  where(field: string, op: WhereOp, value: unknown): AdminQuery<T> { return new AdminQuery<T>(this.query.where(field, op, value)); }
  orderBy(field: string, direction: "asc" | "desc" = "asc"): AdminQuery<T> { return new AdminQuery<T>(this.query.orderBy(field, direction)); }
  limit(n: number): AdminQuery<T> { return new AdminQuery<T>(this.query.limit(n)); }
  async get(): Promise<AdminQuerySnapshot<T>> { return new FirestoreQuerySnapshot<T>(await this.query.get()); }
}

export class AdminCollectionReference<T = unknown> extends AdminQuery<T> {
  constructor(private collectionRef: FirebaseFirestore.CollectionReference) { super(collectionRef); }
  doc(id?: string): AdminDocumentReference<T> { return new AdminDocumentReference<T>(id ? this.collectionRef.doc(id) : this.collectionRef.doc()); }
}

class AdminWriteBatch {
  constructor(private batch: FirebaseFirestore.WriteBatch) {}
  set<T>(ref: AdminDocumentReference<T>, data: T, options?: { merge?: boolean }) {
    const clean = withoutUndefined(data) as FirebaseFirestore.DocumentData;
    if (options?.merge) this.batch.set(ref.ref, clean, { merge: true });
    else this.batch.set(ref.ref, clean);
  }
  update<T>(ref: AdminDocumentReference<T>, data: Partial<T>) { this.batch.update(ref.ref, withoutUndefined(data) as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>); }
  async commit() { await this.batch.commit(); }
}

class AdminTransaction {
  constructor(private tx: FirebaseFirestore.Transaction) {}
  get<T>(target: AdminDocumentReference<T>): Promise<AdminDocumentSnapshot<T>>;
  get<T>(target: AdminQuery<T>): Promise<AdminQuerySnapshot<T>>;
  async get<T>(target: AdminDocumentReference<T> | AdminQuery<T>): Promise<AdminDocumentSnapshot<T> | AdminQuerySnapshot<T>> {
    if (target instanceof AdminDocumentReference) return new FirestoreDocumentSnapshot<T>(await this.tx.get(target.ref));
    return new FirestoreQuerySnapshot<T>(await this.tx.get(target.query));
  }
  set<T>(ref: AdminDocumentReference<T>, data: T, options?: { merge?: boolean }) {
    const clean = withoutUndefined(data) as FirebaseFirestore.DocumentData;
    if (options?.merge) this.tx.set(ref.ref, clean, { merge: true });
    else this.tx.set(ref.ref, clean);
  }
  update<T>(ref: AdminDocumentReference<T>, data: Partial<T>) { this.tx.update(ref.ref, withoutUndefined(data) as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>); }
}

export class AdminDbCompat {
  private db = firestore();
  collection<T = unknown>(name: string): AdminCollectionReference<T> { return new AdminCollectionReference<T>(this.db.collection(name)); }
  batch(): AdminWriteBatch { return new AdminWriteBatch(this.db.batch()); }
  async runTransaction<T>(fn: (tx: AdminTransaction) => Promise<T>): Promise<T> { return this.db.runTransaction((tx) => fn(new AdminTransaction(tx))); }
}

export const isAdminConfigured = true;
export const isFirestoreConfigured = () => Boolean(firebaseProjectId());
export function adminDb(): AdminDbCompat { return new AdminDbCompat(); }

export const adminAuth = () => ({
  async verifyIdToken(token: string) {
    return getAuth(firebaseApp()).verifyIdToken(token);
  },
});
