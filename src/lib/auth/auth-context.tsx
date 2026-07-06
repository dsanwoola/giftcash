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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Cloudflare build is intentionally demo-auth only until Firebase client auth is
  // replaced with Worker/D1-backed auth endpoints. This avoids Firestore/protobuf
  // dynamic-code-generation in the Worker server bundle.
  const mode: Mode = "demo";
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const demoPhoneRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      setUser(raw ? (JSON.parse(raw) as AuthUser) : null);
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const setDemoUser = useCallback((u: AuthUser | null) => {
    if (u) localStorage.setItem(DEMO_KEY, JSON.stringify(u));
    else localStorage.removeItem(DEMO_KEY);
    setUser(u);
  }, []);

  const demoUser = (over: Partial<AuthUser>): AuthUser => ({
    uid: DEMO_USER_ID,
    email: null,
    displayName: "Demo Sender",
    photoURL: null,
    phoneNumber: null,
    ...over,
  });

  const signInWithEmail = useCallback(async (email: string) => {
    setDemoUser(demoUser({ email, displayName: email.split("@")[0] }));
  }, [setDemoUser]);

  const signUpWithEmail = useCallback(async (name: string, email: string) => {
    setDemoUser(demoUser({ email, displayName: name || email.split("@")[0] }));
  }, [setDemoUser]);

  const signInWithGoogle = useCallback(async () => {
    setDemoUser(demoUser({ email: "demo@gmail.com", displayName: "Demo Sender", photoURL: null }));
  }, [setDemoUser]);

  const startPhoneSignIn = useCallback(async (phoneNumber: string) => {
    demoPhoneRef.current = phoneNumber;
  }, []);

  const confirmPhoneCode = useCallback(async (code: string) => {
    if (code.replace(/\D/g, "").length < 4) throw new Error("Enter the 4-digit code.");
    setDemoUser(demoUser({ phoneNumber: demoPhoneRef.current, displayName: "Demo Sender" }));
  }, [setDemoUser]);

  const signOutUser = useCallback(async () => setDemoUser(null), [setDemoUser]);

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
