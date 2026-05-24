import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, MapPin, Phone, Loader2, Edit, Share2, Users, Calendar, Trophy, CalendarClock, ExternalLink, Clock, Coins, CalendarPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useVenue, useVenueActivity, AMENITY_OPTIONS, DAY_KEYS } from "@/hooks/useVenues";
import BookingDialog from "@/components/BookingDialog";
import { toast } from "sonner";

const VenueProfilePage = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: venue, loading } = useVenue(venueId);
  const { data: activity } = useVenueActivity(venueId);
  const [bookingOpen, setBookingOpen] = useState(false);

  const amenityLabel = (id: string) => {
    const opt = AMENITY_OPTIONS.find(o => o.id === id);
    return opt ? { emoji: opt.emoji, label: t(opt.labelKey) } : { emoji: "•", label: id };
  };

  const share = () => {
    const url = window.location.origin + `/venue/${venueId}`;
    if (navigator.share) {
      navigator.share({ title: venue?.name ?? "Venue", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t("common.linkCopied"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
      </div>
    );
  }
  if (!venue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t("venue.notFound")}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>{t("common.back")}</Button>
      </div>
    );
  }

  const isOwn = user?.id === venue.owner_user_id;

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2 flex-1 min-w-0 truncate">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">{venue.name}</span>
          </h1>
          <button onClick={share} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <Share2 className="h-4 w-4" />
          </button>
          {isOwn && (
            <button onClick={() => navigate("/my-venues")} className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Photo gallery */}
        {venue.photos && venue.photos.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl overflow-hidden shadow-card aspect-[16/10] relative bg-secondary">
              <img src={venue.photos[0]} alt={venue.name} className="w-full h-full object-cover" />
              {venue.photos.length > 1 && (
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {venue.photos.slice(1, 5).map((url, i) => (
                    <div key={i} className="h-12 w-12 rounded-lg overflow-hidden border-2 border-white/80 shadow-md">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {venue.photos.length > 5 && (
                    <div className="h-12 w-12 rounded-lg bg-black/60 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white/80 shadow-md">
                      +{venue.photos.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 shadow-card bg-gradient-to-br from-primary/5 via-card to-card space-y-3">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Building2 className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-display font-bold text-foreground truncate">{venue.name}</h2>
                <p className="text-sm text-muted-foreground tabular-nums mt-0.5">
                  {venue.court_count} {t("venue.courts")}
                </p>
                {venue.status !== "active" && (
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                    {t(`venue.status.${venue.status === "inactive" ? "inactive" : "pending"}`)}
                  </span>
                )}
              </div>
            </div>
            {venue.status === "active" && user && (
              <Button onClick={() => setBookingOpen(true)} className="w-full gap-2 font-semibold">
                <CalendarPlus className="h-4 w-4" /> {t("booking.cta")}
              </Button>
            )}
          </Card>
        </motion.div>

        <BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} venue={venue} />

        {/* Contact + Location */}
        {(venue.location || venue.address || venue.contact_phone || venue.map_url) && (
          <Card className="p-4 shadow-card space-y-2.5">
            <h3 className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
              {t("venue.section.info")}
            </h3>
            {(venue.location || venue.address) && (
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  {venue.location && <p>{venue.location}</p>}
                  {venue.address && <p className="text-muted-foreground text-[11px] mt-0.5">{venue.address}</p>}
                </div>
              </div>
            )}
            {venue.map_url && (
              <a
                href={venue.map_url}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-primary transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-primary/70 shrink-0" />
                <span className="text-sm font-medium text-primary">{t("venue.viewOnMap")}</span>
              </a>
            )}
            {venue.contact_phone && (
              <a href={`tel:${venue.contact_phone}`} className="flex items-center gap-2.5 hover:text-primary transition-colors">
                <Phone className="h-4 w-4 text-primary/70 shrink-0" />
                <span className="text-sm font-medium tabular-nums">{venue.contact_phone}</span>
              </a>
            )}
          </Card>
        )}

        {/* Hours */}
        {venue.operating_hours && Object.keys(venue.operating_hours).length > 0 && (() => {
          const todayKey = DAY_KEYS[(new Date().getDay() + 6) % 7]; // JS Sun=0 -> shift Mon=0
          const today = venue.operating_hours[todayKey];
          return (
            <Card className="p-4 shadow-card space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
                  {t("venue.section.hours")}
                </h3>
                <div className="text-[11px] font-semibold inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-primary/70" />
                  {today === null ? (
                    <span className="text-muted-foreground">{t("venue.hours.closedToday")}</span>
                  ) : today ? (
                    <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{today.open} – {today.close}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-0.5">
                {DAY_KEYS.map(d => {
                  const v = venue.operating_hours?.[d];
                  const isToday = d === todayKey;
                  return (
                    <div key={d} className={`flex items-center justify-between text-[11px] px-2 py-1 rounded ${isToday ? "bg-primary/5 font-semibold" : ""}`}>
                      <span className="uppercase text-muted-foreground">{t(`venue.day.${d}`)}</span>
                      <span className="tabular-nums">
                        {v === null ? <span className="text-muted-foreground">{t("venue.hours.closed")}</span>
                          : v ? `${v.open} – ${v.close}`
                          : <span className="text-muted-foreground">—</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })()}

        {/* Pricing */}
        {venue.pricing && (venue.pricing.weekday_hour || venue.pricing.weekend_hour || venue.pricing.full_day) && (
          <Card className="p-4 shadow-card space-y-2.5">
            <h3 className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Coins className="h-3 w-3" /> {t("venue.section.pricing")}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: venue.pricing.weekday_hour, label: t("venue.pricing.weekday"), unit: t("venue.pricing.perHour") },
                { v: venue.pricing.weekend_hour, label: t("venue.pricing.weekend"), unit: t("venue.pricing.perHour") },
                { v: venue.pricing.full_day,     label: t("venue.pricing.fullDay"), unit: t("venue.pricing.perDay") },
              ].filter(p => p.v).map((p, i) => (
                <div key={i} className="rounded-lg bg-secondary/40 border border-border p-2.5 text-center">
                  <p className="text-base font-stat font-bold text-foreground tabular-nums leading-none">{(p.v as number).toLocaleString("vi-VN")}đ</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">{p.label}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{p.unit}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Amenities */}
        {venue.amenities.length > 0 && (
          <Card className="p-4 shadow-card space-y-3">
            <h3 className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
              {t("venue.section.amenities")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {venue.amenities.map(a => {
                const { emoji, label } = amenityLabel(a);
                return (
                  <div key={a} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/40 border border-border">
                    <span className="text-base">{emoji}</span>
                    <span className="text-xs font-medium text-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Activity */}
        <Card className="p-4 shadow-card space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
            {t("venue.section.activity")}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Users,         value: activity.groups_count,      label: t("venue.activity.groups"),      tone: "primary" },
              { icon: Calendar,      value: activity.events_count,      label: t("venue.activity.events"),      tone: "blue" },
              { icon: Trophy,        value: activity.tournaments_count, label: t("venue.activity.tournaments"), tone: "amber" },
              { icon: CalendarClock, value: activity.upcoming_events,   label: t("venue.activity.upcoming"),    tone: "emerald" },
            ].map((s, i) => (
              <div key={i} className="rounded-lg bg-secondary/40 border border-border p-3">
                <s.icon className={`h-4 w-4 mb-1.5 ${
                  s.tone === "primary" ? "text-primary"
                  : s.tone === "blue" ? "text-blue-600 dark:text-blue-400"
                  : s.tone === "amber" ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
                }`} />
                <p className="text-xl font-stat font-bold text-foreground tabular-nums leading-none">{s.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VenueProfilePage;
