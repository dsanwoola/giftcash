import type { CurrencyCode } from "./types";

/**
 * Money is stored everywhere in MINOR units (kobo/cents) as integers to avoid
 * floating point drift in the ledger. Display helpers convert at the edge.
 */

const SYMBOLS: Record<CurrencyCode, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  GHS: "₵",
  KES: "KSh",
  ZAR: "R",
};

const LOCALES: Record<CurrencyCode, string> = {
  NGN: "en-NG",
  USD: "en-US",
  GBP: "en-GB",
  GHS: "en-GH",
  KES: "en-KE",
  ZAR: "en-ZA",
};

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] =
  (Object.keys(SYMBOLS) as CurrencyCode[]).map((code) => ({
    code,
    label: code,
    symbol: SYMBOLS[code],
  }));

export const toMinor = (major: number) => Math.round(major * 100);
export const toMajor = (minor: number) => minor / 100;

/** Format minor units → "₦25,000". */
export function formatMoney(minor: number, currency: CurrencyCode = "NGN") {
  return new Intl.NumberFormat(LOCALES[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(toMajor(minor)) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(toMajor(minor));
}

export const currencySymbol = (currency: CurrencyCode) => SYMBOLS[currency];

/**
 * Revenue model (spec section N): basic sender service fee.
 * 1.5% capped at ₦500-equivalent (50_000 minor), minimum ₦100 (10_000 minor).
 */
export function serviceFee(amountMinor: number): number {
  const pct = Math.round(amountMinor * 0.015);
  return Math.min(50_000, Math.max(10_000, pct));
}
