"use client";

import { useRouter } from "next/navigation";
import { LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { FirebaseStatus } from "@/components/settings/firebase-status";
import { useAuth } from "@/lib/auth/auth-context";
import { repo } from "@/lib/data/repo";

export default function SettingsPage() {
  const { user, mode, signOutUser } = useAuth();
  const router = useRouter();

  const signOut = async () => {
    await signOutUser();
    router.push("/");
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
              <Info label="Country" value="Nigeria" />
              <Info label="Currency" value="NGN (₦)" />
              <Info label="KYC status" value="Not started" />
              <Info label="Auth mode" value={mode === "firebase" ? "Firebase" : "Demo"} />
            </dl>
          </div>

          <div className="rounded-3xl border border-ink/5 bg-white/70 p-6">
            <p className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-emerald" /> Verification (KYC)</p>
            <p className="mt-1 text-sm text-muted">Complete KYC to raise your withdrawal limits. Coming soon.</p>
            <Button variant="outline" size="sm" className="mt-3" disabled>Start verification</Button>
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
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
