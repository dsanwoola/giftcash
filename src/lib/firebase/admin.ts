import "server-only";
import { nanoid } from "nanoid";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Cloudflare D1-backed compatibility layer for the old Firebase Admin call sites.
 *
 * This file intentionally does not import firebase-admin. It provides the small
 * Firestore/Admin Auth surface area the current API routes still use while the
 * app is migrated to first-class D1 repositories.
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

export interface AdminDocumentSnapshot<T = unknown> {
  exists: boolean;
  data(): T | undefined;
}

export interface AdminQuerySnapshot<T = unknown> {
  docs: Array<{ id: string; data(): T; ref: AdminDocumentReference<T> }>;
  forEach(cb: (doc: { id: string; data(): T; ref: AdminDocumentReference<T> }) => void): void;
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
  if (!db) {
    throw new Error("Cloudflare D1 binding DB is not configured. Run under OpenNext/Cloudflare or configure wrangler d1_databases.");
  }
  return db;
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
    this.docs = rows.map((row) => ({
      id: row.id,
      data: () => row.data,
      ref: new AdminDocumentReference<T>(collectionName, row.id),
    }));
  }
  forEach(cb: (doc: { id: string; data(): T; ref: AdminDocumentReference<T> }) => void) {
    this.docs.forEach(cb);
  }
}

export class AdminDocumentReference<T = unknown> {
  constructor(private collectionName: string, public id: string) {}
  async get(): Promise<AdminDocumentSnapshot<T>> {
    return new DocumentSnapshot<T>(await readDocument<T>(this.collectionName, this.id));
  }
  async set(data: T, options?: { merge?: boolean }): Promise<void> {
    await writeDocument(this.collectionName, this.id, data, !!options?.merge);
  }
  async update(data: Partial<T>): Promise<void> {
    await updateDocument(this.collectionName, this.id, data as JsonRecord);
  }
}

export class AdminQuery<T = unknown> {
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private maxRows?: number;

  constructor(private collectionName: string) {}

  where(field: string, op: WhereOp, value: unknown): AdminQuery<T> {
    const q = this.clone();
    q.filters.push({ field, op, value });
    return q;
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc"): AdminQuery<T> {
    const q = this.clone();
    q.orders.push({ field, direction });
    return q;
  }

  limit(n: number): AdminQuery<T> {
    const q = this.clone();
    q.maxRows = n;
    return q;
  }

  async get(): Promise<AdminQuerySnapshot<T>> {
    await ensureDocumentTable();
    const res = await d1()
      .prepare("SELECT document_id, data_json FROM documents WHERE collection_name = ?")
      .bind(this.collectionName)
      .all<{ document_id: string; data_json: string }>();
    let rows = (res.results ?? []).map((row) => ({ id: row.document_id, data: JSON.parse(row.data_json) as T & JsonRecord }));
    for (const filter of this.filters) {
      rows = rows.filter((row) => getPathValue(row.data, filter.field) === filter.value);
    }
    for (const order of [...this.orders].reverse()) {
      rows = rows.sort((a, b) => {
        const av = getPathValue(a.data, order.field);
        const bv = getPathValue(b.data, order.field);
        const cmp = String(av ?? "").localeCompare(String(bv ?? ""));
        return order.direction === "desc" ? -cmp : cmp;
      });
    }
    if (this.maxRows !== undefined) rows = rows.slice(0, this.maxRows);
    return new QuerySnapshot<T>(this.collectionName, rows);
  }

  private clone(): AdminQuery<T> {
    const q = new AdminQuery<T>(this.collectionName);
    q.filters = [...this.filters];
    q.orders = [...this.orders];
    q.maxRows = this.maxRows;
    return q;
  }
}

export class AdminCollectionReference<T = unknown> extends AdminQuery<T> {
  constructor(private name: string) { super(name); }
  doc(id = nanoid()): AdminDocumentReference<T> {
    return new AdminDocumentReference<T>(this.name, id);
  }
}

class WriteBatch {
  private ops: Array<() => Promise<void>> = [];
  set<T>(ref: AdminDocumentReference<T>, data: T, options?: { merge?: boolean }) {
    this.ops.push(() => ref.set(data, options));
  }
  update<T>(ref: AdminDocumentReference<T>, data: Partial<T>) {
    this.ops.push(() => ref.update(data));
  }
  async commit() {
    for (const op of this.ops) await op();
  }
}

class Transaction extends WriteBatch {
  get<T>(target: AdminDocumentReference<T>): Promise<AdminDocumentSnapshot<T>>;
  get<T>(target: AdminQuery<T>): Promise<AdminQuerySnapshot<T>>;
  get<T>(target: AdminDocumentReference<T> | AdminQuery<T>) {
    return target.get();
  }
}

export class AdminDbCompat {
  collection<T = unknown>(name: string): AdminCollectionReference<T> {
    return new AdminCollectionReference<T>(name);
  }
  batch() { return new WriteBatch(); }
  async runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    // D1 transactions are added in the first-class repository layer. This
    // compatibility shim executes operations sequentially to remove Firebase
    // Admin from the Worker bundle without changing all route call sites at once.
    return fn(new Transaction());
  }
}

export const isAdminConfigured = true;
export const isD1Configured = () => Boolean(env().DB);
export function adminDb(): AdminDbCompat { return new AdminDbCompat(); }

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

function base64UrlJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;
}

async function verifyFirebaseToken(token: string): Promise<FirebaseJwtPayload> {
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) throw new Error("Malformed token");
  const header = base64UrlJson<{ kid?: string; alg?: string }>(headerPart);
  const payload = base64UrlJson<FirebaseJwtPayload>(payloadPart);
  const projectId = env().FIREBASE_AUTH_PROJECT_ID || env().FIREBASE_PROJECT_ID || process.env.FIREBASE_AUTH_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required to verify Firebase ID tokens on Cloudflare");
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Firebase token header");
  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("Firebase token project mismatch");
  if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new Error("Firebase token expired");

  const jwks = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com").then(
    (r) => r.json() as Promise<{ keys?: JsonWebKey[] }>,
  );
  const jwk = jwks.keys?.find((key) => (key as JsonWebKey & { kid?: string }).kid === header.kid);
  if (!jwk) throw new Error("Firebase signing key not found");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  );
  if (!ok) throw new Error("Invalid Firebase token signature");
  return payload;
}

export const adminAuth = () => ({
  async verifyIdToken(token: string) {
    const decoded = await verifyFirebaseToken(token);
    const uid = decoded.user_id || decoded.sub;
    if (!uid) throw new Error("Firebase token missing uid");
    return { ...decoded, uid };
  },
});
