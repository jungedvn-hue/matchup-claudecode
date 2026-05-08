import { NavLink, useLocation } from "react-router-dom";
import { Home, Trophy, ShoppingBag, User, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

const NAV_ITEMS = [
  { to: "/", icon: Home, labelKey: "nav.home" },
  { to: "/tour-manager", icon: Award, labelKey: "nav.tourManager" },
  { to: "/tournaments", icon: Trophy, labelKey: "nav.tourneys" },
  { to: "/marketplace", icon: ShoppingBag, labelKey: "nav.market" },
  { to: "/profile", icon: User, labelKey: "nav.profile" },
] as const;

const BottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1.5">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => {
          const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-[52px]",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary" />
              )}
              <Icon className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.5px]")} />
              <span>{t(labelKey)}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
