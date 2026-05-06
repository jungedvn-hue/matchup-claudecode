import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search, Shield, X, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { AppRole } from "@/hooks/use-roles";

interface UserRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  roles: { role: AppRole; revoked_at: string | null }[];
}

const ROLE_LABEL: Record<AppRole, string> = {
  master: "Master",
  player: "Player",
  host: "Host",
  court_owner: "Court Owner",
  store_owner: "Store Owner",
  referee: "Referee",
};

const GRANTABLE_ROLES: AppRole[] = ["host", "court_owner", "store_owner", "referee", "master"];

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [grantTarget, setGrantTarget] = useState<UserRow | null>(null);
  const [grantRole, setGrantRole] = useState<AppRole>("host");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .order("display_name");

    if (error) {
      toast({ title: "Lỗi tải user", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const userIds = (profiles ?? []).map((p) => p.user_id);
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role, revoked_at")
      .in("user_id", userIds);

    const roleMap = new Map<string, { role: AppRole; revoked_at: string | null }[]>();
    for (const r of rolesData ?? []) {
      const list = roleMap.get(r.user_id) ?? [];
      list.push({ role: r.role as AppRole, revoked_at: r.revoked_at });
      roleMap.set(r.user_id, list);
    }

    const enriched: UserRow[] = (profiles ?? []).map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      roles: roleMap.get(p.user_id) ?? [],
    }));

    setUsers(enriched);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.display_name ?? "").toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q)
    );
  }, [users, search]);

  const revokeRole = async (row: UserRow, role: AppRole) => {
    if (!user) return;
    if (row.user_id === user.id && role === "master") {
      toast({ title: "Không thể tự gỡ vai trò master của chính mình", variant: "destructive" });
      return;
    }
    setActing(`${row.user_id}:${role}`);
    const { error } = await supabase
      .from("user_roles")
      .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
      .eq("user_id", row.user_id)
      .eq("role", role);
    setActing(null);
    if (error) {
      toast({ title: "Lỗi gỡ vai trò", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Đã gỡ vai trò" });
    load();
  };

  const grantRoleSubmit = async () => {
    if (!grantTarget || !user) return;
    setActing(grantTarget.user_id);
    const { error } = await supabase
      .from("user_roles")
      .upsert(
        {
          user_id: grantTarget.user_id,
          role: grantRole,
          granted_by: user.id,
          granted_at: new Date().toISOString(),
          revoked_at: null,
          revoked_by: null,
        },
        { onConflict: "user_id,role" }
      );
    setActing(null);
    if (error) {
      toast({ title: "Lỗi cấp vai trò", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Đã cấp vai trò" });
    setGrantTarget(null);
    setGrantRole("host");
    load();
  };

  const activeRoles = (row: UserRow) => row.roles.filter((r) => r.revoked_at === null);

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Quản lý User
          </h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc user_id..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Không tìm thấy user.
          </Card>
        )}
        {!loading && filtered.map((u) => {
          const active = activeRoles(u);
          return (
            <Card key={u.user_id} className="p-3 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={u.display_name ?? ""} /> : null}
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {(u.display_name ?? "?").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.display_name ?? "Không rõ"}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{u.user_id}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setGrantTarget(u); setGrantRole("host"); }}
                  className="gap-1 shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  Cấp
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {active.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">Không có vai trò active</span>
                ) : (
                  active.map((r) => (
                    <Badge
                      key={r.role}
                      variant={r.role === "master" ? "default" : "secondary"}
                      className="gap-1 pr-1"
                    >
                      {ROLE_LABEL[r.role]}
                      {r.role !== "player" && (
                        <button
                          onClick={() => revokeRole(u, r.role)}
                          disabled={acting === `${u.user_id}:${r.role}`}
                          className="ml-1 hover:bg-background/30 rounded p-0.5"
                          title="Gỡ vai trò"
                        >
                          {acting === `${u.user_id}:${r.role}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </Badge>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!grantTarget} onOpenChange={(o) => { if (!o) setGrantTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cấp vai trò</DialogTitle>
            <DialogDescription>
              {grantTarget?.display_name ?? "User"}
            </DialogDescription>
          </DialogHeader>
          <Select value={grantRole} onValueChange={(v) => setGrantRole(v as AppRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRANTABLE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {grantRole === "master" && (
            <p className="text-xs text-destructive">
              ⚠️ Cấp Master = toàn quyền hệ thống. Cẩn thận.
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGrantTarget(null)}>Huỷ</Button>
            <Button onClick={grantRoleSubmit} disabled={!!acting}>
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cấp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPage;
