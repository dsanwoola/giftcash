"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Images,
  Flag,
  Loader2,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type {
  AlbumPhase,
  EventAlbumConfig,
  EventAlbumPhoto,
  PublicAlbumPayload,
  PublicAlbumPhoto,
} from "@/lib/types";

interface MomentsAlbumProps {
  slug: string;
  celebrants: string;
  eventDate: string;
  isOrganizer: boolean;
  onGift: () => void;
}

interface ManagerPayload {
  config: EventAlbumConfig;
  photos: EventAlbumPhoto[];
}

interface SelectedPhoto {
  file: File;
  preview: string;
}

async function authToken() {
  return getFirebaseAuth().currentUser?.getIdToken();
}

async function authedFetch(path: string, init: RequestInit = {}) {
  const token = await authToken();
  if (!token) throw new Error("Sign in to continue.");
  const response = await fetch(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Something went wrong.");
  return payload;
}

export function MomentsAlbum({ slug, celebrants, eventDate, isOrganizer, onGift }: MomentsAlbumProps) {
  const { user } = useAuth();
  const defaultPhase: AlbumPhase = new Date(eventDate).getTime() <= Date.now() ? "post" : "pre";
  const [album, setAlbum] = useState<PublicAlbumPayload | null>(null);
  const [manager, setManager] = useState<ManagerPayload | null>(null);
  const [phase, setPhase] = useState<AlbumPhase>(defaultPhase);
  const [viewer, setViewer] = useState<PublicAlbumPhoto | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedPhoto[]>([]);
  const [uploadPhase, setUploadPhase] = useState<AlbumPhase>(defaultPhase);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const publicResponse = await fetch(`/api/events/${slug}/album`, { cache: "no-store" });
    if (publicResponse.ok) setAlbum((await publicResponse.json()) as PublicAlbumPayload);
    if (isOrganizer) {
      const payload = await authedFetch(`/api/events/${slug}/album/photos`);
      setManager(payload as ManagerPayload);
    }
  }, [isOrganizer, slug]);

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load the album."));
  }, [load]);

  useEffect(() => () => selected.forEach((item) => URL.revokeObjectURL(item.preview)), [selected]);

  const approved = useMemo(() => album?.photos ?? [], [album?.photos]);
  const phasePhotos = useMemo(() => {
    const photos = approved.filter((photo) => photo.phase === phase);
    return [...photos].sort((a, b) => {
      if (a.id === album?.coverPhotoId) return -1;
      if (b.id === album?.coverPhotoId) return 1;
      return a.sortOrder - b.sortOrder;
    });
  }, [album?.coverPhotoId, approved, phase]);
  const hasPre = approved.some((photo) => photo.phase === "pre");
  const hasPost = approved.some((photo) => photo.phase === "post");

  useEffect(() => {
    if (approved.length && !approved.some((photo) => photo.phase === phase)) {
      setPhase(hasPre ? "pre" : "post");
    }
  }, [approved, hasPre, phase]);

  const chooseFiles = (files: FileList | null) => {
    selected.forEach((item) => URL.revokeObjectURL(item.preview));
    const next = Array.from(files ?? []).slice(0, 10).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setSelected(next);
    setError(files && files.length > 10 ? "You can upload up to 10 photos at once." : "");
  };

  const uploadPhotos = async () => {
    if (!selected.length) return setError("Choose at least one photo.");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let pending = false;
      for (let index = 0; index < selected.length; index += 1) {
        setProgress(`Uploading ${index + 1} of ${selected.length}…`);
        const form = new FormData();
        form.append("file", selected[index].file);
        form.append("phase", uploadPhase);
        form.append("caption", caption);
        const result = await authedFetch(`/api/events/${slug}/album/photos`, { method: "POST", body: form });
        pending ||= Boolean(result.pendingApproval);
      }
      selected.forEach((item) => URL.revokeObjectURL(item.preview));
      setSelected([]);
      setCaption("");
      setUploadOpen(false);
      setNotice(pending ? "Photos sent to the organizer for approval." : "Your Moments Album has been updated.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload the photos.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const updateConfig = async (updates: { enabled?: boolean; guestUploadsEnabled?: boolean }) => {
    setBusy(true);
    setError("");
    try {
      await authedFetch(`/api/events/${slug}/album`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update album settings.");
    } finally {
      setBusy(false);
    }
  };

  const updatePhoto = async (photoId: string, updates: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      await authedFetch(`/api/events/${slug}/album/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update the photo.");
    } finally {
      setBusy(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!window.confirm("Remove this photo from the album?")) return;
    setBusy(true);
    setError("");
    try {
      await authedFetch(`/api/events/${slug}/album/photos/${photoId}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove the photo.");
    } finally {
      setBusy(false);
    }
  };

  const reportPhoto = async (photoId: string) => {
    if (!window.confirm("Report this photo for review?")) return;
    setError("");
    try {
      const response = await fetch(`/api/events/${slug}/album/photos/${photoId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "inappropriate" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not report this photo.");
      setNotice("Thank you. This photo has been reported for review.");
      setViewer(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not report this photo.");
    }
  };

  const showPublicAlbum = Boolean(album?.enabled && approved.length);
  const canContribute = Boolean(album?.guestUploadsEnabled && user && !isOrganizer);
  if (!isOrganizer && !showPublicAlbum && !canContribute) return null;

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-ink/5 bg-white shadow-soft" aria-labelledby="moments-heading">
      <div className="bg-gradient-to-br from-brand-soft/60 via-white to-gold-soft/50 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand"><Heart className="h-4 w-4 fill-current" /> Moments that matter</p>
            <h2 id="moments-heading" className="mt-2 font-display text-2xl font-semibold">{phase === "pre" ? "Their journey" : "The celebration"}</h2>
            <p className="mt-1 text-sm text-muted">Photos that bring you closer to {celebrants}.</p>
          </div>
          {isOrganizer && (
            <button onClick={() => setManageOpen((open) => !open)} className="rounded-full border border-brand/20 bg-white px-3 py-2 text-xs font-medium text-brand hover:border-brand/50">
              {manageOpen ? "Close" : "Manage album"}
            </button>
          )}
        </div>

        {(hasPre || hasPost) && (
          <div className="mt-5 grid grid-cols-2 rounded-full bg-ink/5 p-1" role="tablist" aria-label="Album stage">
            <button role="tab" aria-selected={phase === "pre"} onClick={() => setPhase("pre")} disabled={!hasPre} className={`rounded-full px-3 py-2 text-sm transition ${phase === "pre" ? "bg-white font-medium text-brand shadow-soft" : "text-muted"} disabled:opacity-35`}>Before the event</button>
            <button role="tab" aria-selected={phase === "post"} onClick={() => setPhase("post")} disabled={!hasPost} className={`rounded-full px-3 py-2 text-sm transition ${phase === "post" ? "bg-white font-medium text-brand shadow-soft" : "text-muted"} disabled:opacity-35`}>After the event</button>
          </div>
        )}
      </div>

      {showPublicAlbum && phasePhotos.length > 0 && (
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {phasePhotos.map((photo, index) => (
              <button key={photo.id} onClick={() => setViewer(photo)} className={`group relative overflow-hidden rounded-2xl bg-ink/5 text-left ${index === 0 ? "col-span-2 aspect-[16/10] sm:col-span-2" : "aspect-square"}`} aria-label={`View photo${photo.caption ? `: ${photo.caption}` : ""}`}>
                <Image src={photo.thumbnailUrl || photo.imageUrl} alt={photo.caption || `${celebrants} event memory`} fill unoptimized sizes={index === 0 ? "(max-width: 640px) 100vw, 420px" : "210px"} className="object-cover transition duration-500 group-hover:scale-105" />
                {photo.id === album?.coverPhotoId && <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-brand"><Star className="mr-1 inline h-3 w-3 fill-current" /> Cover</span>}
                {photo.caption && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8 text-xs text-white">{photo.caption}</span>}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-brand-soft/55 p-4 text-center">
            <p className="font-display text-lg font-semibold">{phase === "pre" ? "Celebrate their journey" : "Loved the celebration?"}</p>
            <p className="mt-1 text-sm text-muted">{phase === "pre" ? "Make this chapter even more memorable with a cash gift." : "It’s never too late to send your love with GiftCash."}</p>
            <Button onClick={onGift} className="mt-3 w-full sm:w-auto"><Heart className="h-4 w-4" /> Gift {celebrants}</Button>
          </div>
        </div>
      )}

      {!showPublicAlbum && isOrganizer && <div className="px-5 py-6 text-center text-sm text-muted"><Images className="mx-auto mb-2 h-8 w-8 text-brand/55" />Add the first photos to tell the story of this Gift Party.</div>}

      {(isOrganizer || album?.guestUploadsEnabled) && (
        <div className="border-t border-ink/5 p-4 sm:p-5">
          {isOrganizer || user ? (
            <Button variant="outline" onClick={() => setUploadOpen((open) => !open)} className="w-full"><Plus className="h-4 w-4" /> {isOrganizer ? "Add photos" : "Add a memory"}</Button>
          ) : (
            <Link href={`/login?next=/party/${slug}`} className="block rounded-full border border-ink/15 px-5 py-3 text-center text-sm font-medium hover:border-brand/40">Sign in to add a memory</Link>
          )}
        </div>
      )}

      {uploadOpen && (isOrganizer || canContribute) && (
        <div className="border-t border-ink/5 bg-cream/50 p-5">
          <div className="flex items-center justify-between"><h3 className="font-display text-lg font-semibold">Add moments</h3><button onClick={() => setUploadOpen(false)} aria-label="Close uploader"><X className="h-5 w-5" /></button></div>
          <p className="mt-1 text-sm text-muted">Choose up to 10 photos. We resize them and remove hidden location metadata.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => setUploadPhase("pre")} className={`rounded-xl border px-3 py-3 text-sm ${uploadPhase === "pre" ? "border-brand bg-brand-soft text-brand" : "border-ink/10 bg-white"}`}>Before event</button>
            <button onClick={() => setUploadPhase("post")} className={`rounded-xl border px-3 py-3 text-sm ${uploadPhase === "post" ? "border-brand bg-brand-soft text-brand" : "border-ink/10 bg-white"}`}>After event</button>
          </div>
          <label className="mt-4 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand/25 bg-white p-5 text-center hover:border-brand/55">
            <Camera className="h-7 w-7 text-brand" /><span className="mt-2 text-sm font-medium">Choose photos</span><span className="text-xs text-muted">JPEG, PNG, WebP, AVIF or HEIC · 10 MB each</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" multiple className="sr-only" onChange={(event) => chooseFiles(event.target.files)} />
          </label>
          {selected.length > 0 && <div className="mt-3 grid grid-cols-5 gap-2">{selected.map((item) => <div key={`${item.file.name}-${item.file.lastModified}`} className="relative aspect-square overflow-hidden rounded-xl"><Image src={item.preview} alt="Selected upload preview" fill unoptimized className="object-cover" /></div>)}</div>}
          <label className="mt-4 block text-sm font-medium">Caption <span className="font-normal text-muted">(optional)</span><input value={caption} maxLength={160} onChange={(event) => setCaption(event.target.value)} placeholder="A moment worth remembering…" className="mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-4 py-3 font-normal outline-none focus:border-brand" /></label>
          {!isOrganizer && <p className="mt-3 flex gap-2 rounded-xl bg-gold-soft/60 p-3 text-xs text-ink/70"><ShieldCheck className="h-4 w-4 shrink-0" />Your photos will be visible only after the organizer approves them. By uploading, you confirm you have permission to share them.</p>}
          <Button onClick={uploadPhotos} disabled={busy || !selected.length} className="mt-4 w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {progress || `Upload ${selected.length || ""} photo${selected.length === 1 ? "" : "s"}`}</Button>
        </div>
      )}

      {isOrganizer && manageOpen && manager && (
        <div className="border-t border-ink/5 bg-ink/[0.025] p-5">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4 rounded-2xl bg-white p-4">
              <div><p className="font-medium">Show album to gifters</p><p className="mt-1 text-xs text-muted">Turn this off to hide every approved photo without deleting anything.</p></div>
              <button role="switch" aria-label="Show album to gifters" aria-checked={manager.config.enabled} disabled={busy} onClick={() => updateConfig({ enabled: !manager.config.enabled })} className={`relative h-7 w-12 shrink-0 rounded-full transition ${manager.config.enabled ? "bg-brand" : "bg-ink/15"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${manager.config.enabled ? "left-6" : "left-1"}`} /></button>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-2xl bg-white p-4">
              <div><p className="font-medium">Community photo contributions</p><p className="mt-1 text-xs text-muted">Signed-in guests may submit up to five photos for your approval.</p></div>
              <button role="switch" aria-label="Allow community photo contributions" aria-checked={manager.config.guestUploadsEnabled} disabled={busy} onClick={() => updateConfig({ guestUploadsEnabled: !manager.config.guestUploadsEnabled })} className={`relative h-7 w-12 shrink-0 rounded-full transition ${manager.config.guestUploadsEnabled ? "bg-brand" : "bg-ink/15"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${manager.config.guestUploadsEnabled ? "left-6" : "left-1"}`} /></button>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {manager.photos.length === 0 && <p className="py-4 text-center text-sm text-muted">No album photos yet.</p>}
            {manager.photos.map((photo) => (
              <div key={photo.id} className="rounded-2xl border border-ink/5 bg-white p-3">
                <div className="flex gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ink/5"><Image src={photo.thumbnailUrl} alt={photo.caption || "Album photo"} fill unoptimized className="object-cover" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${photo.status === "approved" ? "bg-emerald/10 text-emerald" : "bg-gold-soft text-ink"}`}>{photo.status}</span><button onClick={() => deletePhoto(photo.id)} disabled={busy} aria-label="Delete photo" className="text-red-600"><Trash2 className="h-4 w-4" /></button></div>
                    <p className="mt-1 truncate text-xs text-muted">From {photo.uploaderName}</p>
                    <input defaultValue={photo.caption || ""} maxLength={160} onBlur={(event) => { if (event.target.value !== (photo.caption || "")) updatePhoto(photo.id, { caption: event.target.value }); }} placeholder="Add a caption" className="mt-2 w-full border-b border-ink/10 bg-transparent py-1 text-xs outline-none focus:border-brand" />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {photo.status === "pending" ? <><button onClick={() => updatePhoto(photo.id, { action: "approve" })} disabled={busy} className="rounded-full bg-emerald px-3 py-2 text-xs font-medium text-white"><Check className="mr-1 inline h-3 w-3" /> Approve</button><button onClick={() => updatePhoto(photo.id, { action: "reject" })} disabled={busy} className="rounded-full border border-red-200 px-3 py-2 text-xs text-red-600">Reject</button></> : <button onClick={() => updatePhoto(photo.id, { action: "cover" })} disabled={busy || manager.config.coverPhotoId === photo.id} className="rounded-full border border-ink/10 px-3 py-2 text-xs"><Star className="mr-1 inline h-3 w-3" /> {manager.config.coverPhotoId === photo.id ? "Cover photo" : "Make cover"}</button>}
                  <select value={photo.phase} onChange={(event) => updatePhoto(photo.id, { phase: event.target.value })} disabled={busy} className="rounded-full border border-ink/10 bg-white px-3 py-2 text-xs"><option value="pre">Before event</option><option value="post">After event</option></select>
                  <button onClick={() => updatePhoto(photo.id, { sortOrder: photo.sortOrder - 15 })} disabled={busy} aria-label="Move photo earlier" className="rounded-full border border-ink/10 p-2"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={() => updatePhoto(photo.id, { sortOrder: photo.sortOrder + 15 })} disabled={busy} aria-label="Move photo later" className="rounded-full border border-ink/10 p-2"><ArrowDown className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(notice || error) && <p role="status" className={`mx-4 mb-4 rounded-xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald/10 text-emerald"}`}>{error || notice}</p>}

      {viewer && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setViewer(null)}>
          <button onClick={() => setViewer(null)} className="absolute right-4 top-4 rounded-full bg-white/15 p-3 text-white" aria-label="Close photo"><X className="h-5 w-5" /></button>
          <button onClick={(event) => { event.stopPropagation(); const index = phasePhotos.findIndex((item) => item.id === viewer.id); setViewer(phasePhotos[(index - 1 + phasePhotos.length) % phasePhotos.length]); }} className="absolute left-2 rounded-full bg-white/15 p-3 text-white sm:left-5" aria-label="Previous photo"><ChevronLeft className="h-6 w-6" /></button>
          <div className="relative h-[75vh] w-full max-w-4xl" onClick={(event) => event.stopPropagation()}><Image src={viewer.imageUrl} alt={viewer.caption || `${celebrants} event memory`} fill unoptimized sizes="100vw" className="object-contain" />{viewer.caption && <p className="absolute inset-x-4 bottom-3 rounded-xl bg-black/65 p-3 text-center text-sm text-white">{viewer.caption}</p>}<button onClick={() => reportPhoto(viewer.id)} className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-2 text-xs text-white" aria-label="Report photo"><Flag className="mr-1 inline h-3 w-3" /> Report</button></div>
          <button onClick={(event) => { event.stopPropagation(); const index = phasePhotos.findIndex((item) => item.id === viewer.id); setViewer(phasePhotos[(index + 1) % phasePhotos.length]); }} className="absolute right-2 rounded-full bg-white/15 p-3 text-white sm:right-5" aria-label="Next photo"><ChevronRight className="h-6 w-6" /></button>
        </div>
      )}
    </section>
  );
}
