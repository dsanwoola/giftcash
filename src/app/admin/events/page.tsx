"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { repo } from "@/lib/data/repo";
import { formatMoney } from "@/lib/money";
import type { GiftEvent } from "@/lib/types";

type EventStatus = "ongoing" | "scheduled";

function eventWindow(event: GiftEvent) {
  const start = new Date(event.startsAt ?? event.date);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function statusOf(event: GiftEvent, now: number): EventStatus | "past" {
  const { start, end } = eventWindow(event);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "past";
  if (start.getTime() > now) return "scheduled";
  if (end.getTime() >= now) return "ongoing";
  return "past";
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<GiftEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEvents(await repo.listEvents());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sections = useMemo(() => {
    const now = Date.now();
    return {
      ongoing: events.filter((event) => statusOf(event, now) === "ongoing"),
      scheduled: events.filter((event) => statusOf(event, now) === "scheduled"),
    };
  }, [events]);

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Gift Party events</h1>
          <p className="mt-1 text-sm text-cream/60">All ongoing and scheduled events across every organizer.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-cream/80 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald/30 bg-emerald/10 p-4"><p className="font-display text-3xl font-semibold text-emerald">{sections.ongoing.length}</p><p className="text-xs text-cream/60">Ongoing now</p></div>
        <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4"><p className="font-display text-3xl font-semibold text-gold">{sections.scheduled.length}</p><p className="text-xs text-cream/60">Scheduled</p></div>
      </div>

      {error && <p className="mt-5 rounded-2xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink">{error}</p>}
      {loading && <div className="grid min-h-56 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div>}
      {!loading && !error && (
        <div className="mt-7 space-y-8">
          <EventSection title="Ongoing events" status="ongoing" events={sections.ongoing} />
          <EventSection title="Scheduled events" status="scheduled" events={sections.scheduled} />
        </div>
      )}
    </AdminShell>
  );
}

function EventSection({ title, status, events }: { title: string; status: EventStatus; events: GiftEvent[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-semibold">{title}</h2><span className="text-xs text-cream/50">{events.length} event{events.length === 1 ? "" : "s"}</span></div>
      <div className="space-y-3">
        {events.map((event) => {
          const { start, end } = eventWindow(event);
          const contributions = event.contributions ?? [];
          const total = contributions.reduce((sum, contribution) => sum + contribution.amount, 0);
          return (
            <Link key={event.slug} href={`/party/${event.slug}`} className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${status === "ongoing" ? "bg-emerald/20 text-emerald" : "bg-gold/20 text-gold"}`}>{status}</span>{event.isPublic === false && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-cream/60">Private</span>}</div>
                  <p className="mt-2 truncate font-medium">{event.title}</p>
                  <p className="mt-1 text-xs text-cream/50">Organizer: {event.organizerName || event.organizerId}</p>
                </div>
                <div className="text-right"><p className="font-semibold">{formatMoney(total, event.currency)}</p><p className="text-xs text-cream/50">{contributions.length} contribution{contributions.length === 1 ? "" : "s"}</p></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-cream/60"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {start.toLocaleString()}</span><span>Ends {end.toLocaleString()}</span></div>
            </Link>
          );
        })}
        {events.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-cream/50">No {status} events.</p>}
      </div>
    </section>
  );
}
