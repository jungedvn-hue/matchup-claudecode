import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Clock, Loader2, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type Status = "pending" | "approved" | "rejected";

interface Application {
  id: string;
  user_id: string;
  requested_role: string;
  status: Status;
  reason: string | null;
  business_info: Record<string, string> | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
  email?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  host: "Social Host",
  court_owner: "Court Owner",
  store_owner: "Store Owner",
};

const AdminApplicationsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState<Status>("pending");
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("role_applications")
      .select("*")
      .eq("status", tab)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Lỗi tải đơn", description: error.message, variant: "destructive" });
      setApps([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set((data ?? []).map((a) => a.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    const enriched = (data ?? []).map((a) => ({
      ...a,
      profile: profileMap.get(a.user_id) ?? undefined,
    })) as Application[];

    setApps(enriched);
    setLoading(false);
  }, [tab, toast]);

  useEffect(() => { load(); }, [load]);

  const approve = async (app: Application) => {
    if (!user) return;
    setActing(app.id);
    const { error } = await supabase
      .from("role_applications")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", app.id);
    setActing(null);
    if (error) {
      toast({ title: "Lỗi duyệt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Đã duyệt", description: `${ROLE_LABEL[app.requested_role]} cho ${app.profile?.display_name ?? "user"}` });
    load();
  };

  const submitReject = async () => {
    if (!rejectTarget || !user) return;
    setActing(rejectTarget.id);
    const { error } = await supabase
      .from("role_applications")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_note: rejectNote.trim() || null,
      })
      .eq("id", rejectTarget.id);
    setActing(null);
    if (error) {
      toast({ title: "Lỗi từ chối", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Đã từ chối" });
    setRejectTarget(null);
    setRejectNote("");
    load();
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-display font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Đơn đăng ký vai trò
            </h1>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="pending" className="gap-1"><Clock className="h-3 w-3" /> Pending</TabsTrigger>
            <TabsTrigger value="approved" className="gap-1"><Check className="h-3 w-3" /> Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1"><X className="h-3 w-3" /> Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-3 mt-4">
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {!loading && apps.length === 0 && (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Không có đơn nào ở trạng thái này.
              </Card>
            )}

            {!loading && apps.map((app) => (
              <Card key={app.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {(app.profile?.display_name ?? "?").substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{app.profile?.display_name ?? "Không rõ"}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{app.user_id}</p>
                  </div>
                  <Badge variant="outline">{ROLE_LABEL[app.requested_role] ?? app.requested_role}</Badge>
                </div>

                {app.reason && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Lý do</p>
                    <p className="text-sm whitespace-pre-wrap">{app.reason}</p>
                  </div>
                )}

                {app.business_info && Object.keys(app.business_info).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Thông tin doanh nghiệp</p>
                    {Object.entries(app.business_info).filter(([, v]) => v).map(([k, v]) => (
                      <p key={k} className="text-sm"><span className="text-muted-foreground">{k}:</span> {v as string}</p>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Gửi: {new Date(app.created_at).toLocaleString("vi-VN")}
                  {app.reviewed_at && ` • Xét: ${new Date(app.reviewed_at).toLocaleString("vi-VN")}`}
                </p>

                {app.reviewer_note && (
                  <div className="text-xs p-2 rounded bg-secondary">
                    <span className="text-muted-foreground">Ghi chú:</span> {app.reviewer_note}
                  </div>
                )}

                {tab === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => approve(app)}
                      disabled={acting === app.id}
                      className="flex-1 gap-1"
                    >
                      {acting === app.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectTarget(app)}
                      disabled={acting === app.id}
                      className="flex-1 gap-1"
                    >
                      <X className="h-3 w-3" />
                      Từ chối
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đơn</DialogTitle>
            <DialogDescription>
              {rejectTarget && `${rejectTarget.profile?.display_name ?? "User"} • ${ROLE_LABEL[rejectTarget.requested_role]}`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Lý do từ chối (tùy chọn — sẽ hiển thị cho user)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={submitReject} disabled={!!acting}>
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminApplicationsPage;
