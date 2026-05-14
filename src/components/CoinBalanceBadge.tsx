import { useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";
import { useCoinBalance, formatCoin } from "@/hooks/useCoin";

interface Props {
  variant?: "compact" | "full";
}

const CoinBalanceBadge = ({ variant = "compact" }: Props) => {
  const navigate = useNavigate();
  const { balance, loading } = useCoinBalance();

  if (loading) return null;

  const value = balance?.balance ?? 0;

  if (variant === "compact") {
    return (
      <button
        onClick={() => navigate("/wallet")}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-foreground active:scale-95 transition-all"
      >
        <Coins className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-bold tabular-nums">{formatCoin(value)}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate("/wallet")}
      className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 active:scale-[0.99] transition-all"
    >
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Coins className="h-4.5 w-4.5 text-amber-500" />
        </div>
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">MatchUp Coin</p>
          <p className="text-base font-display font-bold text-foreground tabular-nums">{formatCoin(value)}</p>
        </div>
      </div>
    </button>
  );
};

export default CoinBalanceBadge;
