import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Ban, ShieldCheck, EyeOff } from "lucide-react";
import { getProfile, getActiveSuspension, logPiiReveal } from "@/lib/admin-users";
import { maskEmail, maskPhone, cn } from "@/lib/utils";
import SuspendUserDialog from "./SuspendUserDialog";
import UnsuspendUserDialog from "./UnsuspendUserDialog";
import SuspensionsHistoryTab from "./SuspensionsHistoryTab";

type Tab = "overview" | "bookings" | "payments" | "reports" | "suspensions" | "activity";

export default function UserDetailPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("overview");
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [unsuspendOpen, setUnsuspendOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-detail", id],
    queryFn: () => getProfile(id),
    enabled: !!id,
  });
  const { data: activeSuspension } = useQuery({
    queryKey: ["user-active-suspension", id],
    queryFn: () => getActiveSuspension(id),
    enabled: !!id,
  });

  const togglePhone = () => {
    if (!showPhone) logPiiReveal(id, "phone");
    setShowPhone(s => !s);
  };
  const toggleEmail = () => {
    if (!showEmail) logPiiReveal(id, "email");
    setShowEmail(s => !s);
  };

  if (isLoading) return <div className="text-slate-500 text-sm">{t("users.loading")}</div>;
  if (!profile) {
    return (
      <div className="space-y-4">
        <Link to="/users" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> {t("users.back")}
        </Link>
        <div className="text-slate-500">{t("users.not_found")}</div>
      </div>
    );
  }

  const label = profile.full_name || profile.email || profile.phone || profile.id.slice(0, 8);
  const isSuspended = !!activeSuspension;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview",    label: t("users.tab_overview") },
    { id: "bookings",    label: t("users.tab_bookings") },
    { id: "payments",    label: t("users.tab_payments") },
    { id: "reports",     label: t("users.tab_reports") },
    { id: "suspensions", label: t("users.tab_suspensions") },
    { id: "activity",    label: t("users.tab_activity") },
  ];

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link to="/users" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> {t("users.back")}
      </Link>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-xl text-slate-500 shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" />
              ) : (label[0]?.toUpperCase() ?? "?")}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-slate-900 truncate">{label}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 mt-1">
                <span className="flex items-center gap-1">
                  📱 {showPhone ? (profile.phone ?? "—") : maskPhone(profile.phone)}
                  {profile.phone && (
                    <button onClick={togglePhone} className="ml-1 text-slate-400 hover:text-slate-700">
                      {showPhone ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  ✉ {showEmail ? (profile.email ?? "—") : maskEmail(profile.email)}
                  {profile.email && (
                    <button onClick={toggleEmail} className="ml-1 text-slate-400 hover:text-slate-700">
                      {showEmail ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </span>
                {profile.created_at && (
                  <span>· {t("users.joined")}: {new Date(profile.created_at).toLocaleDateString()}</span>
                )}
              </div>
              <div className="mt-2">
                {isSuspended ? (
                  <span className="inline-block text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                    {t("users.status_suspended")}
                  </span>
                ) : (
                  <span className="inline-block text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                    {t("users.status_active")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {isSuspended ? (
              <button onClick={() => setUnsuspendOpen(true)}
                className="px-3 py-1.5 text-sm bg-brand text-white hover:bg-brand-dark rounded inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> {t("users.unsuspend")}
              </button>
            ) : (
              <button onClick={() => setSuspendOpen(true)}
                className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 rounded inline-flex items-center gap-1.5">
                <Ban className="w-4 h-4" /> {t("users.suspend")}
              </button>
            )}
          </div>
        </div>

        {isSuspended && activeSuspension && (
          <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            ⚠ {t("users.suspended_banner", { reason: `${activeSuspension.reason_code} — ${activeSuspension.reason}` })}
            <div className="text-xs mt-0.5 text-red-700">
              {activeSuspension.expires_at
                ? t("users.expires_at", { date: new Date(activeSuspension.expires_at).toLocaleString() })
                : t("users.no_expiry")}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {tabs.map(t1 => (
            <button key={t1.id} onClick={() => setTab(t1.id)}
              className={cn(
                "px-4 py-2 text-sm border-b-2 -mb-px",
                tab === t1.id
                  ? "border-brand text-brand-dark font-medium"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}>
              {t1.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {tab === "overview" && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-500">User ID</dt>
              <dd className="text-slate-900 font-mono text-xs">{profile.id}</dd>
              <dt className="text-slate-500">{t("users.joined")}</dt>
              <dd>{profile.created_at ? new Date(profile.created_at).toLocaleString() : "—"}</dd>
            </dl>
          </div>
        )}
        {tab === "suspensions" && <SuspensionsHistoryTab userId={id} />}
        {tab !== "overview" && tab !== "suspensions" && (
          <div className="text-slate-500 text-sm py-8 text-center">{t("users.coming_soon")}</div>
        )}
      </div>

      {/* Modals */}
      <SuspendUserDialog open={suspendOpen} onClose={() => setSuspendOpen(false)}
        userId={id} userLabel={label} />
      {activeSuspension && (
        <UnsuspendUserDialog open={unsuspendOpen} onClose={() => setUnsuspendOpen(false)}
          userId={id} suspensionId={activeSuspension.id} />
      )}
    </div>
  );
}
