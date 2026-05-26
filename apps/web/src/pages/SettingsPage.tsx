import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Check, Globe, Clock, X, Shield, Sun, Moon, Monitor, Bell,
  User as UserIcon, FileText, HelpCircle, LogOut, Trash2, Key, Loader2,
  Sparkles, ChevronRight, Wallet, Palette, Languages, Lock, Info, ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANGUAGE_META, SUPPORTED_LANGUAGES, type Language } from "@/i18n";
import type { AppRole } from "@/hooks/use-roles";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ApplyRoleDialog from "@/components/ApplyRoleDialog";
import HostCreditCard from "@/components/HostCreditCard";
import { LEGAL_VERSION } from "@/pages/legal/legalContent";
import { toast } from "sonner";

type ApplicableRole = Exclude<AppRole, "master" | "player">;
type ApplicationStatus = "pending" | "approved" | "rejected";
const APPLICABLE_ROLES: ApplicableRole[] = ["host", "court_owner", "store_owner", "referee"];

type NotifKey = "events" | "matches" | "groups" | "tournaments";
const NOTIF_STORE = "matchup.notifPrefs";
const defaultNotifs: Record<NotifKey, boolean> = { events: true, matches: true, groups: true, tournaments: true };
const loadNotifs = (): Record<NotifKey, boolean> => {
  try { return { ...defaultNotifs, ...JSON.parse(localStorage.getItem(NOTIF_STORE) || "{}") }; }
  catch { return defaultNotifs; }
};

const Toggle = ({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative h-6 w-11 rounded-full transition-colors shrink-0 disabled:opacity-50 ${on ? "bg-primary" : "bg-secondary"}`}
  >
    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
  </button>
);

// Tappable row for the compact settings list
type RowProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: React.ReactNode;
  destructive?: boolean;
  onClick?: () => void;
  iconBg?: string;
  iconColor?: string;
};
const Row = ({ icon: Icon, label, value, destructive, onClick, iconBg = "bg-primary/10", iconColor = "text-primary" }: RowProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/40 transition-colors text-left"
  >
    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${destructive ? "bg-destructive/10 text-destructive" : `${iconBg} ${iconColor}`}`}>
      <Icon className="h-3.5 w-3.5" />
    </div>
    <span className={`flex-1 text-sm font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</span>
    {value !== undefined && <span className="text-xs text-muted-foreground truncate max-w-[40%]">{value}</span>}
    <ChevronRight className={`h-4 w-4 ${destructive ? "text-destructive/60" : "text-muted-foreground/60"}`} />
  </button>
);

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mt-5 mb-1.5">{children}</p>
);

const SettingsPage = () => {
  const navigate = useNavigate();
  const { toast: t1 } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { user, roles, rolesLoading, isMaster, refetchRoles } = useAuth();
  const { theme, setTheme } = useTheme();

  // ── Profile (for header card) ─────────────────────────────────────
  const [profile, setProfile] = useState<{ display_name?: string | null; avatar_url?: string | null } | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  // ── Role applications ────────────────────────────────────────────
  const [latestApp, setLatestApp] = useState<Record<ApplicableRole, ApplicationStatus | null>>({
    host: null, court_owner: null, store_owner: null, referee: null,
  });
  const [appsLoading, setAppsLoading] = useState(false);
  const [applyRole, setApplyRole] = useState<ApplicableRole | null>(null);

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
      if (APPLICABLE_ROLES.includes(r) && latest[r] === null) latest[r] = row.status as ApplicationStatus;
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
    if (role === "master") return;
    if (role === "player") { t1({ title: t("settings.toast.playerAlways") }); return; }
    const s = getRoleStatus(role);
    if (s === "active")  { t1({ title: t("settings.toast.alreadyHasRole"), description: t("settings.toast.contactMaster") }); return; }
    if (s === "pending") { t1({ title: t("settings.toast.pending"), description: t("settings.toast.pendingDesc") }); return; }
    setApplyRole(role as ApplicableRole);
  };

  const roleOptions: { id: AppRole; label: string; emoji: string; desc: string }[] = [
    { id: "player",      label: t("settings.player"),      emoji: "🎾", desc: t("settings.playerDesc") },
    { id: "host",        label: t("settings.host"),        emoji: "🎯", desc: t("settings.hostDesc") },
    { id: "court_owner", label: t("settings.courtOwner"),  emoji: "🏟️", desc: t("settings.courtOwnerDesc") },
    { id: "store_owner", label: t("settings.storeOwner"),  emoji: "🛍️", desc: t("settings.storeOwnerDesc") },
    { id: "referee",     label: t("settings.referee"),     emoji: "🦓", desc: t("settings.refereeDesc") },
  ];

  // ── Notifications ────────────────────────────────────────────────
  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>(defaultNotifs);
  useEffect(() => { setNotifs(loadNotifs()); }, []);
  const toggleNotif = (k: NotifKey) => setNotifs(prev => {
    const next = { ...prev, [k]: !prev[k] };
    localStorage.setItem(NOTIF_STORE, JSON.stringify(next));
    return next;
  });
  const notifOnCount = Object.values(notifs).filter(Boolean).length;

  // ── Health consent ───────────────────────────────────────────────
  const [healthConsent, setHealthConsent] = useState<{ data: boolean; ai: boolean } | null>(null);
  const loadHealthConsent = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("health_consents")
      .select("health_data_consent, ai_analysis_consent, withdrawn_at")
      .eq("user_id", user.id)
      .maybeSingle();
    const active = !!data && !data.withdrawn_at;
    setHealthConsent({
      data: active ? !!data?.health_data_consent : false,
      ai:   active ? !!data?.ai_analysis_consent : false,
    });
  }, [user]);
  useEffect(() => { loadHealthConsent(); }, [loadHealthConsent]);

  const updateHealthConsent = async (next: { data: boolean; ai: boolean }) => {
    if (!user) return;
    setHealthConsent(next);
    const payload = {
      user_id: user.id,
      health_data_consent: next.data,
      ai_analysis_consent: next.ai && next.data,
      consent_version: LEGAL_VERSION,
      consented_at: new Date().toISOString(),
      withdrawn_at: next.data ? null : new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("health_consents") as any).upsert(payload, { onConflict: "user_id" });
    if (error) {
      toast.error(error.message);
      loadHealthConsent();
    }
  };

  // ── Dialogs / sheets state ───────────────────────────────────────
  const [sheet, setSheet] = useState<null | "display" | "language" | "notifs" | "privacy" | "legal" | "roles" | "tools" | "hostCredit" | "about">(null);
  const closeSheet = () => setSheet(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delConfirm, setDelConfirm] = useState("");
  const [delLoading, setDelLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPw.length < 6) { toast.error(t("settings.account.pwTooShort")); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("settings.account.pwUpdated"));
    setPwOpen(false);
    setNewPw("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (delConfirm !== t("settings.deleteAccount.confirmWord")) return;
    setDelLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)("delete_my_account");
    if (error) {
      setDelLoading(false);
      toast.error(t("settings.deleteAccount.error") + " " + (error.message ?? ""));
      return;
    }
    await supabase.auth.signOut();
    setDelLoading(false);
    setDelOpen(false);
    toast.success(t("settings.deleteAccount.success"));
    navigate("/login");
  };

  // ── Display values for compact rows ──────────────────────────────
  const themeValueLabel = (theme === "dark") ? t("settings.value.themeDark") : (theme === "light") ? t("settings.value.themeLight") : t("settings.value.themeSystem");
  const langValueLabel = LANGUAGE_META[language]?.label ?? language;
  const notifValueLabel = notifOnCount === 0 ? t("settings.value.notifAllOff") : t("settings.value.notifOnCount").replace("{count}", String(notifOnCount));
  const rolesActiveCount = roles.filter(r => r !== "player").length;
  const rolesValueLabel = t("settings.value.rolesCount").replace("{count}", String(rolesActiveCount));

  const isHost = roles?.includes("host");

  return (
    <div className="pb-24 min-h-screen bg-secondary/20">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label={t("common.back")} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">{t("settings.title")}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-6">
        {/* ── Profile card ─────────────────────────────────────────── */}
        {user && (
          <div className="px-3 pt-3">
            <button
              onClick={() => navigate("/profile")}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left shadow-sm"
            >
              <div className="h-12 w-12 rounded-full overflow-hidden bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  : <UserIcon className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{profile?.display_name || user.email}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {roles.length === 0
                    ? <Badge variant="outline" className="text-[9px] py-0 h-4">player</Badge>
                    : roles.slice(0, 3).map(r => <Badge key={r} variant="outline" className="text-[9px] py-0 h-4">{r}</Badge>)}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
            </button>
          </div>
        )}

        {/* ── PREFERENCES ──────────────────────────────────────────── */}
        <GroupLabel>{t("settings.group.prefs")}</GroupLabel>
        <Card className="mx-3 overflow-hidden divide-y divide-border/60 rounded-2xl shadow-sm">
          <Row icon={Palette}    label={t("settings.row.display")}       value={themeValueLabel} onClick={() => setSheet("display")} />
          <Row icon={Languages}  label={t("settings.row.language")}      value={langValueLabel}  onClick={() => setSheet("language")} />
          <Row icon={Bell}       label={t("settings.row.notifications")} value={notifValueLabel} onClick={() => setSheet("notifs")} />
        </Card>

        {/* ── PRIVACY & LEGAL ──────────────────────────────────────── */}
        <GroupLabel>{t("settings.group.privacy")}</GroupLabel>
        <Card className="mx-3 overflow-hidden divide-y divide-border/60 rounded-2xl shadow-sm">
          <Row icon={Shield}   label={t("settings.row.privacyData")} onClick={() => setSheet("privacy")} />
          <Row icon={FileText} label={t("settings.row.legal")} onClick={() => setSheet("legal")} />
        </Card>

        {/* ── ACCOUNT ──────────────────────────────────────────────── */}
        {user && (
          <>
            <GroupLabel>{t("settings.group.account")}</GroupLabel>
            <Card className="mx-3 overflow-hidden divide-y divide-border/60 rounded-2xl shadow-sm">
              <Row icon={Sparkles} label={t("settings.row.roles")}    value={rolesValueLabel} onClick={() => setSheet("roles")} />
              <Row icon={Key}      label={t("settings.row.password")} onClick={() => setPwOpen(true)} />
              <Row icon={LogOut}   label={t("settings.row.logout")}   onClick={handleLogout} />
            </Card>
          </>
        )}

        {/* ── TOOLS (conditional) ──────────────────────────────────── */}
        {(isHost || isMaster) && (
          <>
            <GroupLabel>{t("settings.group.tools")}</GroupLabel>
            <Card className="mx-3 overflow-hidden divide-y divide-border/60 rounded-2xl shadow-sm">
              {isHost   && <Row icon={Wallet} label={t("settings.row.hostCredit")} onClick={() => setSheet("hostCredit")} />}
              {isMaster && <Row icon={Shield} label={t("settings.row.adminTools")} onClick={() => setSheet("tools")} />}
            </Card>
          </>
        )}

        {/* ── HELP & ABOUT ─────────────────────────────────────────── */}
        <GroupLabel>{t("settings.group.help")}</GroupLabel>
        <Card className="mx-3 overflow-hidden divide-y divide-border/60 rounded-2xl shadow-sm">
          <Row icon={HelpCircle} label={t("settings.row.help")}  onClick={() => navigate("/help")} />
          <Row icon={Info}       label={t("settings.row.about")} value="v1.0" onClick={() => setSheet("about")} />
        </Card>

        {/* ── DANGER ZONE ──────────────────────────────────────────── */}
        {user && (
          <>
            <GroupLabel>{t("settings.group.danger")}</GroupLabel>
            <Card className="mx-3 overflow-hidden divide-y divide-border/60 rounded-2xl shadow-sm border-destructive/30">
              <Row icon={Trash2} label={t("settings.row.deleteAccount")} destructive onClick={() => { setDelConfirm(""); setDelOpen(true); }} />
            </Card>
          </>
        )}

        <p className="text-[10px] text-muted-foreground text-center mt-6 pb-2">© 2026 MatchUp · app.matchup.asia</p>
      </div>

      {/* ─────────────────────────── SHEETS ─────────────────────────── */}

      {/* Display */}
      <Sheet open={sheet === "display"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("settings.sheet.display.title")}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-3">
            <p className="text-[11px] text-muted-foreground">{t("settings.sheet.display.themeLabel")}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "light",  label: t("settings.theme.light"),  Icon: Sun },
                { id: "dark",   label: t("settings.theme.dark"),   Icon: Moon },
                { id: "system", label: t("settings.theme.system"), Icon: Monitor },
              ].map(({ id, label, Icon }) => {
                const active = (theme ?? "system") === id;
                return (
                  <button key={id} onClick={() => setTheme(id)}
                          className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${
                            active ? "bg-primary/15 ring-1 ring-primary/40" : "bg-secondary/40 hover:bg-secondary/70"
                          }`}>
                    <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Language */}
      <Sheet open={sheet === "language"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("settings.language")}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-1">
            {SUPPORTED_LANGUAGES.map(id => {
              const active = language === id;
              return (
                <button
                  key={id}
                  onClick={() => { setLanguage(id as Language); closeSheet(); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${active ? "bg-primary/10" : "hover:bg-secondary/40"}`}
                >
                  <span className="text-2xl">{LANGUAGE_META[id].flag}</span>
                  <span className="flex-1 text-left text-sm font-medium text-foreground">{LANGUAGE_META[id].label}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Notifications */}
      <Sheet open={sheet === "notifs"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("settings.notifications")}</SheetTitle>
            <SheetDescription>{t("settings.sheet.notifications.subtitle")}</SheetDescription>
          </SheetHeader>
          <div className="py-4 divide-y divide-border/60">
            {([
              { key: "events" as NotifKey,      label: t("settings.notif.events"),      desc: t("settings.notif.eventsDesc") },
              { key: "matches" as NotifKey,     label: t("settings.notif.matches"),     desc: t("settings.notif.matchesDesc") },
              { key: "groups" as NotifKey,      label: t("settings.notif.groups"),      desc: t("settings.notif.groupsDesc") },
              { key: "tournaments" as NotifKey, label: t("settings.notif.tournaments"), desc: t("settings.notif.tournamentsDesc") },
            ]).map(item => (
              <div key={item.key} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
                <Toggle on={notifs[item.key]} onChange={() => toggleNotif(item.key)} />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">{t("settings.notif.localOnly")}</p>
        </SheetContent>
      </Sheet>

      {/* Privacy & data */}
      <Sheet open={sheet === "privacy"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("settings.sheet.privacy.title")}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-start gap-3 py-1">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{t("settings.sheet.privacy.healthLabel")}</p>
                <p className="text-[11px] text-muted-foreground">{t("settings.sheet.privacy.healthHint")}</p>
              </div>
              <Toggle
                on={!!healthConsent?.data}
                onChange={() => updateHealthConsent({ data: !healthConsent?.data, ai: healthConsent?.ai ?? false })}
              />
            </div>

            <div className="flex items-start gap-3 py-1">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{t("settings.sheet.privacy.aiLabel")}</p>
                <p className="text-[11px] text-muted-foreground">{t("settings.sheet.privacy.aiHint")}</p>
              </div>
              <Toggle
                on={!!healthConsent?.ai}
                disabled={!healthConsent?.data}
                onChange={() => updateHealthConsent({ data: healthConsent?.data ?? false, ai: !healthConsent?.ai })}
              />
            </div>

            <p className="text-[11px] text-muted-foreground bg-secondary/40 rounded-xl p-2.5 leading-relaxed">
              {t("settings.sheet.privacy.withdrawNote")}
            </p>

            <a
              href={`mailto:support@matchup.vn?subject=${encodeURIComponent(t("settings.sheet.privacy.exportSubject"))}&body=${encodeURIComponent(`${t("settings.sheet.privacy.exportBody")}\n\nUser ID: ${user?.id}\nEmail: ${user?.email}`)}`}
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
            >
              <span className="text-sm font-medium text-foreground">{t("settings.sheet.privacy.exportData")}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </SheetContent>
      </Sheet>

      {/* Legal */}
      <Sheet open={sheet === "legal"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("settings.sheet.legal.title")}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-2">
            <button
              onClick={() => { closeSheet(); navigate("/privacy"); }}
              className="w-full flex items-start gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors text-left"
            >
              <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{t("settings.legal.privacy")}</p>
                <p className="text-[11px] text-muted-foreground">{t("settings.sheet.legal.privacyDesc")}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => { closeSheet(); navigate("/terms"); }}
              className="w-full flex items-start gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors text-left"
            >
              <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{t("settings.legal.terms")}</p>
                <p className="text-[11px] text-muted-foreground">{t("settings.sheet.legal.tosDesc")}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <p className="text-[10px] text-muted-foreground text-center pt-2">{t("legal.version")}: {LEGAL_VERSION}</p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Roles */}
      <Sheet open={sheet === "roles"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("settings.sheet.roles.title")}</SheetTitle>
            <SheetDescription>{t("settings.sheet.roles.subtitle")}</SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-2">
            {(rolesLoading || appsLoading) && <p className="text-xs text-muted-foreground">{t("settings.loadingRoles")}</p>}
            {roleOptions.map(role => {
              const status = getRoleStatus(role.id);
              return (
                <button
                  key={role.id}
                  onClick={() => onRoleClick(role.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${status === "active" ? "border border-primary bg-primary/5" : "bg-secondary/40 hover:bg-secondary/60"}`}
                >
                  <div className="text-xl shrink-0">{role.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{role.label}</p>
                    <p className="text-[11px] text-muted-foreground">{role.desc}</p>
                  </div>
                  {status === "active"   && <Badge className="bg-primary text-primary-foreground gap-1 text-[10px]"><Check className="h-3 w-3" />{t("settings.status.active")}</Badge>}
                  {status === "pending"  && <Badge variant="secondary" className="gap-1 text-[10px]"><Clock className="h-3 w-3" />{t("settings.status.pending")}</Badge>}
                  {status === "rejected" && <Badge variant="destructive" className="gap-1 text-[10px]"><X className="h-3 w-3" />{t("settings.status.rejected")}</Badge>}
                  {status === "none" && role.id !== "player" && <Badge variant="outline" className="text-[10px]">{t("settings.status.apply")}</Badge>}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Host credit */}
      <Sheet open={sheet === "hostCredit"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("hostCredit.section")}</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <HostCreditCard />
          </div>
        </SheetContent>
      </Sheet>

      {/* Admin tools */}
      <Sheet open={sheet === "tools"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("settings.sheet.admin.title")}</SheetTitle>
            <SheetDescription>{t("settings.sheet.admin.subtitle")}</SheetDescription>
          </SheetHeader>
          <div className="py-4 grid grid-cols-2 gap-2">
            {[
              { path: "/admin/applications", label: t("settings.admin.applications"), desc: t("settings.admin.applicationsDesc") },
              { path: "/admin/users",        label: t("settings.admin.users"),        desc: t("settings.admin.usersDesc") },
              { path: "/admin/tournaments",  label: t("settings.admin.tournaments"),  desc: t("settings.admin.tournamentsDesc") },
              { path: "/admin/stats",        label: t("settings.admin.stats"),        desc: t("settings.admin.statsDesc") },
              { path: "/admin/coins",        label: t("settings.admin.coins"),        desc: t("settings.admin.coinsDesc") },
              { path: "/admin/host-promos",  label: t("settings.admin.hostPromos"),   desc: t("settings.admin.hostPromosDesc") },
              { path: "/admin/referee-certifications", label: t("adminRefCert.nav"),  desc: t("adminRefCert.subtitle") },
              { path: "/admin/settings",     label: t("settings.admin.platform"),     desc: t("settings.admin.platformDesc") },
              { path: "/investor-bi",        label: t("settings.admin.investorBI"),   desc: t("settings.admin.investorBIDesc") },
            ].map(it => (
              <button
                key={it.path}
                onClick={() => { closeSheet(); navigate(it.path); }}
                className="p-3 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
              >
                <p className="text-xs font-semibold text-primary">{it.label}</p>
                <p className="text-[10px] text-muted-foreground">{it.desc}</p>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* About */}
      <Sheet open={sheet === "about"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("settings.sheet.about.title")}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-2 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <span className="text-muted-foreground">{t("settings.sheet.about.version")}</span>
              <span className="font-medium text-foreground">v1.0</span>
            </div>
            <a href="https://app.matchup.asia" target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors">
              <span className="text-muted-foreground">{t("settings.sheet.about.website")}</span>
              <span className="font-medium text-primary">app.matchup.asia</span>
            </a>
            <a href="mailto:support@matchup.vn" className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors">
              <span className="text-muted-foreground">{t("settings.sheet.about.contact")}</span>
              <span className="font-medium text-primary">support@matchup.vn</span>
            </a>
            <p className="text-[10px] text-muted-foreground text-center pt-3">{t("settings.sheet.about.copyright")}</p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Apply role dialog */}
      <ApplyRoleDialog role={applyRole} open={!!applyRole}
        onOpenChange={(o) => { if (!o) setApplyRole(null); }}
        onSubmitted={() => { fetchApplications(); refetchRoles(); }} />

      {/* Change password */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Lock className="h-4 w-4 text-primary" />{t("settings.account.changePw")}</DialogTitle>
            <DialogDescription>{t("settings.account.pwHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-medium">{t("settings.account.newPw")}</Label>
            <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => { setPwOpen(false); setNewPw(""); }} disabled={pwSaving}>
              {t("common.cancel")}
            </Button>
            <Button className="rounded-xl" onClick={handleChangePassword} disabled={pwSaving || newPw.length < 6}>
              {pwSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete account */}
      <AlertDialog open={delOpen} onOpenChange={(o) => { if (!delLoading) setDelOpen(o); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">{t("settings.deleteAccount.dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.deleteAccount.dialogBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              value={delConfirm}
              onChange={(e) => setDelConfirm(e.target.value)}
              placeholder={t("settings.deleteAccount.placeholder")}
              disabled={delLoading}
              className="rounded-xl"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={delLoading}>{t("settings.deleteAccount.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
              disabled={delLoading || delConfirm !== t("settings.deleteAccount.confirmWord")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {delLoading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {delLoading ? t("settings.deleteAccount.deleting") : t("settings.deleteAccount.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
