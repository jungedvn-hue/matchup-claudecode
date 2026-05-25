import { useMemo, useState } from "react";
import { Building2, Check, ChevronDown, MapPin, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useMyVenues, useVenueBrowse, type Venue } from "@/hooks/useVenues";

interface Props {
  /** Currently selected venue id (or null for custom freeform). */
  value: string | null;
  onChange: (next: { venue_id: string | null; venue?: Venue }) => void;
  placeholder?: string;
  /** Disable changing venue (e.g. read-only mode). */
  disabled?: boolean;
}

const VenuePicker = ({ value, onChange, placeholder, disabled }: Props) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { items: myVenues } = useMyVenues();
  const { items: publicVenues } = useVenueBrowse(search);

  // Combine: my venues first, then public ones I don't own
  const combined = useMemo(() => {
    const seen = new Set(myVenues.map(v => v.id));
    return [
      ...myVenues,
      ...publicVenues.filter(v => !seen.has(v.id) && v.owner_user_id !== user?.id),
    ];
  }, [myVenues, publicVenues, user?.id]);

  const selected = combined.find(v => v.id === value) ?? null;

  const select = (v: Venue | null) => {
    onChange({ venue_id: v?.id ?? null, venue: v ?? undefined });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="w-full h-10 px-3 rounded-xl border border-input bg-background flex items-center gap-2 text-left transition-colors hover:border-primary/40 disabled:opacity-60"
        >
          {selected ? (
            <>
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm">{selected.name}</span>
              {!disabled && (
                <X
                  className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(e) => { e.stopPropagation(); select(null); }}
                />
              )}
            </>
          ) : (
            <>
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm text-muted-foreground">{placeholder ?? t("venuePicker.placeholder")}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <div className="p-2 border-b border-border">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("venuePicker.searchPh")}
            className="h-9 text-sm"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {combined.length === 0 ? (
            <div className="px-3 py-6 text-center text-[11px] text-muted-foreground space-y-1.5">
              <Building2 className="h-5 w-5 mx-auto text-muted-foreground/40" />
              <p>{t("venuePicker.empty")}</p>
            </div>
          ) : (
            <>
              {myVenues.length > 0 && (
                <p className="px-3 pt-1 pb-1 text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {t("venuePicker.mine")}
                </p>
              )}
              {myVenues.map(v => (
                <VenueRow key={v.id} venue={v} active={value === v.id} onSelect={() => select(v)} />
              ))}
              {publicVenues.filter(v => v.owner_user_id !== user?.id).length > 0 && (
                <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {t("venuePicker.others")}
                </p>
              )}
              {publicVenues.filter(v => v.owner_user_id !== user?.id).map(v => (
                <VenueRow key={v.id} venue={v} active={value === v.id} onSelect={() => select(v)} />
              ))}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); navigate("/my-venues"); }}
          className="w-full px-3 py-2.5 border-t border-border text-[11px] font-semibold text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> {t("venuePicker.createNew")}
        </button>
      </PopoverContent>
    </Popover>
  );
};

const VenueRow = ({ venue, active, onSelect }: { venue: Venue; active: boolean; onSelect: () => void }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-secondary/60 transition-colors ${active ? "bg-primary/5" : ""}`}
  >
    <Building2 className="h-3.5 w-3.5 text-primary/70 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground truncate">{venue.name}</p>
      {(venue.location || venue.address) && (
        <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
          <MapPin className="h-2.5 w-2.5" />
          {[venue.location, venue.address].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
    {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
  </button>
);

export default VenuePicker;
