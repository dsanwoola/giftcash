"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";

const inputCls = "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-brand";

function LoginInner() {
  const { signInWithEmail, signInWithGoogle, startPhoneSignIn, confirmPhoneCode } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [tab, setTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const go = () => router.push(next);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await fn(); go(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  };
  const sendCode = async () => {
    setBusy(true); setError("");
    try { await startPhoneSignIn(phone); setCodeSent(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't send the code."); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to send and manage your gifts."
      footer={<>New to Gift Cash? <Link href="/register" className="font-medium text-brand">Create an account</Link></>}
    >
      <div className="mb-4 flex rounded-full bg-ink/5 p-1 text-sm">
        {(["email", "phone"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setError(""); }} className={`flex-1 rounded-full py-1.5 capitalize transition ${tab === t ? "bg-white shadow-soft" : "text-muted"}`}>{t}</button>
        ))}
      </div>

      {tab === "email" ? (
        <div className="space-y-3">
          <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inputCls} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button size="lg" className="w-full" disabled={busy} onClick={() => run(() => signInWithEmail(email, password))}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {!codeSent ? (
            <>
              <input className={inputCls} type="tel" placeholder="+234 803 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Button size="lg" className="w-full" disabled={busy} onClick={sendCode}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send code"}
              </Button>
            </>
          ) : (
            <>
              <input className={`${inputCls} text-center text-2xl tracking-[0.4em]`} inputMode="numeric" placeholder="1234" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button size="lg" className="w-full" disabled={busy} onClick={() => run(() => confirmPhoneCode(code))}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & sign in"}
              </Button>
            </>
          )}
        </div>
      )}

      <div className="my-4 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-ink/10" /> or <span className="h-px flex-1 bg-ink/10" />
      </div>
      <Button variant="outline" size="lg" className="w-full" disabled={busy} onClick={() => run(signInWithGoogle)}>
        <GoogleMark /> Continue with Google
      </Button>

      {error && <p className="mt-3 text-center text-sm text-pink">{error}</p>}
      <div id="recaptcha-container" />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6c1.9-5.6 7.1-9.8 13.7-9.8z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-3.9 6.7-9.7 6.7-17.4z" />
      <path fill="#FBBC05" d="M10.3 28.7c-.5-1.4-.7-2.9-.7-4.7s.3-3.3.7-4.7l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.8-6z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.3-5.7c-2 1.4-4.6 2.2-7.9 2.2-6.6 0-11.8-4.2-13.7-9.8l-7.8 6C6.4 42.6 14.6 48 24 48z" />
    </svg>
  );
}
