import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { FriendProfile } from "./useFriends";

const sb = supabase as unknown as { from: (t: string) => any };

export interface UserSearchResult extends FriendProfile {
  bio: string | null;
}

// Escape ILIKE wildcards so user input "%" / "_" matches literally
const escapeIlike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export function useUserSearch(query: string) {
  const { user } = useAuth();
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await sb
        .from("profiles")
        .select("user_id, display_name, avatar_url, skill_level, location, bio")
        .ilike("display_name", `%${escapeIlike(q)}%`)
        .neq("user_id", user?.id ?? "")
        .limit(20);
      if (cancelled) return;
      setResults((data ?? []) as UserSearchResult[]);
      setLoading(false);
    }, 400);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, user?.id]);

  return { results, loading };
}
