import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Check, Globe, Clock, X, Shield, Sun, Moon, Monitor, Bell,
  User as UserIcon, FileText, HelpCircle, LogOut, Trash2, Key, Loader2,
  Sparkles, Users, Trophy, Award, ShoppingBag, Rocket, Mail, ChevronRight, Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
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
import { toast } from "sonner";

type ApplicableRole = Exclude<AppRole, "master" | "player">;
type ApplicationStatus = "pending" | "approved" | "rejected";

const APPLICABLE_ROLES: ApplicableRole[] = ["host", "court_owner", "store_owner", "referee"];

// ── Notification preferences (localStorage) ────────────────────────────────────
type NotifKey = "events" | "matches" | "groups" | "tournaments";
const NOTIF_STORE = "matchup.notifPrefs";
const defaultNotifs: Record<NotifKey, boolean> = { events: true, matches: true, groups: true, tournaments: true };
const loadNotifs = (): Record<NotifKey, boolean> => {
  try { return { ...defaultNotifs, ...JSON.parse(localStorage.getItem(NOTIF_STORE) || "{}") }; }
  catch { return defaultNotifs; }
};

// ── FAQ sections ───────────────────────────────────────────────────────────────
const FAQ_SECTIONS = [
  { id: "start",       icon: Rocket,      tone: "from-primary/8" },
  { id: "arena",       icon: Sparkles,    tone: "from-amber-500/8" },
  { id: "groups",      icon: Users,       tone: "from-blue-500/8" },
  { id: "tourneys",    icon: Trophy,      tone: "from-primary/8" },
  { id: "tourMgr",     icon: Award,       tone: "from-violet-500/8" },
  { id: "marketplace", icon: ShoppingBag, tone: "from-rose-500/8" },
  { id: "contact",     icon: Mail,        tone: "from-cyan-500/8" },
] as const;

// ── Section wrapper ────────────────────────────────────────────────────────────
const Section = ({ id, icon: Icon, title, children }: { id?: string; icon: any; title: string; children: React.ReactNode }) => (
  <section id={id} className="space-y-2 scroll-mt-24">
    <div className="flex items-center gap-2 ml-1">
      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h2 className="text-sm font-display font-bold text-foreground">{title}</h2>
    </div>
    {children}
  </section>
);

const Toggle = ({ on, onChange }: { on: boolean; onChange: () => void }) => (
  <button onClick={onChange} className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${on ? "bg-primary" : "bg-secondary"}`}>
    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
  </button>
);

const SettingsPage = () => {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { toast: t1 } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { user, roles, rolesLoading, isMaster, refetchRoles } = useAuth();
  const { theme, setTheme } = useTheme();

  const [latestApp, setLatestApp] = useState<Record<ApplicableRole, ApplicationStatus | null>>({
    host: null, court_owner: null, store_owner: null, referee: null,
  });
  const [appsLoading, setAppsLoading] = useState(false);
  const [applyRole, setApplyRole] = useState<ApplicableRole | null>(null);

  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>(defaultNotifs);
  useEffect(() => { setNotifs(loadNotifs()); }, []);
  const toggleNotif = (k: NotifKey) => setNotifs(prev => {
    const next = { ...prev, [k]: !prev[k] };
    localStorage.setItem(NOTIF_STORE, JSON.stringify(next));
    return next;
  });

  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  // Deep-link to FAQ section
  const initialFaq = hash?.startsWith("#faq-") ? hash.replace("#faq-", "") : null;
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() => {
        const id = hash.replace("#", "");
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [hash]);

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

  const themes = [
    { id: "light",  label: t("settings.theme.light"),  Icon: Sun },
    { id: "dark",   label: t("settings.theme.dark"),   Icon: Moon },
    { id: "system", label: t("settings.theme.system"), Icon: Monitor },
  ];

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

  const handleRequestDelete = () => {
    const subject = encodeURIComponent("Account deletion request");
    const body = encodeURIComponent(`User ID: ${user?.id}\nEmail: ${user?.email}\n\nI request deletion of my MatchUp account and all associated data.`);
    window.location.href = `mailto:support@matchup.vn?subject=${subject}&body=${body}`;
    setDelOpen(false);
  };

  const NOTIF_ITEMS: { key: NotifKey; label: string; desc: string }[] = [
    { key: "events",      label: t("settings.notif.events"),      desc: t("settings.notif.eventsDesc") },
    { key: "matches",     label: t("settings.notif.matches"),     desc: t("settings.notif.matchesDesc") },
    { key: "groups",      label: t("settings.notif.groups"),      desc: t("settings.notif.groupsDesc") },
    { key: "tournaments", label: t("settings.notif.tournaments"), desc: t("settings.notif.tournamentsDesc") },
  ];

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">{t("settings.title")}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-5">

        {/* ── Appearance ─────────────────────────────────────────────── */}
        <Section icon={Sun} title={t("settings.appearance")}>
          <Card className="p-2 shadow-card bg-gradient-to-br from-primary/5 via-card to-card">
            <div className="grid grid-cols-3 gap-1.5">
              {themes.map(({ id, label, Icon }) => {
                const active = (theme ?? "system") === id;
                return (
                  <button key={id} onClick={() => setTheme(id)}
                          className={`flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all ${
                            active ? "bg-primary/15 ring-1 ring-primary/40" : "bg-secondary/40 hover:bg-secondary/70"
                          }`}>
                    <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-[11px] font-medium ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </Section>

        {/* ── Language ───────────────────────────────────────────────── */}
        <Section icon={Globe} title={t("settings.language")}>
          <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
            <SelectTrigger className="h-11 rounded-xl bg-secondary/60 border-0">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span className="text-lg">{LANGUAGE_META[language].flag}</span>
                  <span className="font-medium">{LANGUAGE_META[language].label}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map(id => (
                <SelectItem key={id} value={id}>
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{LANGUAGE_META[id].flag}</span>
                    <span>{LANGUAGE_META[id].label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>

        {/* ── Notifications ──────────────────────────────────────────── */}
        <Section icon={Bell} title={t("settings.notifications")}>
          <Card className="shadow-card overflow-hidden">
            {NOTIF_ITEMS.map((item, i) => (
              <div key={item.key} className={`flex items-center gap-3 p-3.5 ${i < NOTIF_ITEMS.length - 1 ? "border-b border-border" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
                <Toggle on={notifs[item.key]} onChange={() => toggleNotif(item.key)} />
              </div>
            ))}
          </Card>
          <p className="text-[10px] text-muted-foreground px-1">{t("settings.notif.localOnly")}</p>
        </Section>

        {/* ── Roles ──────────────────────────────────────────────────── */}
        <Section icon={Shield} title={t("settings.roles")}>
          <p className="text-[11px] text-muted-foreground px-1 -mt-1">{t("settings.subtitle")}</p>
          {(rolesLoading || appsLoading) && (
            <p className="text-xs text-muted-foreground">{t("settings.loadingRoles")}</p>
          )}
          <div className="space-y-2">
            {roleOptions.map((role, i) => {
              const status = getRoleStatus(role.id);
              return (
                <motion.div key={role.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className={`p-3 cursor-pointer transition-all ${status === "active" ? "border-primary bg-primary/5" : "hover:bg-secondary/40"}`}
                        onClick={() => onRoleClick(role.id)}>
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{role.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-card-foreground">{role.label}</p>
                        <p className="text-[11px] text-muted-foreground">{role.desc}</p>
                      </div>
                      {status === "active"   && <Badge className="bg-primary text-primary-foreground gap-1 text-[10px]"><Check className="h-3 w-3" />{t("settings.status.active")}</Badge>}
                      {status === "pending"  && <Badge variant="secondary" className="gap-1 text-[10px]"><Clock className="h-3 w-3" />{t("settings.status.pending")}</Badge>}
                      {status === "rejected" && <Badge variant="destructive" className="gap-1 text-[10px]"><X className="h-3 w-3" />{t("settings.status.rejected")}</Badge>}
                      {status === "none" && role.id !== "player" && <Badge variant="outline" className="text-[10px]">{t("settings.status.apply")}</Badge>}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </Section>

        {/* ── Host platform credit (visible for hosts) ───────────────── */}
        {(roles?.includes("host") || isMaster) && (
          <Section icon={Wallet} title={t("hostCredit.section")}>
            <HostCreditCard />
          </Section>
        )}

        {/* ── Master / Admin tools ───────────────────────────────────── */}
        {isMaster && (
          <Section icon={Shield} title={t("settings.admin.title")}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { path: "/admin/applications", label: t("settings.admin.applications"), desc: t("settings.admin.applicationsDesc") },
                { path: "/admin/users",        label: t("settings.admin.users"),        desc: t("settings.admin.usersDesc") },
                { path: "/admin/tournaments",  label: t("settings.admin.tournaments"),  desc: t("settings.admin.tournamentsDesc") },
                { path: "/admin/stats",        label: t("settings.admin.stats"),        desc: t("settings.admin.statsDesc") },
                { path: "/admin/coins",        label: t("settings.admin.coins"),        desc: t("settings.admin.coinsDesc") },
                { path: "/investor-bi",        label: t("settings.admin.investorBI"),   desc: t("settings.admin.investorBIDesc") },
              ].map(it => (
                <Card key={it.path} className="p-3 cursor-pointer border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                      onClick={() => navigate(it.path)}>
                  <p className="text-xs font-semibold text-primary">{it.label}</p>
                  <p className="text-[10px] text-muted-foreground">{it.desc}</p>
                </Card>
              ))}
            </div>
          </Section>
        )}

        {/* ── Account ────────────────────────────────────────────────── */}
        {user && (
          <Section icon={UserIcon} title={t("settings.account.title")}>
            <Card className="shadow-card overflow-hidden">
              <div className="flex items-center justify-between p-3.5 border-b border-border">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">{t("settings.account.email")}</p>
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                </div>
              </div>
              <button onClick={() => setPwOpen(true)} className="w-full flex items-center justify-between p-3.5 border-b border-border hover:bg-secondary/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{t("settings.account.changePw")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={handleLogout} className="w-full flex items-center justify-between p-3.5 border-b border-border hover:bg-secondary/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <LogOut className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{t("settings.account.logout")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => setDelOpen(true)} className="w-full flex items-center justify-between p-3.5 hover:bg-destructive/5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{t("settings.account.delete")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-destructive/60" />
              </button>
            </Card>
          </Section>
        )}

        {/* ── Legal & App info ───────────────────────────────────────── */}
        <Section icon={FileText} title={t("settings.legal.title")}>
          <Card className="shadow-card overflow-hidden">
            <button onClick={() => navigate("/terms")}
                    className="w-full flex items-center justify-between p-3.5 border-b border-border hover:bg-secondary/40 transition-colors">
              <span className="text-sm font-medium text-foreground">{t("settings.legal.terms")}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => navigate("/privacy")}
                    className="w-full flex items-center justify-between p-3.5 border-b border-border hover:bg-secondary/40 transition-colors">
              <span className="text-sm font-medium text-foreground">{t("settings.legal.privacy")}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex items-center justify-between p-3.5">
              <span className="text-sm font-medium text-foreground">{t("settings.legal.version")}</span>
              <span className="text-xs text-muted-foreground tabular-nums">v1.0</span>
            </div>
          </Card>
        </Section>

        {/* ── FAQ ────────────────────────────────────────────────────── */}
        <Section icon={HelpCircle} title={t("settings.faq")}>
          <p className="text-[11px] text-muted-foreground px-1 -mt-1">{t("help.intro")}</p>
          <Accordion type="single" collapsible defaultValue={initialFaq ?? undefined} className="space-y-2">
            {FAQ_SECTIONS.map(({ id, icon: Icon, tone }) => (
              <AccordionItem key={id} value={id} id={`faq-${id}`}
                             className={`border rounded-2xl px-3 bg-gradient-to-br ${tone} via-card to-card scroll-mt-24`}>
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-display font-bold text-foreground text-left">{t(`help.${id}.title`)}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-line pl-1 pr-2">
                    {t(`help.${id}.body`)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>

      </div>

      <ApplyRoleDialog role={applyRole} open={!!applyRole}
        onOpenChange={(o) => { if (!o) setApplyRole(null); }}
        onSubmitted={() => { fetchApplications(); refetchRoles(); }} />

      {/* Change Password Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Key className="h-4 w-4 text-primary" />{t("settings.account.changePw")}</DialogTitle>
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

      {/* Delete Account Confirm */}
      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">{t("settings.account.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.account.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              {t("settings.account.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
