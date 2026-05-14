import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, Coins, Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useGiftCatalog, useSendGift, useCoinBalance, formatCoin, type Gift as GiftType } from "@/hooks/useCoin";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  receiverId: string;
  receiverName: string;
  contextType?: "profile" | "group" | "match" | "tournament";
  contextId?: string;
  onSent?: () => void;
}

const GiftPickerDialog = ({ open, onOpenChange, receiverId, receiverName, contextType, contextId, onSent }: Props) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { gifts, loading } = useGiftCatalog();
  const { balance, refetch: refetchBalance } = useCoinBalance();
  const sendGift = useSendGift();
  const [selected, setSelected] = useState<GiftType | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleClose = () => { setSelected(null); setMessage(""); onOpenChange(false); };

  const handleSend = async () => {
    if (!selected) return;
    if ((balance?.balance ?? 0) < selected.coin_cost) {
      toast.error(t("gift.insufficient"));
      return;
    }
    setSending(true);
    const { error } = await sendGift(receiverId, selected.id, message.trim() || null, contextType ?? null, contextId ?? null);
    setSending(false);
    if (error) { toast.error(error); return; }
    toast.success(t("gift.sent", { gift: selected.name, name: receiverName }));
    refetchBalance();
    onSent?.();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-center flex items-center justify-center gap-2">
            <Gift className="h-4 w-4 text-pink-500" /> {t("gift.sendTo", { name: receiverName })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Balance */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10">
            <div className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-foreground">{formatCoin(balance?.balance ?? 0)}</span>
              <span className="text-[10px] text-muted-foreground">{t("wallet.coins")}</span>
            </div>
            <button onClick={() => navigate("/wallet/topup")} className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Plus className="h-3 w-3" /> {t("wallet.topup")}
            </button>
          </div>

          {/* Catalog */}
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary opacity-40" /></div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {gifts.map(g => {
                const canAfford = (balance?.balance ?? 0) >= g.coin_cost;
                const isSelected = selected?.id === g.id;
                return (
                  <motion.button
                    key={g.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected(g)}
                    disabled={!canAfford}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      isSelected ? "border-pink-500 bg-pink-500/10 shadow-md" :
                      canAfford ? "border-border bg-card hover:border-pink-500/40" :
                      "border-border bg-card opacity-40"
                    }`}
                  >
                    <div className="text-2xl">{g.emoji}</div>
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      <Coins className="h-2.5 w-2.5 text-amber-500" />
                      <span className="text-[10px] font-bold text-foreground tabular-nums">{formatCoin(g.coin_cost)}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Message */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("gift.messagePlaceholder")}
            maxLength={140}
            className="w-full h-16 p-2.5 rounded-xl border border-border bg-secondary/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handleClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold">
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSend}
              disabled={!selected || sending}
              className="flex-1 h-10 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
              {selected ? `${formatCoin(selected.coin_cost)}` : t("gift.send")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GiftPickerDialog;
