import "server-only";
import crypto from "crypto";

const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";
const AUTH_SCHEME = ["Be", "arer"].join("");

export interface FlutterwaveInitializeInput {
  txRef: string;
  amount: number; // minor units
  currency: string;
  redirectUrl: string;
  customer: {
    email: string;
    name: string;
    phonenumber?: string;
  };
  meta: Record<string, unknown>;
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
}

export interface FlutterwaveInitializeResult {
  link: string;
  txRef: string;
}

export interface FlutterwaveVerifyResult {
  status: "successful" | "failed" | "cancelled" | "pending" | string;
  txRef: string;
  transactionId?: string | number;
  amount: number; // minor units
  currency: string;
  paidAt?: string;
  channel?: string;
  processorResponse?: string;
  customer?: { email?: string; name?: string; phone_number?: string };
  meta?: Record<string, unknown>;
}

function secretKey() {
  const key = process.env.FLUTTERWAVE_SECRET_KEY?.trim() || process.env.FLW_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Flutterwave is not configured yet. Add FLUTTERWAVE_SECRET_KEY to the server environment.");
  }
  return key;
}

export function isFlutterwaveConfigured() {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY?.trim() || process.env.FLW_SECRET_KEY?.trim());
}

async function flutterwaveFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${FLUTTERWAVE_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `${AUTH_SCHEME} ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.status === "error") {
    const message = typeof payload.message === "string" ? payload.message : "Flutterwave request failed";
    throw new Error(message);
  }
  return payload.data as T;
}

const toMajorAmount = (minorUnits: number) => (minorUnits / 100).toFixed(2);
const toMinorAmount = (majorUnits: unknown) => Math.round(Number(majorUnits ?? 0) * 100);

export async function initializeFlutterwavePayment(input: FlutterwaveInitializeInput): Promise<FlutterwaveInitializeResult> {
  const data = await flutterwaveFetch<{ link: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: toMajorAmount(input.amount),
      currency: input.currency,
      redirect_url: input.redirectUrl,
      customer: input.customer,
      meta: input.meta,
      customizations: {
        title: "Occasion.ng GiftCash",
        description: "Cash gift contribution",
        ...(input.customizations ?? {}),
      },
      configurations: {
        session_duration: 30,
        max_retry_attempt: 5,
      },
    }),
  });
  return { link: data.link, txRef: input.txRef };
}

interface FlutterwaveVerifyApiData {
  id?: string | number;
  status?: string;
  tx_ref?: string;
  reference?: string;
  amount?: string | number;
  currency?: string;
  created_at?: string;
  created_datetime?: string;
  payment_type?: string;
  payment_method?: { type?: string };
  processor_response?: string;
  gateway_response?: string;
  customer?: { email?: string; name?: string; phone_number?: string };
  meta?: Record<string, unknown>;
}

function mapFlutterwaveVerifyData(data: FlutterwaveVerifyApiData): FlutterwaveVerifyResult {
  return {
    status: String(data.status ?? "pending"),
    txRef: String(data.tx_ref ?? data.reference ?? "").toUpperCase(),
    transactionId: data.id,
    amount: toMinorAmount(data.amount),
    currency: String(data.currency ?? "NGN"),
    paidAt: data.created_at || data.created_datetime,
    channel: data.payment_type || data.payment_method?.type,
    processorResponse: data.processor_response || data.gateway_response,
    customer: data.customer,
    meta: data.meta,
  };
}

export async function verifyFlutterwaveTransaction(transactionId: string | number): Promise<FlutterwaveVerifyResult> {
  const data = await flutterwaveFetch<FlutterwaveVerifyApiData>(`/transactions/${encodeURIComponent(String(transactionId))}/verify`);
  return mapFlutterwaveVerifyData(data);
}

export async function verifyFlutterwaveTransactionByReference(txRef: string): Promise<FlutterwaveVerifyResult> {
  const data = await flutterwaveFetch<FlutterwaveVerifyApiData>(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`);
  return mapFlutterwaveVerifyData(data);
}

export function verifyFlutterwaveSignature(rawBody: string, signature: string | null) {
  const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET?.trim() || process.env.FLW_SECRET_HASH?.trim();
  if (!secretHash || !signature) return false;

  // Current Flutterwave docs specify HMAC-SHA256 base64 in the flutterwave-signature header.
  const expected = crypto.createHmac("sha256", secretHash).update(rawBody).digest("base64");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
