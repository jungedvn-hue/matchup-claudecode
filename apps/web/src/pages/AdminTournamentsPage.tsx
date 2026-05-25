import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search, Shield, Trash2, ExternalLink, Users, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

interface Tournament {
  id: string;
  name: string;
  status: string | null;
  format: string | null;
  start_date: string | null;
  host_id: string;
  created_at: string;
  host?: { display_name: string | null };
  participantCount?: number;
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  registration: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  ongoing: "bg-primary/10 text-primary dark:text-primary border-primary/20",
  completed: "bg-primary/10 text-primary border-primary/20",
};

const AdminTournamentsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, name, status, format, start_date, host_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: t("admin.tournaments.toast.loadError"), description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const hostIds = [...new Set((data ?? []).map((t) => t.host_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", hostIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    const tournIds = (data ?? []).map((t) => t.id);
    const { data: parts } = await supabase
      .from("tour_participants")
      .select("tournament_id")
      .in("tournament_id", tournIds);
    const partCount = new Map<string, number>();
    for (const p of parts ?? []) {
      partCount.set(p.tournament_id, (partCount.get(p.tournament_id) ?? 0) + 1);
    }

    const enriched = (data ?? []).map((t) => ({
      ...t,
      host: profileMap.get(t.host_id),
      participantCount: partCount.get(t.id) ?? 0,
    })) as Tournament[];

    setItems(enriched);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      (t.host?.display_name ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActing(true);
    const { error } = await supabase.from("tournaments").delete().eq("id", deleteTarget.id);
    setActing(false);
    if (error) {
      toast({ title: t("admin.tournaments.toast.deleteError"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("admin.tournaments.toast.deleted") });
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Quản lý Tournament
          </h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.tournaments.searchPh")}
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
            Không có tournament nào.
          </Card>
        )}
        {!loading && filtered.map((tour) => (
          <Card key={tour.id} className="p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Trophy className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{tour.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {t("admin.tournaments.host")}: {tour.host?.display_name ?? t("admin.unknown")} • {new Date(tour.created_at).toLocaleDateString()}
                </p>
              </div>
              {tour.status && (
                <Badge variant="outline" className={STATUS_COLOR[tour.status] ?? ""}>{tour.status}</Badge>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 pl-7">
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {tour.participantCount}</span>
                {tour.format && <span>{tour.format}</span>}
                {tour.start_date && <span>{new Date(tour.start_date).toLocaleDateString()}</span>}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 gap-1"
                  onClick={() => navigate(`/tour-manager/${tour.id}`)}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(tour)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá tournament?</DialogTitle>
            <DialogDescription>
              Hành động này sẽ xoá toàn bộ category, participant, và match của giải <strong>{deleteTarget?.name}</strong>. Không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={acting}>
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xoá vĩnh viễn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTournamentsPage;
