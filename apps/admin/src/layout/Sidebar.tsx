import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, Building2, Calendar, Trophy, UsersRound, ShoppingBag,
  Ticket, Shield, Heart, CreditCard, Undo2, Scale, BookOpen, Flag, Megaphone,
  Image, ToggleRight, Eye, ScrollText, Settings, ChevronsLeft, ChevronsRight,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const groups = [
  {
    id: "operate",
    titleKey: "nav.operate",
    items: [
      { to: "/", icon: LayoutDashboard, key: "nav.dashboard", end: true },
      { to: "/users", icon: Users, key: "nav.users" },
      { to: "/venues", icon: Building2, key: "nav.venues" },
      { to: "/bookings", icon: Calendar, key: "nav.bookings" },
    ],
  },
  {
    id: "business",
    titleKey: "nav.business",
    items: [
      { to: "/tournaments", icon: Trophy, key: "nav.tournaments" },
      { to: "/groups", icon: UsersRound, key: "nav.groups" },
      { to: "/marketplace", icon: ShoppingBag, key: "nav.marketplace" },
      { to: "/events", icon: Ticket, key: "nav.events" },
      { to: "/referees", icon: Shield, key: "nav.referees" },
      { to: "/health", icon: Heart, key: "nav.health" },
    ],
  },
  {
    id: "money",
    titleKey: "nav.money",
    items: [
      { to: "/payments", icon: CreditCard, key: "nav.payments" },
      { to: "/refunds", icon: Undo2, key: "nav.refunds" },
      { to: "/disputes", icon: Scale, key: "nav.disputes" },
      { to: "/reconciliation", icon: BookOpen, key: "nav.reconciliation" },
    ],
  },
  {
    id: "platform",
    titleKey: "nav.platform",
    items: [
      { to: "/reports", icon: Flag, key: "nav.reports" },
      { to: "/broadcasts", icon: Megaphone, key: "nav.broadcasts" },
      { to: "/banners", icon: Image, key: "nav.banners" },
      { to: "/flags", icon: ToggleRight, key: "nav.flags" },
      { to: "/impersonate", icon: Eye, key: "nav.impersonate" },
      { to: "/audit", icon: ScrollText, key: "nav.audit" },
      { to: "/settings", icon: Settings, key: "nav.settings" },
    ],
  },
];

const COLLAPSED_KEY = "matchup-admin-sidebar-collapsed";
const OPEN_GROUPS_KEY = "matchup-admin-sidebar-open-groups";

export default function Sidebar() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  });
  const [hover, setHover] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return { operate: true };
    try {
      const raw = localStorage.getItem(OPEN_GROUPS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { operate: true, business: false, money: false, platform: false };
  });

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);
  useEffect(() => {
    localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  const expanded = !collapsed || hover;
  const toggleGroup = (id: string) =>
    setOpenGroups(g => ({ ...g, [id]: !g[id] }));

  return (
    <aside
      onMouseEnter={() => collapsed && setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "shrink-0 border-r border-slate-200 bg-white overflow-y-auto overflow-x-hidden",
        "transition-[width] duration-200 ease-out",
        expanded ? "w-60" : "w-14"
      )}
    >
      <div className="px-3 py-3 border-b border-slate-200 flex items-center justify-between gap-2 h-14">
        {expanded ? (
          <span className="text-base font-semibold text-slate-900 truncate">{t("app.name")}</span>
        ) : (
          <span className="text-base font-bold text-brand-dark mx-auto">M</span>
        )}
        {expanded && (
          <button
            onClick={() => { setCollapsed(c => !c); setHover(false); }}
            className="p-1 text-slate-500 hover:bg-slate-100 rounded shrink-0"
            title={collapsed ? "Mở rộng" : "Thu gọn"}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      <nav className="p-2 space-y-1">
        {groups.map(g => {
          const isOpen = expanded ? (openGroups[g.id] ?? false) : true; // collapsed sidebar: show all icons
          return (
            <div key={g.id}>
              {expanded ? (
                <button
                  onClick={() => toggleGroup(g.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded"
                >
                  <span>{t(g.titleKey)}</span>
                  {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              ) : (
                <div className="mx-2 my-2 border-t border-slate-100" />
              )}
              {isOpen && (
                <ul className="space-y-0.5 mt-0.5">
                  {g.items.map(it => (
                    <li key={it.to}>
                      <NavLink
                        to={it.to}
                        end={(it as any).end}
                        title={!expanded ? t(it.key) : undefined}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 rounded text-sm",
                            expanded ? "px-2.5 py-1.5" : "justify-center p-2",
                            isActive
                              ? "bg-brand/10 text-brand-dark font-medium"
                              : "text-slate-700 hover:bg-slate-100"
                          )
                        }
                      >
                        <it.icon className="w-4 h-4 shrink-0" />
                        {expanded && <span className="truncate">{t(it.key)}</span>}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
