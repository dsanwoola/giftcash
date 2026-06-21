"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { OCCASIONS, occasionById } from "@/lib/occasions";
import { CURRENCIES, toMinor } from "@/lib/money";
import { repo } from "@/lib/data/repo";
import type { CurrencyCode, OccasionId } from "@/lib/types";

const inputCls = "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none focus:border-brand";

export default function CreateGroupGift() {
  const router = useRouter();
  const [recipientName, setRecipientName] = useState("");
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [occasion, setOccasion] = useState<OccasionId>("birthday");
  const [target, setTarget] = useState("150000");
  const [currency, setCurrency] = useState<CurrencyCode>("NGN");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    if (!recipientName.trim() || !title.trim()) return setError("Add a recipient and a title.");
    if (toMinor(Number(target) || 0) < toMinor(1000)) return setError("Set a realistic target.");
    setError(""); setBusy(true);
    const group = await repo.createGroupGift({
      recipientName: recipientName.trim(),
      title: title.trim(),
      story: story.trim() || undefined,
      occasion,
      theme: occasionById(occasion).defaultTheme,
      targetAmount: toMinor(Number(target)),
      currency,
      deadline: deadline ? new Date(deadline).toISOString() : new Date(Date.now() + 14 * 86_400_000).toISOString(),
      organizerName: "Demo Sender",
    });
    router.push(`/group/${group.slug}`);
  };

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto max-w-lg px-4 py-4 pb-10 sm:px-5 sm:py-6">
        <div className="flex items-center justify-between"><Logo /><Link href="/dashboard" className="text-sm text-muted hover:text-ink">Dashboard</Link></div>
        <h1 className="mt-8 text-balance font-display text-2xl font-semibold sm:text-3xl">Start a group gift 🤝</h1>
        <p className="mt-1 text-sm text-muted">Pool contributions from friends, family or colleagues toward one big gift.</p>

        <div className="mt-6 space-y-4">
          <Field label="Who is it for? *"><input className={inputCls} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. Chidi" /></Field>
          <Field label="Title *"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chidi's surprise birthday gift" /></Field>
          <Field label="Occasion">
            <select className={inputCls} value={occasion} onChange={(e) => setOccasion(e.target.value as OccasionId)}>
              {OCCASIONS.map((o) => <option key={o.id} value={o.id}>{o.emoji} {o.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Target amount">
              <div className="grid gap-2 sm:flex">
                <select className={`${inputCls} sm:w-24`} value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol}</option>)}
                </select>
                <input className={inputCls} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))} />
              </div>
            </Field>
            <Field label="Deadline"><input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
          </div>
          <Field label="Story (optional)"><textarea rows={3} className={inputCls} value={story} onChange={(e) => setStory(e.target.value)} placeholder="Tell contributors what this is about…" /></Field>
          {error && <p className="text-sm text-pink">{error}</p>}
          <Button onClick={create} size="lg" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Create group gift</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm text-muted">{label}</span>{children}</label>;
}
