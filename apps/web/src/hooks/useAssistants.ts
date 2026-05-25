import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any };

export type AssistantPermission = "check_in" | "approve_tickets" | "manage_players" | "view_stats";

export const ALL_ASSISTANT_PERMISSIONS: AssistantPermission[] = [
  "check_in", "approve_tickets", "manage_players", "view_stats",
];

export interface AssistantRow {
  id: string;
  group_id: string;
  user_id: string;
  assigned_by: string;
  permissions: AssistantPermission[];
  assigned_courts: string[];
  created_at: string;
  updated_at: string;
}

export interface AssistantWithProfile extends AssistantRow {
  display_name: string | null;
  avatar_url: string | null;
}

// ── Assistants of a group ─────────────────────────────────────────────────────

export const useGroupAssistants = (groupId: string | undefined) => {
  const [assistants, setAssistants] = useState<AssistantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!groupId) { setAssistants([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("group_assistants")
      .select("*").eq("group_id", groupId).order("created_at", { ascending: true });
    const rows = (data ?? []) as AssistantRow[];

    if (rows.length === 0) { setAssistants([]); setLoading(false); return; }
    const uids = rows.map(r => r.user_id);
    const { data: profiles } = await sb.from("profiles")
      .select("user_id, display_name, avatar_url").in("user_id", uids);
    const pMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    (profiles ?? []).forEach((p: any) => { pMap[p.user_id] = p; });

    setAssistants(rows.map(r => ({
      ...r,
      display_name: pMap[r.user_id]?.display_name ?? null,
      avatar_url: pMap[r.user_id]?.avatar_url ?? null,
    })));
    setLoading(false);
  }, [groupId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { assistants, loading, refetch: fetch };
};

// ── Groups where current user is an assistant ────────────────────────────────

export const useMyAssistantGroups = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<AssistantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("group_assistants").select("*").eq("user_id", user.id);
    setRows((data ?? []) as AssistantRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);
  return { rows, loading, refetch: fetch };
};

// ── My permissions on a specific group ────────────────────────────────────────

export const useMyAssistantPermissions = (groupId: string | undefined) => {
  const { user } = useAuth();
  const [row, setRow] = useState<AssistantRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user || !groupId) { setRow(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("group_assistants")
      .select("*").eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
    setRow((data ?? null) as AssistantRow | null);
    setLoading(false);
  }, [user, groupId]);

  useEffect(() => { fetch(); }, [fetch]);

  const can = (perm: AssistantPermission) => !!row?.permissions?.includes(perm);
  return { row, can, loading, refetch: fetch };
};

// ── Actions (host-only by RLS) ───────────────────────────────────────────────

export const useAssistantActions = () => {
  const { user } = useAuth();

  const assign = async (input: {
    groupId: string;
    userId: string;
    permissions: AssistantPermission[];
    assignedCourts: string[];
  }): Promise<{ error?: string }> => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await sb.from("group_assistants").insert({
      group_id: input.groupId,
      user_id: input.userId,
      assigned_by: user.id,
      permissions: input.permissions,
      assigned_courts: input.assignedCourts,
    });
    return error ? { error: error.message } : {};
  };

  const update = async (id: string, patch: {
    permissions?: AssistantPermission[];
    assigned_courts?: string[];
  }): Promise<{ error?: string }> => {
    const { error } = await sb.from("group_assistants").update(patch).eq("id", id);
    return error ? { error: error.message } : {};
  };

  const revoke = async (id: string): Promise<{ error?: string }> => {
    const { error } = await sb.from("group_assistants").delete().eq("id", id);
    return error ? { error: error.message } : {};
  };

  return { assign, update, revoke };
};
