import { createHash, randomBytes } from "crypto";
import type { ContributionData } from "@/lib/data/repo-types";
import type { CurrencyCode } from "@/lib/types";

export type PaymentIntentStatus = "pending" | "confirmed" | "review" | "expired" | "cancelled";
export type BankAlertStatus = "auto_confirmed" | "manual_confirmed" | "needs_review" | "duplicate" | "ignored" | "rejected";

export interface SettlementAccountPublic {
  bankName: string;
  accountName: string;
  accountNumber: string;
  alertSenderEmail: string;
  alertInboxEmail: string;
}

export interface BankTransferPaymentIntent {
  id: string;
  reference: string;
  eventSlug: string;
  eventId: string;
  expectedAmount: number; // contribution/gift amount in minor units
  serviceFee: number; // minor units
  totalTransferAmount: number; // amount expected in the bank alert, minor units
  currency: CurrencyCode;
  contribution: ContributionData;
  status: PaymentIntentStatus;
  settlementAccount: SettlementAccountPublic;
  alertId?: string;
  bankDocumentNumber?: string;
  reviewReason?: string;
  createdAt: string;
  expiresAt: string;
  confirmedAt?: string;
}

export interface ParsedBankAlert {
  source: "gtbank-email" | "unknown";
  isCredit: boolean;
  senderEmail?: string;
  recipientEmail?: string;
  subject?: string;
  accountLast4?: string;
  amount?: number; // minor units
  currency?: CurrencyCode;
  description?: string;
  documentNumber?: string;
  valueDate?: string;
  transactionTime?: string;
  paymentReference?: string;
  rawText: string;
  receivedAt: string;
}

export interface BankAlertRecord extends ParsedBankAlert {
  id: string;
  status: BankAlertStatus;
  matchedIntentId?: string;
  matchedReference?: string;
  matchScore: number;
  reviewReason?: string;
  createdAt: string;
}

export const TEMP_SETTLEMENT_ACCOUNT: SettlementAccountPublic = {
  bankName: "GTBANK",
  accountName: "NEIGHBOURS NG TECHNOLOGIES",
  accountNumber: "0616359108",
  alertSenderEmail: "GENS@GTBANK.COM",
  alertInboxEmail: "deen@neighbours.com.ng",
};

export function createGiftCashReference() {
  // Temporary bank-transfer bridge: use a short 4-digit code that is easy to type
  // into Nigerian bank narration/reference fields.
  return String(randomBytes(2).readUInt16BE(0) % 10000).padStart(4, "0");
}

export function normalizePaymentReference(value?: string) {
  return value?.trim().toUpperCase();
}

export function bankAlertId(alert: ParsedBankAlert) {
  if (alert.documentNumber) return `gtbank-${alert.documentNumber}`;
  const hash = createHash("sha256")
    .update(`${alert.senderEmail ?? ""}|${alert.amount ?? ""}|${alert.description ?? ""}|${alert.receivedAt}|${alert.rawText}`)
    .digest("hex")
    .slice(0, 24);
  return `bank-alert-${hash}`;
}

export function normalizeEmail(value?: string) {
  return value?.trim().replace(/^<|>$/g, "").toLowerCase();
}

export function parseGtbankCreditAlert(input: {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  receivedAt?: string;
}): ParsedBankAlert {
  const rawText = stripHtml(input.text || input.html || "").replace(/\r/g, "").trim();
  const text = rawText.replace(/[ \t]+/g, " ");
  const amountMatch = text.match(/Amount\s*:?\s*NGN\s*([0-9,]+(?:\.\d{1,2})?)/i);
  const docMatch = text.match(/Document Number\s*:?\s*([A-Z0-9-]+)/i);
  const accountMatch = text.match(/Account Number\s*:?\s*\*+\s*([0-9]{2,6})/i);
  const descMatch = text.match(/Description\s*:?\s*([\s\S]+?)(?:\s+Amount\s*:|\s+Value Date\s*:|\n\s*Amount\s*:)/i);
  const valueDateMatch = text.match(/Value Date\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  const timeMatch = text.match(/Time of Transaction\s*:?\s*([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?\s*(?:AM|PM)?)/i);
  const description = descMatch?.[1]?.trim().replace(/\s+/g, " ");
  const legacyRefMatch = text.match(/\b(GC[A-Z0-9]{6,10})\b/i);
  const fourDigitRefMatch = description?.match(/\b([0-9]{4})\b/) ?? text.match(/\b(?:ref(?:erence)?|narration|code)\D{0,12}([0-9]{4})\b/i);
  const credit = /\bCREDIT\b/i.test(text) || /credit transaction occurred/i.test(text);

  return {
    source: normalizeEmail(input.from) === "gens@gtbank.com" ? "gtbank-email" : "unknown",
    isCredit: credit,
    senderEmail: normalizeEmail(input.from),
    recipientEmail: normalizeEmail(input.to),
    subject: input.subject,
    accountLast4: accountMatch?.[1],
    amount: amountMatch ? nairaToMinor(amountMatch[1]) : undefined,
    currency: amountMatch ? "NGN" : undefined,
    description,
    documentNumber: docMatch?.[1],
    valueDate: valueDateMatch?.[1],
    transactionTime: timeMatch?.[1],
    paymentReference: normalizePaymentReference(fourDigitRefMatch?.[1] ?? legacyRefMatch?.[1]),
    rawText,
    receivedAt: input.receivedAt || new Date().toISOString(),
  };
}

export function scoreAlertMatch(alert: ParsedBankAlert, intent: BankTransferPaymentIntent) {
  let score = 0;
  const reasons: string[] = [];
  if (alert.senderEmail === TEMP_SETTLEMENT_ACCOUNT.alertSenderEmail.toLowerCase()) score += 25;
  else reasons.push("Bank sender email did not match configured GTBank alert sender.");
  if (alert.isCredit) score += 20;
  else reasons.push("Alert was not identified as a credit transaction.");
  if (normalizePaymentReference(alert.paymentReference) === normalizePaymentReference(intent.reference)) score += 30;
  else reasons.push("GiftCash payment reference was not found or did not match.");
  if (alert.amount === intent.totalTransferAmount) score += 20;
  else reasons.push("Alert amount did not exactly match the expected transfer total.");
  if (alert.accountLast4 && intent.settlementAccount.accountNumber.endsWith(alert.accountLast4)) score += 5;
  return { score, reasons };
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function nairaToMinor(value: string) {
  return Math.round(Number(value.replace(/,/g, "")) * 100);
}
