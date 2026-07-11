"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DEMO_USER_ID } from "../data/seed";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
}

type Mode = "demo" | "firebase";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  mode: Mode;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  startPhoneSignIn: (phoneNumber: string) => Promise<void>;
  confirmPhoneCode: (code: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_KEY = "occasion:auth";

export function friendlyAuthError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function mapProfile(profile: { id: string; email?: string; phone?: string; fullName?: string; photoURL?: string }): AuthUser {
  return {
    uid: profile.id,
    email: profile.email ?? null,
    displayName: profile.fullName ?? null,
    photoURL: profile.photoURL ?? null,
    phoneNumber: profile.phone ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Firebase-first session API with localStorage fallback for offline/demo resilience.
  const mode: Mode = "demo";
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const demoPhoneRef = useRef<string | null>(null);

  const setDemoUser = useCallback((u: AuthUser | null) => {
    if (u) localStorage.setItem(DEMO_KEY, JSON.stringify(u));
    else localStorage.removeItem(DEMO_KEY);
    setUser(u);
  }, []);

  useEffect(() => {
    let alive = true;
    const restore = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const payload = await res.json();
          if (payload.user && alive) {
            const mapped = mapProfile(payload.user);
            setDemoUser(mapped);
            setLoading(false);
            return;
          }
        }
      } catch {
        // fall through to local demo session
      }
      try {
        const raw = localStorage.getItem(DEMO_KEY);
        if (alive) setUser(raw ? (JSON.parse(raw) as AuthUser) : null);
      } catch {
        if (alive) setUser(null);
      }
      if (alive) setLoading(false);
    };
    restore();
    return () => { alive = false; };
  }, [setDemoUser]);

  const localUser = (over: Partial<AuthUser>): AuthUser => ({
    uid: DEMO_USER_ID,
    email: null,
    displayName: "Demo Sender",
    photoURL: null,
    phoneNumber: null,
    ...over,
  });

  const startSession = useCallback(async (body: { name?: string; email?: string; phone?: string }) => {
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Could not start session.");
      const mapped = mapProfile(payload.user);
      setDemoUser(mapped);
      return;
    } catch {
      if (body.email) setDemoUser(localUser({ email: body.email, displayName: body.name || body.email.split("@")[0] }));
      else setDemoUser(localUser({ phoneNumber: body.phone ?? null, displayName: body.name || "Demo Sender" }));
    }
  }, [setDemoUser]);

  const signInWithEmail = useCallback(async (email: string) => {
    await startSession({ email: email.trim().toLowerCase() });
  }, [startSession]);

  const signUpWithEmail = useCallback(async (name: string, email: string) => {
    await startSession({ name, email: email.trim().toLowerCase() });
  }, [startSession]);

  const signInWithGoogle = useCallback(async () => {
    await startSession({ name: "Demo Sender", email: "demo@gmail.com" });
  }, [startSession]);

  const startPhoneSignIn = useCallback(async (phoneNumber: string) => {
    demoPhoneRef.current = phoneNumber;
  }, []);

  const confirmPhoneCode = useCallback(async (code: string) => {
    if (code.replace(/\D/g, "").length < 4) throw new Error("Enter the 4-digit code.");
    await startSession({ phone: demoPhoneRef.current ?? undefined, name: "Demo Sender" });
  }, [startSession]);

  const signOutUser = useCallback(async () => {
    await fetch("/api/auth/me", { method: "DELETE" }).catch(() => undefined);
    setDemoUser(null);
  }, [setDemoUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        mode,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        startPhoneSignIn,
        confirmPhoneCode,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
