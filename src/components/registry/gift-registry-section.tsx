"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Gift, Loader2, Plus, ShoppingBag, X } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { formatMoney, toMinor } from "@/lib/money";
import type { CurrencyCode, PrivateRegistryItem, RegistryPayload, PublicRegistryItem } from "@/lib/types";

async function tokenHeaders(): Promise<Record<string, string>> {
  let token: string | undefined;
  try { token = await getFirebaseAuth().currentUser?.getIdToken(); } catch { /* same-site session fallback */ }
  return token ? { Authorization: "Bearer ".concat(token) } : {};
}

async function payload<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

const priorityLabel = { most_wanted: "Most wanted", would_love: "Would love", nice_to_have: "Nice to have" } as const;
const inputClass = "min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";

function isPrivateRegistryItem(item: PublicRegistryItem | PrivateRegistryItem): item is PrivateRegistryItem {
  return "fundedAmount" in item;
}

export function GiftRegistrySection({ slug, celebrants, currency, viewerRole }: { slug: string; celebrants: string; currency: CurrencyCode; viewerRole: "public" | "organizer" | "admin" }) {
  const [registry, setRegistry] = useState<RegistryPayload>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<PublicRegistryItem | PrivateRegistryItem>();

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}/registry`, { cache: "no-store", credentials: "same-origin", headers: await tokenHeaders() });
      setRegistry(await payload<RegistryPayload>(response));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load this gift registry.");
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { void load(); }, [load, viewerRole]);

  if (loading) return viewerRole === "public" ? null : <div className="mt-6 grid min-h-28 place-items-center rounded-3xl border border-ink/5 bg-white/70"><Loader2 className="h-5 w-5 animate-spin text-brand" /></div>;
  if (!registry) return error ? <p className="mt-5 rounded-2xl bg-pink/10 p-4 text-sm text-pink">{error}</p> : null;
  const privateView = registry.viewerRole === "organizer" || registry.viewerRole === "admin";
  if (!registry.enabled && !privateView) return null;

  return (
    <section id="gift-registry" className="mt-6 rounded-3xl border border-brand/10 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div><span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"><ShoppingBag className="h-3.5 w-3.5" /> Gift Registry</span><h2 className="mt-3 font-display text-2xl font-semibold">Help us get something we’ll love</h2><p className="mt-1 text-sm text-muted">{registry.introduction || `${celebrants} have selected a few meaningful gift ideas.`}</p></div>
        {registry.viewerRole === "organizer" && <button onClick={() => setAdding(true)} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-brand px-3 text-sm font-medium text-white"><Plus className="h-4 w-4" /> Add</button>}
      </div>

      {registry.viewerRole === "organizer" && <RegistrySettings slug={slug} registry={registry} onSaved={load} />}
      {privateView && <div className="mt-4 rounded-2xl bg-emerald/10 px-4 py-3"><p className="text-xs font-medium text-emerald">Private {registry.viewerRole === "admin" ? "Super Admin" : "organizer"} view</p><p className="mt-1 font-display text-xl font-semibold text-emerald">{formatMoney(registry.contributionTotal, currency)} registry gifts received</p></div>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {registry.items.map((item) => <RegistryCard key={item.id} item={item} privateView={privateView} viewerRole={registry.viewerRole} onFund={() => setSelected(item)} onChanged={load} slug={slug} />)}
      </div>
      {registry.items.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-ink/15 px-5 py-8 text-center"><Gift className="mx-auto h-7 w-7 text-brand" /><p className="mt-2 text-sm text-muted">{privateView ? "No registry items yet." : "The registry will be available soon."}</p></div>}
      <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-xs leading-relaxed text-muted"><strong className="text-ink">Cash-backed registry:</strong> you are funding the value of a selected gift. GiftCash sends the money to the organizer and does not sell, stock, purchase, or deliver the physical item.</p>
      {error && <p className="mt-3 text-sm text-pink">{error}</p>}

      {adding && <AddRegistryItem slug={slug} currency={currency} onClose={() => setAdding(false)} onCreated={() => { setAdding(false); void load(); }} />}
      {selected && <RegistryCheckout slug={slug} item={selected} celebrants={celebrants} onClose={() => setSelected(undefined)} />}
    </section>
  );
}

function RegistrySettings({ slug, registry, onSaved }: { slug: string; registry: RegistryPayload & { viewerRole: "organizer" | "admin" }; onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [introduction, setIntroduction] = useState(registry.introduction ?? "");
  const save = async (enabled: boolean) => {
    setBusy(true);
    try {
      await payload(await fetch(`/api/events/${slug}/registry`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json", ...(await tokenHeaders()) }, body: JSON.stringify({ enabled, introduction }) }));
      await onSaved();
    } finally { setBusy(false); }
  };
  return <div className="mt-4 rounded-2xl border border-ink/10 p-3"><label className="block text-xs font-medium text-muted">Registry introduction<textarea value={introduction} onChange={(event) => setIntroduction(event.target.value)} maxLength={500} className={`${inputClass} mt-1 min-h-16`} placeholder="Tell friends what these gifts would mean to you." /></label><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} onClick={() => void save(registry.enabled)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand px-4 text-sm font-medium text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save introduction</button><button disabled={busy} onClick={() => void save(!registry.enabled)} className="min-h-10 rounded-full border border-ink/10 px-4 text-sm disabled:opacity-50">{registry.enabled ? "Hide registry from guests" : "Enable registry for guests"}</button></div></div>;
}

function RegistryCard({ item, privateView, viewerRole, onFund, onChanged, slug }: { item: PublicRegistryItem | PrivateRegistryItem; privateView: boolean; viewerRole: RegistryPayload["viewerRole"]; onFund: () => void; onChanged: () => Promise<void>; slug: string }) {
  const canonical = isPrivateRegistryItem(item) ? item : undefined;
  const publicStatus = isPrivateRegistryItem(item) ? undefined : item.publicStatus;
  const totalTarget = canonical ? canonical.targetAmount * canonical.quantity : item.targetAmount;
  const gifted = canonical ? canonical.fundedAmount >= (totalTarget ?? 0) : publicStatus === "gifted";
  const reserved = publicStatus === "reserved";
  const [busy, setBusy] = useState(false);
  const mutate = async (method: "PATCH" | "DELETE", body?: object) => {
    setBusy(true);
    try {
      await payload(await fetch(`/api/events/${slug}/registry/items/${item.id}`, { method, credentials: "same-origin", headers: { "Content-Type": "application/json", ...(await tokenHeaders()) }, body: body ? JSON.stringify(body) : undefined }));
      await onChanged();
    } finally { setBusy(false); }
  };
  return (
    <article className={`overflow-hidden rounded-2xl border bg-white ${gifted ? "border-emerald/25" : "border-ink/10"}`}>
      <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-soft to-gold-soft bg-cover bg-center" style={item.imageUrl ? { backgroundImage: `url(${JSON.stringify(item.imageUrl).slice(1, -1)})` } : undefined}>{!item.imageUrl && <Gift className="absolute inset-0 m-auto h-10 w-10 text-brand/40" />}{gifted && <span className="absolute inset-x-4 top-4 rounded-full bg-emerald px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white shadow-soft"><Check className="mr-1 inline h-4 w-4" /> Gifted with love</span>}</div>
      <div className="p-4">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand">{priorityLabel[item.priority]}</span>
        <h3 className="mt-1 font-display text-lg font-semibold">{item.name}</h3>
        {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
        {!gifted && item.targetAmount !== undefined && <p className="mt-3 font-display text-xl font-semibold">{formatMoney(item.targetAmount, item.currency)}{canonical && canonical.quantity > 1 ? " each" : ""}</p>}
        {!privateView && !gifted && <button disabled={reserved} onClick={onFund} className="mt-4 min-h-11 w-full rounded-full bg-brand px-4 text-sm font-semibold text-white disabled:bg-ink/20">{reserved ? "Someone is currently gifting this" : item.fundingMode === "full" ? "Fund this gift" : "Contribute towards it"}</button>}
        {canonical && <div className="mt-3 space-y-1 rounded-xl bg-cream p-3 text-xs text-muted"><p>Received: <strong className="text-ink">{formatMoney(canonical.fundedAmount, canonical.currency)}</strong></p><p>Funding: {canonical.fundingMode === "full" ? "Complete gift" : "Group contributions"} • Quantity {canonical.fundedQuantity}/{canonical.quantity}</p>{canonical.activeReservationCount > 0 && <p>{canonical.activeReservationCount} active checkout reservation{canonical.activeReservationCount === 1 ? "" : "s"}</p>}{canonical.retailerReferenceUrl && <a href={canonical.retailerReferenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand">Private retailer reference <ExternalLink className="h-3 w-3" /></a>}{canonical.privateNotes && <p>Private note: {canonical.privateNotes}</p>}{canonical.contributions.length > 0 && <details className="pt-1"><summary className="cursor-pointer font-semibold text-ink">{canonical.contributions.length} verified gifter{canonical.contributions.length === 1 ? "" : "s"}</summary><div className="mt-2 space-y-2">{canonical.contributions.map((contribution) => <div key={contribution.id} className="rounded-lg bg-white p-2"><div className="flex justify-between gap-2"><span className="font-medium text-ink">{contribution.name}</span><span>{formatMoney(contribution.amount, contribution.currency)}</span></div>{contribution.message && <p className="mt-1">“{contribution.message}”</p>}<p className="mt-1 text-[10px]">{new Date(contribution.createdAt).toLocaleString()}</p></div>)}</div></details>}</div>}
        {viewerRole === "organizer" && canonical && <div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => void mutate("PATCH", { status: canonical.status === "hidden" ? "active" : "hidden" })} className="min-h-9 flex-1 rounded-full border border-ink/10 px-3 text-xs">{canonical.status === "hidden" ? "Publish" : "Hide"}</button>{canonical.fundedAmount === 0 && <button disabled={busy} onClick={() => void mutate("DELETE")} className="min-h-9 rounded-full border border-pink/20 px-3 text-xs text-pink">Delete</button>}</div>}
        {viewerRole === "organizer" && canonical && <EditRegistryItemForm slug={slug} item={canonical} onChanged={onChanged} />}
      </div>
    </article>
  );
}

function EditRegistryItemForm({ slug, item, onChanged }: { slug: string; item: PrivateRegistryItem; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      await payload(await fetch(`/api/events/${slug}/registry/items/${item.id}`, {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json", ...(await tokenHeaders()) },
        body: JSON.stringify({ name: form.get("name"), description: form.get("description"), retailerReferenceUrl: form.get("retailerReferenceUrl"), privateNotes: form.get("privateNotes"), targetAmount: toMinor(Number(form.get("amount"))), fundingMode: locked ? item.fundingMode : form.get("fundingMode"), quantity: Number(form.get("quantity")), priority: form.get("priority") }),
      }));
      const file = form.get("image");
      if (file instanceof File && file.size > 0) {
        const image = new FormData(); image.set("file", file);
        await payload(await fetch(`/api/events/${slug}/registry/items/${item.id}/image`, { method: "POST", credentials: "same-origin", headers: await tokenHeaders(), body: image }));
      }
      await onChanged();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Could not update this gift."); } finally { setBusy(false); }
  };
  const locked = item.fundedAmount > 0;
  return <details className="mt-3 rounded-xl border border-ink/10 p-3"><summary className="cursor-pointer text-xs font-semibold text-brand">Edit gift details</summary><form onSubmit={submit} className="mt-3 space-y-3"><Field label="Gift name"><input name="name" required maxLength={100} defaultValue={item.name} className={inputClass} /></Field><Field label="Description"><textarea name="description" maxLength={500} defaultValue={item.description} className={`${inputClass} min-h-16`} /></Field><div className="grid grid-cols-2 gap-2"><Field label={`Value (${item.currency})`}><input name="amount" required type="number" min="100" step="0.01" readOnly={locked} defaultValue={item.targetAmount / 100} className={inputClass} /></Field><Field label="Quantity"><input name="quantity" required type="number" min="1" max="20" readOnly={locked} defaultValue={item.quantity} className={inputClass} /></Field></div><Field label="Funding model"><select name="fundingMode" disabled={locked} defaultValue={item.fundingMode} className={inputClass}><option value="full">One person funds it</option><option value="group">Several people contribute</option></select></Field><Field label="Priority"><select name="priority" defaultValue={item.priority} className={inputClass}><option value="most_wanted">Most wanted</option><option value="would_love">Would love</option><option value="nice_to_have">Nice to have</option></select></Field><Field label="Retailer reference link — private"><input name="retailerReferenceUrl" type="url" defaultValue={item.retailerReferenceUrl} className={inputClass} /></Field><Field label="Private organizer note"><textarea name="privateNotes" maxLength={500} defaultValue={item.privateNotes} className={`${inputClass} min-h-16`} /></Field><Field label="Replace photo (optional)"><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" className="block w-full text-xs" /></Field>{locked && <p className="text-xs text-muted">Value, quantity and funding mode are locked because this item has received money.</p>}{error && <p className="text-xs text-pink">{error}</p>}<button disabled={busy} className="min-h-10 w-full rounded-full bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button></form></details>;
}

function AddRegistryItem({ slug, currency, onClose, onCreated }: { slug: string; currency: CurrencyCode; onClose: () => void; onCreated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const item = await payload<{ id: string }>(await fetch(`/api/events/${slug}/registry/items`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", ...(await tokenHeaders()) }, body: JSON.stringify({ name: form.get("name"), description: form.get("description"), retailerReferenceUrl: form.get("retailerReferenceUrl"), privateNotes: form.get("privateNotes"), targetAmount: toMinor(Number(form.get("amount"))), fundingMode: form.get("fundingMode"), quantity: Number(form.get("quantity")), priority: form.get("priority") }) }));
      const file = form.get("image");
      if (file instanceof File && file.size > 0) {
        const image = new FormData(); image.set("file", file);
        await payload(await fetch(`/api/events/${slug}/registry/items/${item.id}/image`, { method: "POST", credentials: "same-origin", headers: await tokenHeaders(), body: image }));
      }
      onCreated();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Could not add this gift."); } finally { setBusy(false); }
  };
  return <Modal title="Add a registry gift" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Gift name"><input name="name" required maxLength={100} className={inputClass} placeholder="Air fryer" /></Field><Field label="Description"><textarea name="description" maxLength={500} className={`${inputClass} min-h-20`} placeholder="A compact air fryer for our new kitchen" /></Field><Field label="Gift photo"><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" className="block w-full text-sm" /></Field><div className="grid grid-cols-2 gap-3"><Field label={`Value (${currency})`}><input name="amount" required type="number" min="100" step="0.01" className={inputClass} /></Field><Field label="Quantity"><input name="quantity" type="number" min="1" max="20" defaultValue="1" className={inputClass} /></Field></div><Field label="Funding model"><select name="fundingMode" className={inputClass}><option value="full">One person funds it</option><option value="group">Several people contribute</option></select></Field><Field label="Priority"><select name="priority" className={inputClass}><option value="most_wanted">Most wanted</option><option value="would_love">Would love</option><option value="nice_to_have">Nice to have</option></select></Field><Field label="Retailer reference link — private"><input name="retailerReferenceUrl" type="url" inputMode="url" className={inputClass} placeholder="https://retailer.example/item" /></Field><Field label="Private organizer note"><textarea name="privateNotes" maxLength={500} className={`${inputClass} min-h-16`} /></Field>{error && <p className="text-sm text-pink">{error}</p>}<button disabled={busy} className="min-h-12 w-full rounded-full bg-brand font-semibold text-white disabled:opacity-50">{busy ? "Adding gift…" : "Add to registry"}</button></form></Modal>;
}

function RegistryCheckout({ slug, item, celebrants, onClose }: { slug: string; item: PublicRegistryItem | PrivateRegistryItem; celebrants: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/events/${slug}/registry/items/${item.id}/payments/flutterwave/initialize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: item.fundingMode === "group" ? toMinor(Number(form.get("amount"))) : item.targetAmount, name: form.get("name"), email: form.get("email"), phone: form.get("phone"), message: form.get("message"), anonymous: form.get("anonymous") === "on" }) });
      const checkout = await payload<{ authorizationUrl: string }>(response); window.location.assign(checkout.authorizationUrl);
    } catch (checkoutError) { setError(checkoutError instanceof Error ? checkoutError.message : "Could not start checkout."); setBusy(false); }
  };
  return <Modal title={`Gift ${item.name}`} onClose={onClose}><p className="mb-4 rounded-2xl bg-brand-soft p-4 text-sm text-ink/75">You’re funding <strong>{item.name}</strong> for {celebrants}. GiftCash sends the value to the organizer and does not deliver the physical item.</p><form onSubmit={submit} className="space-y-4">{item.fundingMode === "group" ? <Field label={`Your contribution (${item.currency})`}><input name="amount" required type="number" min="100" step="0.01" className={inputClass} /></Field> : <p className="font-display text-2xl font-semibold">{item.targetAmount !== undefined && formatMoney(item.targetAmount, item.currency)}</p>}<Field label="Your name"><input name="name" required className={inputClass} /></Field><Field label="Email for receipt"><input name="email" required type="email" className={inputClass} /></Field><Field label="Phone (optional)"><input name="phone" type="tel" className={inputClass} /></Field><Field label="Gift message"><textarea name="message" maxLength={500} className={`${inputClass} min-h-20`} /></Field><label className="flex items-center gap-2 text-sm"><input name="anonymous" type="checkbox" /> Show me as Anonymous publicly</label>{error && <p className="text-sm text-pink">{error}</p>}<button disabled={busy} className="min-h-12 w-full rounded-full bg-brand font-semibold text-white disabled:opacity-50">{busy ? "Starting secure checkout…" : item.fundingMode === "full" ? "Pay securely and fund this gift" : "Pay secure contribution"}</button></form></Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 grid items-end bg-ink/55 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true"><div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-lg sm:rounded-3xl sm:p-6"><div className="mb-5 flex items-center justify-between"><h3 className="font-display text-xl font-semibold">{title}</h3><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-cream" aria-label="Close"><X className="h-5 w-5" /></button></div>{children}</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}<span className="mt-1 block">{children}</span></label>; }
