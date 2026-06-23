"use client";

import { useRouter } from "next/navigation";
import { LogOut, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { limitForKyc } from "@/lib/compliance/limits";
import { FirebaseStatus } from "@/components/settings/firebase-status";
import { useAuth } from "@/lib/auth/auth-context";
import { repo } from "@/lib/data/repo";
import { useRepoData } from "@/lib/data/use-repo";
import { formatMoney } from "@/lib/money";

export default function SettingsPage() {
  const { user, mode, signOutUser } = useAuth();
  const { data: profile } = useRepoData(() => repo.getProfile(), [user?.uid]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const limit = limitForKyc(profile?.kycStatus ?? "none");

  const signOut = async () => {
    await signOutUser();
    router.push("/");
  };

  const requestVerification = async () => {
    setBusy(true);
    setError("");
    try {
      await repo.requestKycReview();
      window.dispatchEvent(new Event("giftcash:change"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not request verification.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell>
      <h1 className="font-display text-3xl font-semibold">Settings</h1>

      <div className="mt-6">
        <FirebaseStatus />
      </div>

      {!user ? (
        <div className="mt-6 rounded-3xl border border-dashed border-ink/15 bg-white/50 p-8 text-center">
          <p className="font-medium">You&apos;re not signed in</p>
          <p className="text-sm text-muted">Sign in to manage your profile and gifts.</p>
          <ButtonLink href="/login" className="mt-4">Sign in</ButtonLink>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="rounded-3xl border border-ink/5 bg-white/70 p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-lg font-semibold text-white">
                {(user.displayName ?? user.email ?? "U").slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="font-display text-xl font-semibold">{user.displayName ?? "—"}</p>
                <p className="text-sm text-muted">{user.email ?? user.phoneNumber ?? "—"}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <Info label="Country" value={profile?.country ?? "Nigeria"} />
              <Info label="Currency" value={profile?.currency ?? "NGN"} />
              <Info label="KYC status" value={profile?.kycStatus ?? "none"} />
              <Info label="Auth mode" value={mode === "firebase" ? "Firebase" : "Demo"} />
            </dl>
          </div>

          <div className="rounded-3xl border border-ink/5 bg-white/70 p-6">
            <p className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-emerald" /> Verification (KYC)</p>
            <p className="mt-1 text-sm text-muted">Verification controls your payout limits and helps protect GiftCash users from fraud.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Limit label="Per withdrawal" value={formatMoney(limit.perWithdrawal)} />
              <Limit label="Daily limit" value={formatMoney(limit.daily)} />
            </div>
            <p className="mt-3 text-xs text-muted">{limit.note}</p>
            {error && <p className="mt-3 text-sm text-pink">{error}</p>}
            {profile?.kycStatus === "verified" ? (
              <p className="mt-3 rounded-2xl bg-emerald/10 px-4 py-3 text-sm text-emerald">Your account is verified for higher payout limits.</p>
            ) : (
              <Button variant="outline" size="sm" className="mt-3 w-full sm:w-auto" onClick={requestVerification} disabled={busy || profile?.kycStatus === "pending"}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {profile?.kycStatus === "pending" ? "Verification pending" : "Request verification"}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
            {mode === "demo" && (
              <Button variant="ghost" onClick={() => repo.reset()}><RotateCcw className="h-4 w-4" /> Reset demo data</Button>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-cream px-3 py-2"><p className="text-xs text-muted">{label}</p><p className="font-semibold">{value}</p></div>;
}
