import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Ban, X, MapPin, Phone, Mail } from "lucide-react";
import { getVenue } from "@/lib/admin-venues";
import { cn } from "@/lib/utils";
import ApproveVenueDialog from "./ApproveVenueDialog";
import RejectOrSuspendDialog from "./RejectOrSuspendDialog";

const STATUS_PILL: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800",
  verified:  "bg-green-100 text-green-700",
  rejected:  "bg-slate-200 text-slate-700",
  suspended: "bg-red-100 text-red-700",
};

export default function VenueDetailPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  const q = useQuery({
    queryKey: ["admin-venue", id],
    queryFn: () => getVenue(id),
    enabled: !!id,
    retry: false,
  });

  if (q.isLoading) return <div className="text-slate-500 text-sm">{t("venues.loading")}</div>;
  const v = q.data;
  if (q.error || !v) {
    return (
      <div className="space-y-4">
        <Link to="/venues" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> {t("venues.back")}
        </Link>
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-slate-500">
          {t("venues.not_found")}
          {q.error && (
            <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap">{(q.error as any).message}</pre>
          )}
        </div>
      </div>
    );
  }

  const vs = v.verification_status;
  const owner = v.owner_display_name || v.owner_email || v.owner_user_id.slice(0, 8);

  const mapUrl = v.latitude && v.longitude
    ? `https://www.google.com/maps?q=${v.latitude},${v.longitude}`
    : null;

  return (
    <div className="space-y-5">
      <Link to="/venues" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> {t("venues.back")}
      </Link>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-900">{v.name}</h1>
              <span className={cn("text-xs px-2 py-0.5 rounded", STATUS_PILL[vs] ?? "bg-slate-100")}>
                {t(`venues.status_${vs}`)}
              </span>
              {v.status !== "active" && (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{v.status}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 mt-1">
              {v.location && <span>{v.location}</span>}
              {v.address && <span>· {v.address}</span>}
              {v.contact_phone && (
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {v.contact_phone}</span>
              )}
              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-brand hover:underline">
                  <MapPin className="w-3.5 h-3.5" /> Map
                </a>
              )}
            </div>
          </div>
          <div className="shrink-0 flex flex-col gap-2">
            {vs === "pending" || vs === "rejected" || vs === "suspended" ? (
              <button onClick={() => setApproveOpen(true)}
                className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded inline-flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {vs === "pending" ? t("venues.approve") : t("venues.reinstate")}
              </button>
            ) : null}
            {vs === "pending" && (
              <button onClick={() => setRejectOpen(true)}
                className="px-3 py-1.5 text-sm bg-slate-200 hover:bg-slate-300 text-slate-800 rounded inline-flex items-center gap-1.5">
                <X className="w-4 h-4" /> {t("venues.reject")}
              </button>
            )}
            {vs === "verified" && (
              <button onClick={() => setSuspendOpen(true)}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded inline-flex items-center gap-1.5">
                <Ban className="w-4 h-4" /> {t("venues.suspend")}
              </button>
            )}
          </div>
        </div>

        {vs === "pending" && (
          <div className="mt-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            ⏳ {t("venues.pending_banner")}
          </div>
        )}
        {vs === "rejected" && (
          <div className="mt-4 px-3 py-2 bg-slate-100 border border-slate-200 rounded text-sm text-slate-700">
            🚫 {t("venues.rejected_banner")}
          </div>
        )}
        {vs === "suspended" && (
          <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            ⚠ {t("venues.suspended_banner", { reason: v.suspended_reason ?? "—" })}
          </div>
        )}
        {vs === "verified" && v.verified_at && (
          <div className="mt-4 px-3 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            ✓ {t("venues.verified_at", { date: new Date(v.verified_at).toLocaleString() })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">{t("venues.venue_section")}</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">{t("venues.courts")}</dt>
            <dd>{v.court_count}</dd>
            <dt className="text-slate-500">{t("venues.commission")}</dt>
            <dd>{v.commission_rate != null ? `${(v.commission_rate * 100).toFixed(2)}%` : "—"}</dd>
            <dt className="text-slate-500">{t("venues.amenities")}</dt>
            <dd className="col-span-1">
              {v.amenities && v.amenities.length > 0
                ? v.amenities.map(a => (
                    <span key={a} className="inline-block text-xs bg-slate-100 px-2 py-0.5 rounded mr-1 mb-1">{a}</span>
                  ))
                : "—"}
            </dd>
            <dt className="text-slate-500">{t("venues.created")}</dt>
            <dd>{new Date(v.created_at).toLocaleString()}</dd>
            <dt className="text-slate-500">ID</dt>
            <dd className="font-mono text-xs break-all col-span-1">{v.id}</dd>
          </dl>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">{t("venues.owner_section")}</h2>
          <div className="space-y-1.5 text-sm">
            <div className="text-slate-900 font-medium">{owner}</div>
            {v.owner_email && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Mail className="w-3.5 h-3.5" /> {v.owner_email}
              </div>
            )}
            {v.owner_phone && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Phone className="w-3.5 h-3.5" /> {v.owner_phone}
              </div>
            )}
            <div className="pt-2">
              <Link to={`/users/${v.owner_user_id}`}
                className="text-xs text-brand hover:underline">View owner profile →</Link>
            </div>
          </div>
        </div>
      </div>

      <ApproveVenueDialog open={approveOpen} onClose={() => setApproveOpen(false)}
        venueId={v.id} venueName={v.name} currentCommission={v.commission_rate} />
      <RejectOrSuspendDialog mode="reject" open={rejectOpen} onClose={() => setRejectOpen(false)}
        venueId={v.id} venueName={v.name} />
      <RejectOrSuspendDialog mode="suspend" open={suspendOpen} onClose={() => setSuspendOpen(false)}
        venueId={v.id} venueName={v.name} />
    </div>
  );
}
