import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Building2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { CourtBooking } from "@/hooks/useBookings";
import type { Venue } from "@/hooks/useVenues";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: CourtBooking | null;
  venue: Venue | null;
}

const buildVietQRUrl = (bank: string, acc: string, amount: number, note: string) => {
  // https://img.vietqr.io/image/<BANK>-<ACC>-<TEMPLATE>.jpg?amount=...&addInfo=...&accountName=...
  const params = new URLSearchParams();
  if (amount) params.set("amount", String(amount));
  if (note) params.set("addInfo", note);
  return `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(acc)}-compact2.jpg?${params.toString()}`;
};

const BookingPaymentDialog = ({ open, onOpenChange, booking, venue }: Props) => {
  const { t } = useLanguage();
  if (!booking || !venue) return null;

  const hasBank = venue.bank_name && venue.bank_account_number && venue.bank_account_holder;
  const refNote = `MPVN ${booking.id.slice(0, 8).toUpperCase()}`;
  const qrUrl = hasBank ? buildVietQRUrl(venue.bank_name!, venue.bank_account_number!, booking.price_vnd, refNote) : null;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}: ${text}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> {t("payment.title")}</DialogTitle>
          <DialogDescription>{venue.name}</DialogDescription>
        </DialogHeader>

        {!hasBank ? (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px]">
              <p className="font-bold text-amber-700 dark:text-amber-400">{t("payment.noBank")}</p>
              <p className="text-muted-foreground mt-1">{t("payment.noBankDesc")}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-3 flex items-center justify-center">
              <img src={qrUrl!} alt="VietQR" className="w-full max-w-[280px] aspect-square object-contain" />
            </div>

            <div className="rounded-xl bg-secondary/40 border border-border divide-y divide-border/60 overflow-hidden">
              <button onClick={() => copy(venue.bank_name!, t("venue.bank.name"))}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors text-left">
                <span className="text-[11px] text-muted-foreground">{t("venue.bank.name")}</span>
                <span className="text-sm font-bold text-foreground inline-flex items-center gap-1.5">{venue.bank_name} <Copy className="h-3 w-3 opacity-50" /></span>
              </button>
              <button onClick={() => copy(venue.bank_account_number!, t("venue.bank.account"))}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors text-left">
                <span className="text-[11px] text-muted-foreground">{t("venue.bank.account")}</span>
                <span className="text-sm font-bold text-foreground tabular-nums inline-flex items-center gap-1.5">{venue.bank_account_number} <Copy className="h-3 w-3 opacity-50" /></span>
              </button>
              <div className="px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">{t("venue.bank.holder")}</p>
                <p className="text-sm font-bold text-foreground uppercase">{venue.bank_account_holder}</p>
              </div>
              <button onClick={() => copy(String(booking.price_vnd), t("payment.amount"))}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors text-left">
                <span className="text-[11px] text-muted-foreground">{t("payment.amount")}</span>
                <span className="text-sm font-bold text-primary tabular-nums inline-flex items-center gap-1.5">
                  {booking.price_vnd.toLocaleString("vi-VN")}đ <Copy className="h-3 w-3 opacity-50" />
                </span>
              </button>
              <button onClick={() => copy(refNote, t("payment.refNote"))}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors text-left">
                <span className="text-[11px] text-muted-foreground">{t("payment.refNote")}</span>
                <span className="text-sm font-mono font-bold text-foreground inline-flex items-center gap-1.5">{refNote} <Copy className="h-3 w-3 opacity-50" /></span>
              </button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground px-2">
              {t("payment.flowHint")}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingPaymentDialog;
