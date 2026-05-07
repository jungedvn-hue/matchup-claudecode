import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Globe, Clock, X, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANGUAGE_META, SUPPORTED_LANGUAGES, type Language } from "@/i18n";
import type { AppRole } from "@/hooks/use-roles";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ApplyRoleDialog from "@/components/ApplyRoleDialog";

type ApplicableRole = Exclude<AppRole, "master" | "player">;
type ApplicationStatus = "pending" | "approved" | "rejected";

const APPLICABLE_ROLES: ApplicableRole[] = ["host", "court_owner", "store_owner", "referee"];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { user, roles, rolesLoading, isMaster, refetchRoles } = useAuth();

  const [latestApp, setLatestApp] = useState<Record<ApplicableRole, ApplicationStatus | null>>({
    host: null, court_owner: null, store_owner: null, referee: null,
  });
  const [appsLoading, setAppsLoading] = useState(false);
  const [applyRole, setApplyRole] = useState<ApplicableRole | null>(null);

  const roleOptions: { id: AppRole; label: string; emoji: string; desc: string }[] = [
    { id: "player", label: t("settings.player"), emoji: "🎾", desc: t("settings.playerDesc") },
    { id: "host", label: t("settings.host"), emoji: "🎯", desc: t("settings.hostDesc") },
    { id: "court_owner", label: t("settings.courtOwner"), emoji: "🏟️", desc: t("settings.courtOwnerDesc") },
    { id: "store_owner", label: t("settings.storeOwner"), emoji: "🛍️", desc: t("settings.storeOwnerDesc") },
    { id: "referee", label: t("settings.referee"), emoji: "🦓", desc: t("settings.refereeDesc") },
  ];


  const fetchApplications = useCallback(async () => {
    if (!user) return;
    setAppsLoading(true);
    const { data } = await supabase
      .from("role_applications")
      .select("requested_role, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const latest: Record<ApplicableRole, ApplicationStatus | null> = {
      host: null, court_owner: null, store_owner: null, referee: null,
    };
    for (const row of data ?? []) {
      const r = row.requested_role as ApplicableRole;
      if (APPLICABLE_ROLES.includes(r) && latest[r] === null) {
        latest[r] = row.status as ApplicationStatus;
      }
    }
    setLatestApp(latest);
    setAppsLoading(false);
  }, [user]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const isActive = (role: AppRole) => roles.includes(role);

  const getRoleStatus = (role: AppRole): "active" | "pending" | "rejected" | "none" => {
    if (isActive(role)) return "active";
    if (role === "player" || role === "master") return "none";
    const r = role as ApplicableRole;
    if (latestApp[r] === "pending") return "pending";
    if (latestApp[r] === "rejected") return "rejected";
    return "none";
  };

  const onRoleClick = (role: AppRole) => {
    if (role === "master") return; // master không tự apply
    if (role === "player") {
      toast({ title: t("settings.toast.playerAlways") });
      return;
    }
    const status = getRoleStatus(role);
    if (status === "active") {
      toast({ title: t("settings.toast.alreadyHasRole"), description: t("settings.toast.contactMaster") });
      return;
    }
    if (status === "pending") {
      toast({ title: t("settings.toast.pending"), description: t("settings.toast.pendingDesc") });
      return;
    }
    setApplyRole(role as ApplicableRole);
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">{t("settings.title")}</h1>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Language Switcher */}
        <div>
          <p className="text-sm font-display font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-primary" /> {t("settings.language")}
          </p>
          <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
            <SelectTrigger className="h-11 rounded-xl bg-secondary border-transparent">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span className="text-lg">{LANGUAGE_META[language].flag}</span>
                  <span className="font-medium">{LANGUAGE_META[language].label}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((id) => (
                <SelectItem key={id} value={id}>
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{LANGUAGE_META[id].flag}</span>
                    <span>{LANGUAGE_META[id].label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isMaster && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-primary">{t("settings.admin.title")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Card
                className="p-3 cursor-pointer border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                onClick={() => navigate("/admin/applications")}
              >
                <p className="text-xs font-semibold text-primary">{t("settings.admin.applications")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.admin.applicationsDesc")}</p>
              </Card>
              <Card
                className="p-3 cursor-pointer border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                onClick={() => navigate("/admin/users")}
              >
                <p className="text-xs font-semibold text-primary">{t("settings.admin.users")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.admin.usersDesc")}</p>
              </Card>
              <Card
                className="p-3 cursor-pointer border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                onClick={() => navigate("/admin/tournaments")}
              >
                <p className="text-xs font-semibold text-primary">{t("settings.admin.tournaments")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.admin.tournamentsDesc")}</p>
              </Card>
              <Card
                className="p-3 cursor-pointer border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                onClick={() => navigate("/admin/stats")}
              >
                <p className="text-xs font-semibold text-primary">{t("settings.admin.stats")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.admin.statsDesc")}</p>
              </Card>
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>

        {(rolesLoading || appsLoading) && (
          <p className="text-xs text-muted-foreground">{t("settings.loadingRoles")}</p>
        )}

        <div className="space-y-3">
          {roleOptions.map((role, i) => {
            const status = getRoleStatus(role.id);
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={`p-4 cursor-pointer transition-all border-2 ${
                    status === "active" ? "border-primary bg-primary/5" : "border-transparent"
                  }`}
                  onClick={() => onRoleClick(role.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{role.emoji}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-card-foreground">{role.label}</p>
                      <p className="text-xs text-muted-foreground">{role.desc}</p>
                    </div>
                    {status === "active" && (
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <Check className="h-3 w-3" /> {t("settings.status.active")}
                      </Badge>
                    )}
                    {status === "pending" && (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" /> {t("settings.status.pending")}
                      </Badge>
                    )}
                    {status === "rejected" && (
                      <Badge variant="destructive" className="gap-1">
                        <X className="h-3 w-3" /> {t("settings.status.rejected")}
                      </Badge>
                    )}
                    {status === "none" && role.id !== "player" && (
                      <Badge variant="outline">{t("settings.status.apply")}</Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <ApplyRoleDialog
        role={applyRole}
        open={!!applyRole}
        onOpenChange={(o) => { if (!o) setApplyRole(null); }}
        onSubmitted={() => { fetchApplications(); refetchRoles(); }}
      />
    </div>
  );
};

export default SettingsPage;
