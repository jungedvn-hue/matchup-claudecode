import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import type { AppRole } from '@/hooks/use-roles';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  roles: AppRole[];
  rolesLoading: boolean;
  isMaster: boolean;
  refetchRoles: () => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  roles: [],
  rolesLoading: false,
  isMaster: false,
  refetchRoles: async () => {},
  signOut: async () => {},
  signInWithGoogle: async () => {},
});

const APPLICABLE_ROLES: AppRole[] = ["host", "court_owner", "store_owner"];

async function migrateLegacyRoles(userId: string) {
  try {
    const raw = localStorage.getItem("pickleplay_roles");
    const legacy = localStorage.getItem("pickleplay_account_type");
    let legacyRoles: AppRole[] = [];
    if (raw) legacyRoles = JSON.parse(raw) as AppRole[];
    else if (legacy) legacyRoles = [legacy as AppRole];

    const toApply = legacyRoles.filter((r) => APPLICABLE_ROLES.includes(r));
    if (toApply.length === 0) {
      localStorage.removeItem("pickleplay_roles");
      localStorage.removeItem("pickleplay_account_type");
      return;
    }

    for (const role of toApply) {
      await supabase
        .from("role_applications")
        .insert({
          user_id: userId,
          requested_role: role,
          reason: "Migrated from previous local-only role selection",
        });
    }
    localStorage.removeItem("pickleplay_roles");
    localStorage.removeItem("pickleplay_account_type");
  } catch {
    // Silent: legacy migration is best-effort. User can re-apply via Settings.
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const fetchRoles = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setRoles([]);
      return;
    }
    setRolesLoading(true);
    const { data, error } = await supabase
      .from("user_roles")
      .select("role, revoked_at")
      .eq("user_id", uid)
      .is("revoked_at", null);
    if (!error && data) {
      setRoles(data.map((r) => r.role as AppRole));
    }
    setRolesLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        migrateLegacyRoles(session.user.id).finally(() => fetchRoles(session.user.id));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        migrateLegacyRoles(session.user.id).finally(() => fetchRoles(session.user.id));
      } else {
        setRoles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchRoles]);

  const refetchRoles = useCallback(async () => {
    await fetchRoles(user?.id);
  }, [fetchRoles, user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/profile',
      },
    });
    if (error) throw error;
  };

  const isMaster = roles.includes("master");

  return (
    <AuthContext.Provider value={{
      session, user, loading,
      roles, rolesLoading, isMaster, refetchRoles,
      signOut, signInWithGoogle,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
