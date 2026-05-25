import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Award, Loader2, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (n: string, p: any) => any };

type CertLevel = "community" | "regional" | "national";

interface Row {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  certification_level: CertLevel;
  matches_officiated: number;
  rating_avg: number | null;
  rating_count: number;
}

const AdminRefereeCertificationsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: roleRows } = await sb.from("user_roles")
      .select("user_id").eq("role", "referee").is("revoked_at", null);
    const refIds: string[] = (roleRows ?? []).map((r: any) => r.user_id);
    if (refIds.length === 0) { setRows([]); setLoading(false); return; }

    const [{ data: profiles }, { data: contribs }] = await Promise.all([
      sb.from("profiles").select("user_id, display_name, avatar_url").in("user_id", refIds),
      sb.from("referee_contributions").select("user_id, certification_level, matches_officiated, rating_avg, rating_count").in("user_id", refIds),
    ]);

    const pMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));
    const cMap = new Map<string, any>((contribs ?? []).map((c: any) => [c.user_id, c]));

    const merged: Row[] = refIds.map(uid => {
      const p = pMap.get(uid);
      const c = cMap.get(uid);
      return {
        user_id: uid,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        certification_level: (c?.certification_level ?? "community") as CertLevel,
        matches_officiated: c?.matches_officiated ?? 0,
        rating_avg: c?.rating_avg ?? null,
        rating_count: c?.rating_count ?? 0,
      };
    });
    merged.sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""));
    setRows(merged);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => (r.display_name ?? "").toLowerCase().includes(q));
  }, [rows, search]);

  const setLevel = async (uid: string, level: CertLevel) => {
    setSaving(uid);
    const { error } = await sb.rpc("fn_admin_set_referee_certification", { p_user_id: uid, p_level: level });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success(t("adminRefCert.saved"));
    setRows(prev => prev.map(r => r.user_id === uid ? { ...r, certification_level: level } : r));
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" /> {t("adminRefCert.title")}
          </h1>
        </div>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-muted-foreground mb-2">{t("adminRefCert.subtitle")}</p>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("adminRefCert.searchPh")} className="pl-9" />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-2">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary opacity-40" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">{t("adminRefCert.empty")}</Card>
        ) : filtered.map(r => (
          <Card key={r.user_id} className="p-3 shadow-card">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 cursor-pointer" onClick={() => navigate(`/referee/${r.user_id}`)}>
                {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {(r.display_name ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{r.display_name ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground font-stat tabular-nums mt-0.5">
                  {r.matches_officiated} matches
                  {r.rating_count > 0 && r.rating_avg != null && ` · ★ ${r.rating_avg.toFixed(2)} (${r.rating_count})`}
                </p>
              </div>
              <div className="w-32 shrink-0">
                <Select value={r.certification_level} onValueChange={(v) => setLevel(r.user_id, v as CertLevel)} disabled={saving === r.user_id}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="community">{t("ref.cert.community")}</SelectItem>
                    <SelectItem value="regional">{t("ref.cert.regional")}</SelectItem>
                    <SelectItem value="national">{t("ref.cert.national")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminRefereeCertificationsPage;
