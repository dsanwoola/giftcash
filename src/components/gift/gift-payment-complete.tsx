"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Loader2, TriangleAlert } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { repo } from "@/lib/data/repo";
import type { Gift, GiftView } from "@/lib/types";

export function GiftPaymentComplete({ payment, slug, reference, reason }: { payment?: string; slug?: string; reference?: string; reason?: string }) {
  const [gift, setGift] = useState<Gift | GiftView | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug || payment !== "success") {
      setGift(null);
      return;
    }
    repo.getGift(slug).then(setGift).catch(() => setGift(null));
  }, [payment, slug]);

  if (payment !== "success" || !slug) {
    return (
      <main className="grid min-h-dvh place-items-center bg-cream px-5 text-center">
        <div className="max-w-md">
          <TriangleAlert className="mx-auto h-14 w-14 text-pink" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Payment was not completed</h1>
          <p className="mt-2 text-sm text-muted">{reason || "We could not verify this payment. No GiftCash was created."}</p>
          {reference && <p className="mt-2 text-xs text-muted">Reference: {reference}</p>}
          <ButtonLink href="/gift/create" className="mt-6">Try again</ButtonLink>
        </div>
      </main>
    );
  }

  if (gift === undefined) return <div className="grid min-h-dvh place-items-center bg-cream"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>;
  if (!gift) return <div className="grid min-h-dvh place-items-center bg-cream px-5 text-center"><div><TriangleAlert className="mx-auto h-12 w-12 text-pink" /><h1 className="mt-3 font-display text-2xl font-semibold">Verified gift is still syncing</h1><p className="mt-2 text-sm text-muted">Refresh shortly or use your payment reference with support: {reference}</p></div></div>;

  const url = typeof window !== "undefined" ? `${window.location.origin}/gift/${gift.slug}` : `/gift/${gift.slug}`;
  const shareText = `🎁 ${gift.recipientName}, I sent you a GiftCash! Open it here: ${url}`;
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="min-h-dvh bg-cream">
      <div className="mx-auto max-w-lg px-5 py-6 pb-12">
        <Logo />
        <div className="mt-10 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald" />
          <h1 className="mt-4 font-display text-3xl font-semibold">Your GiftCash is funded 🎉</h1>
          <p className="mt-2 text-muted">Payment verified. Share this private reveal link with {gift.recipientName}.</p>
        </div>
        <div className="mx-auto mt-7 w-fit rounded-3xl border border-ink/5 bg-white p-5 shadow-soft">
          <QRCodeSVG value={url} size={176} fgColor="#1b1226" />
        </div>
        <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-3">
          <p className="truncate text-sm text-muted">{url}</p>
          <Button onClick={copy} variant="outline" className="mt-3 w-full"><Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy gift link"}</Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"><Button className="w-full">Share on WhatsApp</Button></a>
          <ButtonLink href="/dashboard" variant="outline" className="w-full">Go to dashboard</ButtonLink>
        </div>
        {reference && <p className="mt-5 text-center text-xs text-muted">Payment reference: {reference}</p>}
        <p className="mt-4 text-center text-xs text-muted">Only share the gift link with the intended recipient.</p>
        <Link href="/" className="mt-5 block text-center text-sm text-brand underline">Back to GiftCash</Link>
      </div>
    </main>
  );
}
