import "server-only";
import { nanoid } from "nanoid";
import { getApps, initializeApp, applicationDefault, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Server data/auth adapter.
 *
 * - On Cloudflare/OpenNext, use the D1 binding (`env.DB`) through a small
 *   Firestore-compatible shim.
 * - On Firebase App Hosting, use Firebase Admin SDK with App Hosting default
 *   credentials (or FIREBASE_SERVICE_ACCOUNT_JSON for non-Google runtimes).
 */

type JsonRecord = Record<string, unknown>;
type WhereOp = "==";

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: unknown;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1DatabaseCompat {
  prepare(sql: string): D1PreparedStatement;
  batch?<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface CloudflareEnvCompat {
  DB?: D1DatabaseCompat;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_AUTH_PROJECT_ID?: string;
}

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
  docs: Array<{ id: string; data(): T; ref: any }>;
  forEach(cb: (doc: { id: string; data(): T; ref: any }) => void): void;
}

interface Filter {
  field: string;
  op: WhereOp;
  value: unknown;
}

interface Order {
  field: string;
  direction: "asc" | "desc";
}

function env(): CloudflareEnvCompat {
  try {
    return getCloudflareContext().env as CloudflareEnvCompat;
  } catch {
    return {};
  }
}

function d1(): D1DatabaseCompat {
  const db = env().DB;
  if (!db) throw new Error("Cloudflare D1 binding DB is not configured.");
  return db;
}

function firebaseProjectId() {
  return env().FIREBASE_AUTH_PROJECT_ID
    || env().FIREBASE_PROJECT_ID
    || process.env.FIREBASE_AUTH_PROJECT_ID
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

function nowIso() {
  return new Date().toISOString();
}

function getPathValue(data: JsonRecord, path: string) {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) return (acc as JsonRecord)[key];
    return undefined;
  }, data);
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

/* ---------- Cloudflare D1 document shim ---------- */

async function ensureDocumentTable() {
  await d1().prepare(`CREATE TABLE IF NOT EXISTS documents (
    collection_name TEXT NOT NULL,
    document_id TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (collection_name, document_id)
  )`).run();
}

async function readDocument<T = JsonRecord>(collectionName: string, id: string): Promise<T | undefined> {
  await ensureDocumentTable();
  const row = await d1()
    .prepare("SELECT data_json FROM documents WHERE collection_name = ? AND document_id = ?")
    .bind(collectionName, id)
    .first<{ data_json: string }>();
  return row ? (JSON.parse(row.data_json) as T) : undefined;
}

async function writeDocument(collectionName: string, id: string, data: unknown, merge = false) {
  await ensureDocumentTable();
  const existing = merge ? await readDocument<JsonRecord>(collectionName, id) : undefined;
  const clean = withoutUndefined(merge && existing ? { ...existing, ...(data as JsonRecord) } : data);
  const iso = nowIso();
  await d1()
    .prepare(`INSERT INTO documents (collection_name, document_id, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(collection_name, document_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`)
    .bind(collectionName, id, JSON.stringify(clean), iso, iso)
    .run();
}

async function updateDocument(collectionName: string, id: string, partial: JsonRecord) {
  const existing = await readDocument<JsonRecord>(collectionName, id);
  if (!existing) throw new Error(`Document ${collectionName}/${id} not found`);
  await writeDocument(collectionName, id, { ...existing, ...(withoutUndefined(partial) as JsonRecord) });
}

class DocumentSnapshot<T = unknown> implements AdminDocumentSnapshot<T> {
  constructor(private value: T | undefined) {}
  get exists() { return this.value !== undefined; }
  data() { return this.value; }
}

class QuerySnapshot<T = unknown> implements AdminQuerySnapshot<T> {
  docs: Array<{ id: string; data(): T; ref: AdminDocumentReference<T> }>;
  constructor(collectionName: string, rows: Array<{ id: string; data: T }>) {
    this.docs = rows.map((row) => ({ id: row.id, data: () => row.data, ref: new AdminDocumentReference<T>(collectionName, row.id) }));
  }
  forEach(cb: (doc: { id: string; data(): T; ref: AdminDocumentReference<T> }) => void) { this.docs.forEach(cb); }
}

export class AdminDocumentReference<T = unknown> {
  constructor(private collectionName: string, public id: string) {}
  async get(): Promise<AdminDocumentSnapshot<T>> { return new DocumentSnapshot<T>(await readDocument<T>(this.collectionName, this.id)); }
  async set(data: T, options?: { merge?: boolean }): Promise<void> { await writeDocument(this.collectionName, this.id, data, !!options?.merge); }
  async update(data: Partial<T>): Promise<void> { await updateDocument(this.collectionName, this.id, data as JsonRecord); }
}

export class AdminQuery<T = unknown> {
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private maxRows?: number;
  constructor(private collectionName: string) {}
  where(field: string, op: WhereOp, value: unknown): AdminQuery<T> { const q = this.clone(); q.filters.push({ field, op, value }); return q; }
  orderBy(field: string, direction: "asc" | "desc" = "asc"): AdminQuery<T> { const q = this.clone(); q.orders.push({ field, direction }); return q; }
  limit(n: number): AdminQuery<T> { const q = this.clone(); q.maxRows = n; return q; }
  async get(): Promise<AdminQuerySnapshot<T>> {
    await ensureDocumentTable();
    const res = await d1().prepare("SELECT document_id, data_json FROM documents WHERE collection_name = ?").bind(this.collectionName).all<{ document_id: string; data_json: string }>();
    let rows = (res.results ?? []).map((row) => ({ id: row.document_id, data: JSON.parse(row.data_json) as T & JsonRecord }));
    for (const filter of this.filters) rows = rows.filter((row) => filter.op === "==" && getPathValue(row.data, filter.field) === filter.value);
    for (const order of [...this.orders].reverse()) {
      rows = rows.sort((a, b) => {
        const cmp = String(getPathValue(a.data, order.field) ?? "").localeCompare(String(getPathValue(b.data, order.field) ?? ""));
        return order.direction === "desc" ? -cmp : cmp;
      });
    }
    if (this.maxRows !== undefined) rows = rows.slice(0, this.maxRows);
    return new QuerySnapshot<T>(this.collectionName, rows);
  }
  private clone(): AdminQuery<T> { const q = new AdminQuery<T>(this.collectionName); q.filters = [...this.filters]; q.orders = [...this.orders]; q.maxRows = this.maxRows; return q; }
}

export class AdminCollectionReference<T = unknown> extends AdminQuery<T> {
  constructor(private name: string) { super(name); }
  doc(id = nanoid()): AdminDocumentReference<T> { return new AdminDocumentReference<T>(this.name, id); }
}

class WriteBatch {
  private ops: Array<() => Promise<void>> = [];
  set<T>(ref: AdminDocumentReference<T>, data: T, options?: { merge?: boolean }) { this.ops.push(() => ref.set(data, options)); }
  update<T>(ref: AdminDocumentReference<T>, data: Partial<T>) { this.ops.push(() => ref.update(data)); }
  async commit() { for (const op of this.ops) await op(); }
}

class Transaction extends WriteBatch {
  get<T>(target: AdminDocumentReference<T>): Promise<AdminDocumentSnapshot<T>>;
  get<T>(target: AdminQuery<T>): Promise<AdminQuerySnapshot<T>>;
  get<T>(target: AdminDocumentReference<T> | AdminQuery<T>) { return target.get(); }
}

export class AdminDbCompat {
  collection<T = unknown>(name: string): AdminCollectionReference<T> { return new AdminCollectionReference<T>(name); }
  batch(): any { return new WriteBatch(); }
  async runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> { return fn(new Transaction()); }
}

/* ---------- Firebase Admin SDK adapter ---------- */

class FirestoreDocumentSnapshot<T = unknown> implements AdminDocumentSnapshot<T> {
  constructor(private snap: FirebaseFirestore.DocumentSnapshot) {}
  get exists() { return this.snap.exists; }
  data() { return this.snap.data() as T | undefined; }
}

class FirestoreQuerySnapshot<T = unknown> implements AdminQuerySnapshot<T> {
  docs: Array<{ id: string; data(): T; ref: FirestoreDocumentReference<T> }>;
  constructor(snap: FirebaseFirestore.QuerySnapshot) {
    this.docs = snap.docs.map((doc) => ({ id: doc.id, data: () => doc.data() as T, ref: new FirestoreDocumentReference<T>(doc.ref) }));
  }
  forEach(cb: (doc: { id: string; data(): T; ref: FirestoreDocumentReference<T> }) => void) { this.docs.forEach(cb); }
}

export class FirestoreDocumentReference<T = unknown> {
  constructor(public ref: FirebaseFirestore.DocumentReference, public id = ref.id) {}
  async get(): Promise<AdminDocumentSnapshot<T>> { return new FirestoreDocumentSnapshot<T>(await this.ref.get()); }
  async set(data: T, options?: { merge?: boolean }): Promise<void> {
    const clean = withoutUndefined(data) as FirebaseFirestore.DocumentData;
    if (options?.merge) await this.ref.set(clean, { merge: true });
    else await this.ref.set(clean);
  }
  async update(data: Partial<T>): Promise<void> { await this.ref.update(withoutUndefined(data) as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>); }
}

export class FirestoreQuery<T = unknown> {
  constructor(public query: FirebaseFirestore.Query) {}
  where(field: string, op: WhereOp, value: unknown): FirestoreQuery<T> { return new FirestoreQuery<T>(this.query.where(field, op, value)); }
  orderBy(field: string, direction: "asc" | "desc" = "asc"): FirestoreQuery<T> { return new FirestoreQuery<T>(this.query.orderBy(field, direction)); }
  limit(n: number): FirestoreQuery<T> { return new FirestoreQuery<T>(this.query.limit(n)); }
  async get(): Promise<AdminQuerySnapshot<T>> { return new FirestoreQuerySnapshot<T>(await this.query.get()); }
}

export class FirestoreCollectionReference<T = unknown> extends FirestoreQuery<T> {
  constructor(private collectionRef: FirebaseFirestore.CollectionReference) { super(collectionRef); }
  doc(id?: string): FirestoreDocumentReference<T> { return new FirestoreDocumentReference<T>(id ? this.collectionRef.doc(id) : this.collectionRef.doc()); }
}

class FirestoreWriteBatch {
  constructor(private batch: FirebaseFirestore.WriteBatch) {}
  set<T>(ref: FirestoreDocumentReference<T>, data: T, options?: { merge?: boolean }) {
    const clean = withoutUndefined(data) as FirebaseFirestore.DocumentData;
    if (options?.merge) this.batch.set(ref.ref, clean, { merge: true });
    else this.batch.set(ref.ref, clean);
  }
  update<T>(ref: FirestoreDocumentReference<T>, data: Partial<T>) { this.batch.update(ref.ref, withoutUndefined(data) as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>); }
  async commit() { await this.batch.commit(); }
}

class FirestoreTransaction {
  constructor(private tx: FirebaseFirestore.Transaction) {}
  get<T>(target: FirestoreDocumentReference<T>): Promise<AdminDocumentSnapshot<T>>;
  get<T>(target: FirestoreQuery<T>): Promise<AdminQuerySnapshot<T>>;
  async get<T>(target: FirestoreDocumentReference<T> | FirestoreQuery<T>): Promise<AdminDocumentSnapshot<T> | AdminQuerySnapshot<T>> {
    if (target instanceof FirestoreDocumentReference) return new FirestoreDocumentSnapshot<T>(await this.tx.get(target.ref));
    return new FirestoreQuerySnapshot<T>(await this.tx.get(target.query));
  }
  set<T>(ref: FirestoreDocumentReference<T>, data: T, options?: { merge?: boolean }) {
    const clean = withoutUndefined(data) as FirebaseFirestore.DocumentData;
    if (options?.merge) this.tx.set(ref.ref, clean, { merge: true });
    else this.tx.set(ref.ref, clean);
  }
  update<T>(ref: FirestoreDocumentReference<T>, data: Partial<T>) { this.tx.update(ref.ref, withoutUndefined(data) as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>); }
}

export class FirebaseAdminDbCompat extends AdminDbCompat {
  private db = firestore();
  collection<T = unknown>(name: string): any { return new FirestoreCollectionReference<T>(this.db.collection(name)); }
  batch(): any { return new FirestoreWriteBatch(this.db.batch()); }
  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> { return this.db.runTransaction((tx) => fn(new FirestoreTransaction(tx))); }
}

/* ---------- public factories ---------- */

export const isAdminConfigured = true;
export const isD1Configured = () => Boolean(env().DB);
export const isFirestoreConfigured = () => !isD1Configured() && Boolean(firebaseProjectId());
export function adminDb(): AdminDbCompat { return isD1Configured() ? new AdminDbCompat() : new FirebaseAdminDbCompat(); }

interface FirebaseJwtPayload {
  sub?: string;
  user_id?: string;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64UrlJson<T>(value: string): T { return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T; }

async function verifyFirebaseTokenOnCloudflare(token: string): Promise<FirebaseJwtPayload> {
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) throw new Error("Malformed token");
  const header = base64UrlJson<{ kid?: string; alg?: string }>(headerPart);
  const payload = base64UrlJson<FirebaseJwtPayload>(payloadPart);
  const projectId = firebaseProjectId();
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required to verify Firebase ID tokens on Cloudflare");
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Firebase token header");
  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("Firebase token project mismatch");
  if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new Error("Firebase token expired");

  const jwks = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com").then((r) => r.json() as Promise<{ keys?: JsonWebKey[] }>);
  const jwk = jwks.keys?.find((key) => (key as JsonWebKey & { kid?: string }).kid === header.kid);
  if (!jwk) throw new Error("Firebase signing key not found");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64UrlToBytes(signaturePart), new TextEncoder().encode(`${headerPart}.${payloadPart}`));
  if (!ok) throw new Error("Invalid Firebase token signature");
  return payload;
}

export const adminAuth = () => ({
  async verifyIdToken(token: string) {
    if (!isD1Configured()) return getAuth(firebaseApp()).verifyIdToken(token);
    const decoded = await verifyFirebaseTokenOnCloudflare(token);
    const uid = decoded.user_id || decoded.sub;
    if (!uid) throw new Error("Firebase token missing uid");
    return { ...decoded, uid };
  },
});
