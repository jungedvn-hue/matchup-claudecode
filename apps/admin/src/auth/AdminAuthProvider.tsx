import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getCurrentAdminRow, type AdminUserRow } from "@/lib/admin-api";

interface AdminAuthState {
  session: Session | null;
  user: User | null;
  adminRow: AdminUserRow | null;
  loading: boolean;
  mfaSatisfied: boolean;
  initError: string | null;
  refreshAdmin: () => Promise<void>;
  setMfaSatisfied: (v: boolean) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AdminAuthState | null>(null);

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [adminRow, setAdminRow] = useState<AdminUserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaSatisfied, setMfaSatisfied] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const refreshAdmin = async () => {
    try {
      const row = await withTimeout(getCurrentAdminRow(), 4000, "getCurrentAdminRow");
      setAdminRow(row);
    } catch (e: any) {
      console.error("[admin] refreshAdmin failed:", e);
      setAdminRow(null);
    }
  };

  const checkMfa = async () => {
    try {
      const { data } = await withTimeout(
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        3000,
        "getAuthenticatorAssuranceLevel"
      );
      setMfaSatisfied(data?.currentLevel === "aal2");
    } catch (e: any) {
      console.error("[admin] AAL check failed:", e);
      setMfaSatisfied(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    // Hard safety net: never stay loading > 8s
    const killSwitch = setTimeout(() => {
      if (!mounted) return;
      console.warn("[admin] auth init kill switch fired");
      setLoading(false);
      setInitError("Auth init took too long; check console.");
    }, 8000);

    (async () => {
      try {
        console.log("[admin] auth init: getSession…");
        const { data, error } = await withTimeout(supabase.auth.getSession(), 4000, "getSession");
        if (error) console.error("[admin] getSession error:", error);
        if (!mounted) return;
        const sess = data?.session ?? null;
        console.log("[admin] auth init: session?", !!sess);
        setSession(sess);
        if (sess) {
          await refreshAdmin();
          await checkMfa();
        }
        console.log("[admin] auth init done");
      } catch (e: any) {
        console.error("[admin] auth init failed:", e);
        setInitError(e?.message ?? String(e));
      } finally {
        if (mounted) {
          clearTimeout(killSwitch);
          setLoading(false);
        }
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      if (sess) {
        await refreshAdmin();
        await checkMfa();
      } else {
        setAdminRow(null);
        setMfaSatisfied(false);
      }
    });
    return () => {
      mounted = false;
      clearTimeout(killSwitch);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAdminRow(null);
    setMfaSatisfied(false);
  };

  return (
    <Ctx.Provider value={{
      session, user: session?.user ?? null, adminRow, loading,
      mfaSatisfied, initError, refreshAdmin, setMfaSatisfied, signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
