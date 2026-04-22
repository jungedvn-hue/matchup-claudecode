import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";
import type { AppRole } from "@/hooks/use-roles";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const [selected, setSelected] = useState<AppRole[]>([]);

  const roleOptions: { id: AppRole; label: string; emoji: string; desc: string }[] = [
    { id: "player", label: t("settings.player"), emoji: "🏓", desc: t("settings.playerDesc") },
    { id: "host", label: t("settings.host"), emoji: "🎯", desc: t("settings.hostDesc") },
    { id: "court_owner", label: t("settings.courtOwner"), emoji: "🏟️", desc: t("settings.courtOwnerDesc") },
    { id: "store_owner", label: t("settings.storeOwner"), emoji: "🛍️", desc: t("settings.storeOwnerDesc") },
  ];

  const languages: { id: Language; label: string; flag: string }[] = [
    { id: "en", label: "English", flag: "🇺🇸" },
    { id: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  ];

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pickleplay_roles");
      if (raw) setSelected(JSON.parse(raw));
      else {
        const legacy = localStorage.getItem("pickleplay_account_type");
        if (legacy) setSelected([legacy as AppRole]);
        else setSelected(["player"]);
      }
    } catch {
      setSelected(["player"]);
    }
  }, []);

  const toggle = (role: AppRole) => {
    setSelected((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const save = () => {
    if (selected.length === 0) {
      toast({ title: t("settings.selectAtLeast"), variant: "destructive" });
      return;
    }
    localStorage.setItem("pickleplay_roles", JSON.stringify(selected));
    toast({ title: t("settings.saved") });
    navigate("/profile");
    window.location.reload();
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
          <div className="flex gap-2">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                  language === lang.id
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-transparent bg-secondary text-muted-foreground"
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>

        <div className="space-y-3">
          {roleOptions.map((role, i) => {
            const checked = selected.includes(role.id);
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={`p-4 cursor-pointer transition-all border-2 ${
                    checked ? "border-primary bg-primary/5" : "border-transparent"
                  }`}
                  onClick={() => toggle(role.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{role.emoji}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-card-foreground">{role.label}</p>
                      <p className="text-xs text-muted-foreground">{role.desc}</p>
                    </div>
                    <Checkbox checked={checked} onCheckedChange={() => toggle(role.id)} />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Button onClick={save} className="w-full rounded-xl gap-2 mt-4" disabled={selected.length === 0}>
          <Check className="h-4 w-4" /> {t("common.save")}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
