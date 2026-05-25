import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Building2, MapPin, Phone, Map as MapIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { useVenueBrowse, AMENITY_OPTIONS } from "@/hooks/useVenues";

const CourtsTab = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const { items, loading } = useVenueBrowse(search);

  const amenityLabel = (id: string) => {
    const opt = AMENITY_OPTIONS.find(o => o.id === id);
    return opt ? `${opt.emoji} ${t(opt.labelKey)}` : id;
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("courtDisc.searchPh")}
          className="pl-9 h-10 rounded-xl"
        />
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground space-y-2">
          <MapIcon className="h-8 w-8 mx-auto text-muted-foreground/30" />
          <p className="font-semibold">{t("courtDisc.empty")}</p>
          <p className="text-[11px]">{t("courtDisc.emptyDesc")}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card
                onClick={() => navigate(`/venue/${v.id}`)}
                className="p-3 shadow-card hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {v.photos && v.photos.length > 0 ? (
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-secondary shrink-0">
                      <img src={v.photos[0]} alt={v.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-bold text-foreground truncate">{v.name}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                      {v.court_count} {t("venue.courts")}
                    </p>
                    {(v.location || v.address) && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{[v.location, v.address].filter(Boolean).join(" · ")}</span>
                      </p>
                    )}
                    {v.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {v.amenities.slice(0, 4).map(a => (
                          <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-foreground">
                            {amenityLabel(a)}
                          </span>
                        ))}
                        {v.amenities.length > 4 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            +{v.amenities.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {v.contact_phone && (
                    <Phone className="h-3.5 w-3.5 text-primary/60 shrink-0 mt-1" />
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourtsTab;
