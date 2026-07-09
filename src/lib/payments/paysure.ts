import "server-only";

const DEFAULT_LIVE_BASE_URL = "https://webapi.paysure.ng/api/v1";
const DEFAULT_TEST_BASE_URL = "https://sandbox.paysure.ng/api/v1/dev";
const DEFAULT_CHECKOUT_URL = "https://payments.paysure.ng/checkout/gateway";

interface PaysureAuthResponse {
  token?: string;
  data?: { token?: string };
}

interface PaysureEnvelope<T> {
  status?: number;
  data?: T;
  message?: string;
  responseDate?: string;
  responseTime?: string;
  responseUID?: string;
}

interface PaysureVerifyData {
  transactionReference?: string;
  status?: boolean;
  message?: string;
  fee?: number;
  currency?: string;
  transactionItem?: {
    transactionReference?: string;
    channel?: string;
    status?: string;
    date?: string;
    amount?: number;
    paysureId?: string;
  };
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface PaysureVerifyResult {
  reference: string;
  success: boolean;
  status: string;
  amount: number; // minor units
  currency: string;
  paidAt?: string;
  channel?: string;
  providerMessage?: string;
  customer?: { name?: string; phone?: string; email?: string };
  raw?: unknown;
}

export interface PaysureCheckoutInput {
  reference: string;
  amount: number; // minor units
  email: string;
  name: string;
  phone: string;
  callbackUrl: string;
  cancelUrl: string;
  channels?: string;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Paysure is not configured yet. Add ${name} to the server environment.`);
  return value;
}

function baseUrl() {
  if (process.env.PAYSURE_BASE_URL?.trim()) return process.env.PAYSURE_BASE_URL.trim().replace(/\/$/, "");
  return process.env.PAYSURE_ENV === "live" ? DEFAULT_LIVE_BASE_URL : DEFAULT_TEST_BASE_URL;
}

function checkoutBaseUrl() {
  return process.env.PAYSURE_CHECKOUT_URL?.trim() || DEFAULT_CHECKOUT_URL;
}

export function isPaysureConfigured() {
  return Boolean(process.env.PAYSURE_APP_ID?.trim() && process.env.PAYSURE_PAYMENT_SECRET?.trim() && process.env.PAYSURE_PUBLIC_KEY?.trim());
}

async function authenticatePaysure() {
  const res = await fetch(`${baseUrl()}/payments/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appId: requiredEnv("PAYSURE_APP_ID"),
      paymentSecret: requiredEnv("PAYSURE_PAYMENT_SECRET"),
      publicKey: requiredEnv("PAYSURE_PUBLIC_KEY"),
    }),
  });
  const payload = (await res.json().catch(() => ({}))) as PaysureAuthResponse;
  const token = payload.token || payload.data?.token;
  if (!res.ok || !token) throw new Error("Paysure authentication failed.");
  return token;
}

async function paysureFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await authenticatePaysure();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await res.json().catch(() => ({}))) as PaysureEnvelope<T>;
  if (!res.ok || (payload.status && payload.status >= 400)) {
    throw new Error(payload.message || "Paysure request failed.");
  }
  return (payload.data ?? payload) as T;
}

export function buildPaysureCheckoutUrl(input: PaysureCheckoutInput) {
  const url = new URL(checkoutBaseUrl());
  url.searchParams.set("k", requiredEnv("PAYSURE_PUBLIC_KEY"));
  url.searchParams.set("a", (input.amount / 100).toFixed(2));
  url.searchParams.set("e", input.email);
  url.searchParams.set("n", input.name);
  url.searchParams.set("p", input.phone);
  url.searchParams.set("ref", input.reference);
  url.searchParams.set("cburl", input.callbackUrl);
  url.searchParams.set("cburlx", input.cancelUrl);
  url.searchParams.set("hasAccessTo", input.channels || "bank_card,ussd,bank_transfer");
  return url.toString();
}

export async function verifyPaysureCheckoutTransaction(reference: string): Promise<PaysureVerifyResult> {
  const data = await paysureFetch<PaysureVerifyData>(`/payments/verifyCheckoutTransaction?reference=${encodeURIComponent(reference)}`);
  const tx = data.transactionItem;
  const majorAmount = Number(tx?.amount ?? 0);
  const status = String(tx?.status || data.message || (data.status ? "SUCCESS" : "FAILED")).toUpperCase();
  return {
    reference: String(data.transactionReference || tx?.transactionReference || reference).toUpperCase(),
    success: data.status === true || status === "SUCCESS",
    status,
    amount: Math.round(majorAmount * 100),
    currency: data.currency || "NGN",
    paidAt: tx?.date,
    channel: tx?.channel,
    providerMessage: data.message,
    customer: data.customer,
    raw: data,
  };
}
