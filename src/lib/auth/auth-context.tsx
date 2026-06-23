"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  type AuthError,
  type ConfirmationResult,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getDb, isFirebaseConfigured } from "../firebase/client";
import { DEMO_USER_ID } from "../data/seed";
import type { UserProfile } from "../types";

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
const DEMO_KEY = "giftcash:auth";

const mapUser = (u: FirebaseUser): AuthUser => ({
  uid: u.uid,
  email: u.email,
  displayName: u.displayName,
  photoURL: u.photoURL,
  phoneNumber: u.phoneNumber,
});

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export function friendlyAuthError(error: unknown): string {
  const code = (error as AuthError | undefined)?.code;
  if (code === "auth/unauthorized-domain") {
    return "Google sign-in is not allowed on this domain yet. Please try again after the domain is added in Firebase Auth.";
  }
  if (code === "auth/popup-blocked") {
    return "Your browser blocked the Google sign-in popup. Allow popups for Gift Cash and try again.";
  }
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Google sign-in was cancelled before it finished.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled yet for this Firebase project.";
  }
  if (code === "auth/account-exists-with-different-credential") {
    return "An account already exists with this email. Sign in with the original method, then connect Google from your account.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Create the user's profile document on first sign-in (never downgrades role). */
async function ensureProfile(u: AuthUser) {
  const ref = doc(getDb(), "profiles", u.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return;
  const profile: UserProfile = {
    id: u.uid,
    fullName: u.displayName ?? u.email?.split("@")[0] ?? "New user",
    email: u.email ?? undefined,
    phone: u.phoneNumber ?? undefined,
    photoURL: u.photoURL ?? undefined,
    country: "NG",
    currency: "NGN",
    kycStatus: "none",
    role: "user",
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, profile);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const mode: Mode = isFirebaseConfigured ? "firebase" : "demo";
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const confirmRef = useRef<ConfirmationResult | null>(null);
  const demoPhoneRef = useRef<string | null>(null);

  // ----- session restore -----
  useEffect(() => {
    if (mode === "firebase") {
      const timeout = window.setTimeout(() => setLoading(false), 8000);
      const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (u) => {
        window.clearTimeout(timeout);
        setUser(u ? mapUser(u) : null);
        setLoading(false);
      });
      return () => {
        window.clearTimeout(timeout);
        unsubscribe();
      };
    }
    // demo
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      setUser(raw ? (JSON.parse(raw) as AuthUser) : null);
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, [mode]);

  const setDemoUser = useCallback((u: AuthUser | null) => {
    if (u) localStorage.setItem(DEMO_KEY, JSON.stringify(u));
    else localStorage.removeItem(DEMO_KEY);
    setUser(u);
  }, []);

  // In demo mode the seed data belongs to DEMO_USER_ID, so we adopt that uid to
  // keep dashboards/wallet consistent with the sample journey.
  const demoUser = (over: Partial<AuthUser>): AuthUser => ({
    uid: DEMO_USER_ID,
    email: null,
    displayName: "Demo Sender",
    photoURL: null,
    phoneNumber: null,
    ...over,
  });

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (mode === "firebase") {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      await ensureProfile(mapUser(cred.user));
      return;
    }
    setDemoUser(demoUser({ email, displayName: email.split("@")[0] }));
  }, [mode, setDemoUser]);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    if (mode === "firebase") {
      const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      await ensureProfile({ ...mapUser(cred.user), displayName: name || cred.user.displayName });
      return;
    }
    setDemoUser(demoUser({ email, displayName: name || email.split("@")[0] }));
  }, [mode, setDemoUser]);

  const signInWithGoogle = useCallback(async () => {
    if (mode === "firebase") {
      const cred = await signInWithPopup(getFirebaseAuth(), googleProvider);
      await ensureProfile(mapUser(cred.user));
      return;
    }
    setDemoUser(demoUser({ email: "demo@gmail.com", displayName: "Demo Sender", photoURL: null }));
  }, [mode, setDemoUser]);

  const startPhoneSignIn = useCallback(async (phoneNumber: string) => {
    if (mode === "firebase") {
      const auth = getFirebaseAuth();
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      confirmRef.current = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      return;
    }
    demoPhoneRef.current = phoneNumber; // demo: any code works
  }, [mode]);

  const confirmPhoneCode = useCallback(async (code: string) => {
    if (mode === "firebase") {
      if (!confirmRef.current) throw new Error("Request a code first.");
      const cred = await confirmRef.current.confirm(code);
      await ensureProfile(mapUser(cred.user));
      return;
    }
    if (code.replace(/\D/g, "").length < 4) throw new Error("Enter the 4-digit code.");
    setDemoUser(demoUser({ phoneNumber: demoPhoneRef.current, displayName: "Demo Sender" }));
  }, [mode, setDemoUser]);

  const signOutUser = useCallback(async () => {
    if (mode === "firebase") {
      await signOut(getFirebaseAuth());
      return;
    }
    setDemoUser(null);
  }, [mode, setDemoUser]);

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
