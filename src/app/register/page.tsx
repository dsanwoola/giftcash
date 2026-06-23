"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { useAuth, friendlyAuthError } from "@/lib/auth/auth-context";

const inputCls = "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-brand";

export default function RegisterPage() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await fn(); router.push("/dashboard"); }
    catch (e) { setError(friendlyAuthError(e)); }
    finally { setBusy(false); }
  };

  const submit = () => {
    if (!name.trim()) return setError("Tell us your name.");
    if (password.length < 6) return setError("Password should be at least 6 characters.");
    run(() => signUpWithEmail(name.trim(), email.trim(), password));
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start sending moments, not just money."
      footer={<>Already have an account? <Link href="/login" className="font-medium text-brand">Sign in</Link></>}
    >
      <div className="space-y-3">
        <input className={inputCls} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inputCls} type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button size="lg" className="w-full" disabled={busy} onClick={submit}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create account"}
        </Button>
      </div>

      <div className="my-4 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-ink/10" /> or <span className="h-px flex-1 bg-ink/10" />
      </div>
      <Button variant="outline" size="lg" className="w-full" disabled={busy} onClick={() => run(signInWithGoogle)}>
        Continue with Google
      </Button>

      {error && <p className="mt-3 text-center text-sm text-pink">{error}</p>}
      <p className="mt-4 text-center text-[11px] text-muted">
        By continuing you agree to our Terms &amp; Privacy Policy.
      </p>
    </AuthShell>
  );
}
