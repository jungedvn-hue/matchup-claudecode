import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Shield, Users, Trophy, FileText, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-roles";

interface Stats {
  totalUsers: number;
  rolesBreakdown: Record<AppRole, number>;
  signupsLast7Days: number;
  signupsLast30Days: number;
  totalTournaments: number;
  ongoingTournaments: number;
  pendingApplications: number;
}

const ROLE_LABEL: Record<AppRole, string> = {
  master: "Master",
  player: "Player",
  host: "Host",
  court_owner: "Court Owner",
  store_owner: "Store Owner",
  referee: "Referee",
};

const AdminStatsPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const [profilesRes, rolesRes, tournamentsRes, appsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, created_at"),
      supabase.from("user_roles").select("role, revoked_at").is("revoked_at", null),
      supabase.from("tournaments").select("id, status"),
      supabase.from("role_applications").select("id, status").eq("status", "pending"),
    ]);

    const profiles = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];
    const tournaments = tournamentsRes.data ?? [];

    const now = Date.now();
    const D7 = 7 * 24 * 60 * 60 * 1000;
    const D30 = 30 * 24 * 60 * 60 * 1000;
    const signupsLast7Days = profiles.filter((p) => now - new Date(p.created_at).getTime() <= D7).length;
    const signupsLast30Days = profiles.filter((p) => now - new Date(p.created_at).getTime() <= D30).length;

    const rolesBreakdown: Record<AppRole, number> = {
      master: 0, player: 0, host: 0, court_owner: 0, store_owner: 0, referee: 0,
    };
    for (const r of roles) {
      rolesBreakdown[r.role as AppRole] = (rolesBreakdown[r.role as AppRole] ?? 0) + 1;
    }

    setStats({
      totalUsers: profiles.length,
      rolesBreakdown,
      signupsLast7Days,
      signupsLast30Days,
      totalTournaments: tournaments.length,
      ongoingTournaments: tournaments.filter((t) => t.status === "ongoing").length,
      pendingApplications: appsRes.data?.length ?? 0,
    });

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Thống kê
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && stats && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Tổng user</p>
                </div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Tổng tournament</p>
                </div>
                <p className="text-2xl font-bold">{stats.totalTournaments}</p>
                <p className="text-[11px] text-primary dark:text-primary">
                  {stats.ongoingTournaments} đang diễn ra
                </p>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Signup 7 ngày</p>
                </div>
                <p className="text-2xl font-bold">{stats.signupsLast7Days}</p>
                <p className="text-[11px] text-muted-foreground">{stats.signupsLast30Days} trong 30 ngày</p>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Đơn pending</p>
                </div>
                <p className="text-2xl font-bold">{stats.pendingApplications}</p>
                <button onClick={() => navigate("/admin/applications")} className="text-[11px] text-primary hover:underline">
                  Xem đơn →
                </button>
              </Card>
            </div>

            <Card className="p-4 space-y-3">
              <p className="text-sm font-semibold">Phân bố vai trò</p>
              <div className="space-y-2">
                {(Object.keys(stats.rolesBreakdown) as AppRole[]).map((role) => {
                  const count = stats.rolesBreakdown[role];
                  const pct = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0;
                  return (
                    <div key={role} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{ROLE_LABEL[role]}</span>
                        <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminStatsPage;
