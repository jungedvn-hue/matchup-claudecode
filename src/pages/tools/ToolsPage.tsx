import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Wrench, Lock, KeyRound, Sparkles, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRoles } from "@/hooks/use-roles";
import { TOOLS, CATEGORIES, filterToolsForRoles, type Tool, type ToolCategory } from "@/lib/tools";
import { toast } from "sonner";

const StatusBadge = ({ status }: { status: Tool["status"] }) => {
  const { t } = useLanguage();
  if (status === "available") return null;
  const map = {
    beta:           { cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", key: "tools.badge.beta" },
    coming_soon:    { cls: "bg-secondary text-muted-foreground border-border",                       key: "tools.badge.comingSoon" },
    premium_locked: { cls: "bg-primary/10 text-primary border-primary/20",                           key: "tools.badge.premium" },
  }[status];
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${map.cls}`}>
      {t(map.key)}
    </span>
  );
};

const ToolCard = ({ tool, onClick }: { tool: Tool; onClick: () => void }) => {
  const { t } = useLanguage();
  const Icon = tool.icon;
  const disabled = tool.status === "coming_soon";
  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-4 rounded-xl bg-card border border-border text-left transition-all ${
        disabled ? "opacity-60 cursor-not-allowed" : "hover:border-primary/40 active:scale-[0.98]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-display font-semibold text-foreground">{t(tool.labelKey)}</p>
            <StatusBadge status={tool.status} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t(tool.descKey)}</p>
        </div>
        {!disabled && <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-1" />}
      </div>
    </motion.button>
  );
};

const VALID_TABS: ToolCategory[] = ["organize", "finance", "facility", "player"];

const ToolsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const roles = useRoles();
  const allRoles = user ? [...roles, "player"] : []; // any logged-in user gets "player"
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as ToolCategory | null;
  const initialTab: ToolCategory = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "organize";

  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");

  const setTab = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v === "organize") next.delete("tab"); else next.set("tab", v);
    setSearchParams(next, { replace: true });
  };

  const visibleTools = filterToolsForRoles(TOOLS, allRoles);
  const byCategory = (cat: ToolCategory) =>
    visibleTools.filter(t => t.category === cat).sort((a, b) => b.priority - a.priority);

  const handleToolClick = (tool: Tool) => {
    if (tool.status === "coming_soon") return;
    if (tool.status === "premium_locked") {
      setCodeOpen(true);
      return;
    }
    if (tool.route) navigate(tool.route);
    else toast.info(t("tools.notImplementedYet"));
  };

  const handleRedeemCode = () => {
    if (!code.trim()) return;
    // TODO: call fn_redeem_tool_code RPC when DB ready
    toast.info(t("tools.codeRedeemSoon"));
    setCodeOpen(false);
    setCode("");
  };

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-display font-bold text-foreground">{t("tools.title")}</h1>
            <p className="text-xs text-muted-foreground truncate">{t("tools.subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 shrink-0" onClick={() => setCodeOpen(true)}>
            <KeyRound className="h-3.5 w-3.5" />
            <span className="text-[11px]">{t("tools.redeemCode")}</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue={initialTab} onValueChange={setTab} className="px-4 pt-4 max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-4 h-12">
          {CATEGORIES.map(c => (
            <TabsTrigger key={c.id} value={c.id} className="flex flex-col gap-0.5 text-[10px]">
              {c.id === "organize" && <Wrench className="h-4 w-4" />}
              {c.id === "finance" && <Sparkles className="h-4 w-4" />}
              {c.id === "facility" && <Lock className="h-4 w-4" />}
              {c.id === "player" && <Wrench className="h-4 w-4" />}
              {t(c.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map(cat => {
          const tools = byCategory(cat.id);
          return (
            <TabsContent key={cat.id} value={cat.id} className="mt-4 space-y-2">
              {tools.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground space-y-2">
                  <Wrench className="h-6 w-6 mx-auto text-muted-foreground/30" />
                  <p>{t("tools.emptyCategory")}</p>
                </Card>
              ) : (
                tools.map(tool => <ToolCard key={tool.id} tool={tool} onClick={() => handleToolClick(tool)} />)
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> {t("tools.redeemCode")}</DialogTitle>
            <DialogDescription>{t("tools.codeDesc")}</DialogDescription>
          </DialogHeader>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="MP-XXXX-XXXX"
            className="font-mono uppercase tracking-widest text-center"
            maxLength={20}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCodeOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleRedeemCode} disabled={!code.trim()}>{t("tools.redeem")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ToolsPage;
