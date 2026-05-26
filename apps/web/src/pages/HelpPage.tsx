import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, HelpCircle, Rocket, Sparkles, Users, Trophy, Award, ShoppingBag, Mail } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useLanguage } from "@/i18n/LanguageContext";

const FAQ_SECTIONS = [
  { id: "start",       icon: Rocket,      tone: "from-primary/8" },
  { id: "arena",       icon: Sparkles,    tone: "from-amber-500/8" },
  { id: "groups",      icon: Users,       tone: "from-blue-500/8" },
  { id: "tourneys",    icon: Trophy,      tone: "from-primary/8" },
  { id: "tourMgr",     icon: Award,       tone: "from-violet-500/8" },
  { id: "marketplace", icon: ShoppingBag, tone: "from-rose-500/8" },
  { id: "contact",     icon: Mail,        tone: "from-cyan-500/8" },
] as const;

const HelpPage = () => {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { t } = useLanguage();
  const initialFaq = hash?.startsWith("#faq-") ? hash.replace("#faq-", "") : undefined;

  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() => {
        document.getElementById(hash.replace("#", ""))?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [hash]);

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label={t("common.back")} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t("help.pageTitle")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        <p className="text-[12px] text-muted-foreground px-1">{t("help.intro")}</p>
        <Accordion type="single" collapsible defaultValue={initialFaq} className="space-y-2">
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
      </div>
    </div>
  );
};

export default HelpPage;
