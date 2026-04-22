import { NavLink, useLocation } from "react-router-dom";
import { Home, Trophy, User, LayoutDashboard, ShoppingBag, Award, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoles, hasRole } from "@/hooks/use-roles";
import { useLanguage } from "@/i18n/LanguageContext";

const BottomNav = () => {
  const location = useLocation();
  const roles = useRoles();
  const { t } = useLanguage();

  const navItems = [
    { to: "/", icon: Home, label: t("nav.home"), show: true },
    { to: "/tournaments", icon: Trophy, label: t("nav.tourneys"), show: true },
    { to: "/tour-manager", icon: Award, label: t("nav.tourManager"), show: true },
    { to: "/marketplace", icon: ShoppingBag, label: t("nav.market"), show: hasRole(roles, "store_owner") || hasRole(roles, "player") },
    { to: "/health", icon: Activity, label: t("nav.health"), show: true },
    { to: "/dashboard", icon: LayoutDashboard, label: t("nav.host"), show: hasRole(roles, "host") || hasRole(roles, "court_owner") },
    { to: "/profile", icon: User, label: t("nav.profile"), show: true },
  ].filter(item => item.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-[48px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span>{label}</span>
              {isActive && (
                <div className="absolute -top-0.5 h-0.5 w-8 rounded-full bg-primary" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
