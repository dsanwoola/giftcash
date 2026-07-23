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
  ConfirmationResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
}

type Mode = "firebase";

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

export function friendlyAuthError(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong.";
  const message = error.message;
  if (message.includes("auth/email-already-in-use")) return "An account already exists for this email. Please sign in.";
  if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) return "Invalid email or password.";
  if (message.includes("auth/user-not-found")) return "No account was found for this email.";
  if (message.includes("auth/weak-password")) return "Password should be at least 6 characters.";
  if (message.includes("auth/popup-closed-by-user")) return "Google sign-in was cancelled.";
  if (message.includes("auth/unauthorized-domain")) return "This domain is not authorized in Firebase Auth settings.";
  if (message.includes("auth/operation-not-allowed")) return "This sign-in method is not enabled in Firebase Auth.";
  if (message.includes("auth/too-many-requests")) return "Too many attempts. Please wait and try again.";
  return message;
}

function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber,
  };
}

async function establishServerSession(user: User) {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error ?? "Could not start server session.");
}

function requireConfiguredAuth() {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured for real testing yet.");
  }
  return getFirebaseAuth();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const mode: Mode = "firebase";
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setUser(null);
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(mapFirebaseUser(firebaseUser));
          await establishServerSession(firebaseUser).catch(() => undefined);
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const auth = requireConfiguredAuth();
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    await establishServerSession(credential.user);
    setUser(mapFirebaseUser(credential.user));
  }, []);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    const auth = requireConfiguredAuth();
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
    await credential.user.reload();
    const currentUser = auth.currentUser ?? credential.user;
    await establishServerSession(currentUser);
    setUser(mapFirebaseUser(currentUser));
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const auth = requireConfiguredAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(auth, provider);
    await establishServerSession(credential.user);
    setUser(mapFirebaseUser(credential.user));
  }, []);

  const startPhoneSignIn = useCallback(async (phoneNumber: string) => {
    const auth = requireConfiguredAuth();
    const container = document.getElementById("recaptcha-container");
    if (!container) throw new Error("Phone verification is not ready. Refresh and try again.");
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, container, { size: "invisible" });
    }
    confirmationRef.current = await signInWithPhoneNumber(auth, phoneNumber, recaptchaRef.current);
  }, []);

  const confirmPhoneCode = useCallback(async (code: string) => {
    if (!confirmationRef.current) throw new Error("Send a phone verification code first.");
    const credential = await confirmationRef.current.confirm(code.trim());
    await establishServerSession(credential.user);
    setUser(mapFirebaseUser(credential.user));
  }, []);

  const signOutUser = useCallback(async () => {
    await fetch("/api/auth/me", { method: "DELETE" }).catch(() => undefined);
    if (isFirebaseConfigured) await signOut(getFirebaseAuth()).catch(() => undefined);
    setUser(null);
  }, []);

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
