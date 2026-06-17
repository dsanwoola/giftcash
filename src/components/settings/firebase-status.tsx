"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { isFirebaseConfigured } from "@/lib/firebase/client";

type Health = { adminConfigured: boolean; firestoreOk: boolean; error?: string };
type State = "ok" | "warn" | "off";

function Row({ state, label, detail }: { state: State; label: string; detail: string }) {
  const icon =
    state === "ok" ? <CheckCircle2 className="h-5 w-5 text-emerald" /> :
    state === "warn" ? <XCircle className="h-5 w-5 text-pink" /> :
    <CircleDashed className="h-5 w-5 text-muted" />;
  return (
    <div className="flex items-start gap-3 py-2">
      {icon}
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{detail}</p>
      </div>
    </div>
  );
}

export function FirebaseStatus() {
  const clientReady = isFirebaseConfigured;
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((h: Health) => setHealth(h))
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, []);

  const live = clientReady && health?.adminConfigured && health?.firestoreOk;

  return (
    <div className="rounded-3xl border border-ink/5 bg-white/70 p-6">
      <div className="flex items-center justify-between">
        <p className="font-medium">Connection</p>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted" />
        ) : live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
            <CheckCircle2 className="h-3.5 w-3.5" /> Connected to Firebase
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold text-ink/70">
            Demo mode
          </span>
        )}
      </div>

      <div className="mt-3 divide-y divide-ink/5">
        <Row
          state={clientReady ? "ok" : "off"}
          label="Web config (client)"
          detail={clientReady ? "NEXT_PUBLIC_FIREBASE_* detected — Auth & reads are live." : "Not set — running on local demo data."}
        />
        <Row
          state={loading ? "off" : health?.adminConfigured ? "ok" : "off"}
          label="Admin SDK (server)"
          detail={
            loading ? "Checking…" :
            health?.adminConfigured ? "Service-account configured — ledger writes are live." :
            "Not set — fund/claim/withdraw use the demo store."
          }
        />
        <Row
          state={loading ? "off" : health?.adminConfigured ? (health.firestoreOk ? "ok" : "warn") : "off"}
          label="Firestore reachable"
          detail={
            loading ? "Checking…" :
            !health?.adminConfigured ? "Waiting on Admin SDK." :
            health.firestoreOk ? "A test read succeeded." :
            `Read failed${health.error ? `: ${health.error}` : ""}.`
          }
        />
      </div>

      {!live && !loading && (
        <p className="mt-4 rounded-xl bg-gold-soft px-3 py-2 text-xs text-ink/70">
          Fill in <code>.env.local</code> and restart <code>npm run dev</code> to go live.
        </p>
      )}
    </div>
  );
}
