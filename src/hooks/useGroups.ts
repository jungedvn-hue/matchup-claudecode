import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any };

export type SkillLevel = "all" | "beginner" | "intermediate" | "advanced" | "pro";
export type MemberRole = "host" | "admin" | "member";
export type MemberStatus = "active" | "pending" | "banned";

export interface Group {
  id: string;
  host_user_id: string;
  name: string;
  description: string | null;
  location: string | null;
  cover_emoji: string;
  skill_level: SkillLevel;
  is_open: boolean;
  max_members: number | null;
  member_count: number;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  joined_at: string;
  display_name?: string;
  avatar_url?: string;
}

export interface MyMembership {
  role: MemberRole;
  status: MemberStatus;
}

// ── Discover / list ───────────────────────────────────────────────────────────

export const useGroups = (filter?: { skill?: SkillLevel; search?: string }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = sb.from("groups").select("*").order("member_count", { ascending: false });
    if (filter?.skill && filter.skill !== "all") q = q.eq("skill_level", filter.skill);
    if (filter?.search) {
      const s = filter.search.replace(/[%,]/g, "");
      q = q.or(`name.ilike.%${s}%,location.ilike.%${s}%`);
    }
    const { data } = await q;
    setGroups((data as Group[]) ?? []);
    setLoading(false);
  }, [filter?.skill, filter?.search]);

  useEffect(() => { fetch(); }, [fetch]);
  return { groups, loading, refetch: fetch };
};

// ── My groups (member or host) ────────────────────────────────────────────────

export const useMyGroups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setGroups([]); setLoading(false); return; }
    setLoading(true);
    const { data: memberships } = await sb.from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .eq("status", "active");
    if (!memberships?.length) { setGroups([]); setLoading(false); return; }
    const ids = memberships.map((m: any) => m.group_id);
    const { data } = await sb.from("groups").select("*").in("id", ids).order("created_at", { ascending: false });
    setGroups((data as Group[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);
  return { groups, loading, refetch: fetch };
};

// ── Single group ──────────────────────────────────────────────────────────────

export const useGroup = (groupId: string | undefined) => {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [myMembership, setMyMembership] = useState<MyMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);

    const [{ data: g }, { data: rawMembers }] = await Promise.all([
      sb.from("groups").select("*").eq("id", groupId).single(),
      sb.from("group_members").select("*").eq("group_id", groupId).eq("status", "active").order("joined_at"),
    ]);

    setGroup(g as Group ?? null);

    // Hydrate display names from profiles
    const ms = (rawMembers as GroupMember[]) ?? [];
    if (ms.length > 0) {
      const uids = ms.map(m => m.user_id);
      const { data: profiles } = await sb.from("profiles").select("user_id, display_name, avatar_url").in("user_id", uids);
      const pMap: Record<string, { display_name: string; avatar_url: string }> = {};
      (profiles ?? []).forEach((p: any) => { pMap[p.user_id] = p; });
      const hydrated = ms.map(m => ({ ...m, display_name: pMap[m.user_id]?.display_name, avatar_url: pMap[m.user_id]?.avatar_url }));
      setMembers(hydrated);
      if (user) {
        const mine = ms.find(m => m.user_id === user.id);
        setMyMembership(mine ? { role: mine.role, status: mine.status } : null);
      }
    } else {
      setMembers([]);
      setMyMembership(null);
    }

    // Check pending membership
    if (user) {
      const { data: pending } = await sb.from("group_members")
        .select("role,status").eq("group_id", groupId).eq("user_id", user.id).single();
      if (pending) setMyMembership({ role: pending.role, status: pending.status });
    }

    setLoading(false);
  }, [groupId, user]);

  useEffect(() => { fetch(); }, [fetch]);
  return { group, members, myMembership, loading, refetch: fetch };
};

// ── Create group ──────────────────────────────────────────────────────────────

export const useCreateGroup = () => {
  const { user } = useAuth();

  const createGroup = async (input: {
    name: string;
    description?: string;
    location?: string;
    cover_emoji?: string;
    skill_level?: SkillLevel;
    is_open?: boolean;
    max_members?: number;
  }): Promise<{ data: Group | null; error: string | null }> => {
    if (!user) return { data: null, error: "Not authenticated" };
    const { data, error } = await sb.from("groups").insert({
      host_user_id: user.id,
      name: input.name,
      description: input.description || null,
      location: input.location || null,
      cover_emoji: input.cover_emoji || "🏓",
      skill_level: input.skill_level || "all",
      is_open: input.is_open ?? true,
      max_members: input.max_members || null,
    }).select().single();
    if (error) return { data: null, error: error.message };

    // Auto-add creator as group host member
    await sb.from("group_members").insert({
      group_id: (data as Group).id,
      user_id: user.id,
      role: "host",
      status: "active",
    });

    // Social Host inherits Tour Manager — grant 'host' app-role
    // (upsert handles fresh grant AND reactivating a previously-revoked role)
    await sb.from("user_roles").upsert({
      user_id: user.id, role: "host", revoked_at: null,
    }, { onConflict: "user_id,role" });

    return { data: data as Group, error: null };
  };

  return { createGroup };
};

// ── Join / leave ──────────────────────────────────────────────────────────────

export const useGroupMembership = (groupId: string | undefined) => {
  const { user } = useAuth();

  const join = async (): Promise<{ error?: string }> => {
    if (!user || !groupId) return { error: "Not authenticated" };
    const { data: g } = await sb.from("groups").select("is_open").eq("id", groupId).single();
    const status = (g as any)?.is_open ? "active" : "pending";
    const { error } = await sb.from("group_members").upsert({
      group_id: groupId, user_id: user.id, role: "member", status,
    }, { onConflict: "group_id,user_id" });
    return error ? { error: error.message } : {};
  };

  const leave = async (): Promise<{ error?: string }> => {
    if (!user || !groupId) return { error: "Not authenticated" };
    const { error } = await sb.from("group_members")
      .delete().eq("group_id", groupId).eq("user_id", user.id);
    return error ? { error: error.message } : {};
  };

  const approve = async (userId: string): Promise<{ error?: string }> => {
    if (!groupId) return { error: "No group" };
    const { error } = await sb.from("group_members")
      .update({ status: "active" }).eq("group_id", groupId).eq("user_id", userId);
    return error ? { error: error.message } : {};
  };

  const removeMember = async (userId: string): Promise<{ error?: string }> => {
    if (!groupId) return { error: "No group" };
    const { error } = await sb.from("group_members")
      .delete().eq("group_id", groupId).eq("user_id", userId);
    return error ? { error: error.message } : {};
  };

  return { join, leave, approve, removeMember };
};
