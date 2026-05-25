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
  refreshAdmin: () => Promise<void>;
  setMfaSatisfied: (v: boolean) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [adminRow, setAdminRow] = useState<AdminUserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaSatisfied, setMfaSatisfied] = useState(false);

  const refreshAdmin = async () => {
    try {
      const row = await getCurrentAdminRow();
      setAdminRow(row);
    } catch (e) {
      console.error("[admin] refreshAdmin failed:", e);
      setAdminRow(null);
    }
  };

  const checkMfa = async () => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setMfaSatisfied(data?.currentLevel === "aal2");
    } catch (e) {
      console.error("[admin] AAL check failed:", e);
      setMfaSatisfied(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("[admin] getSession error:", error);
        if (!mounted) return;
        const sess = data?.session ?? null;
        setSession(sess);
        if (sess) {
          await refreshAdmin();
          await checkMfa();
        }
      } catch (e) {
        console.error("[admin] auth init failed:", e);
      } finally {
        if (mounted) setLoading(false);
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
    return () => { mounted = false; sub.subscription.unsubscribe(); };
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
      mfaSatisfied, refreshAdmin, setMfaSatisfied, signOut,
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
