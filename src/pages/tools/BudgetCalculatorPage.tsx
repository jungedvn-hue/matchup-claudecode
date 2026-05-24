import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, TrendingUp, TrendingDown, Users, Award, DollarSign, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

interface CostLine { id: string; label: string; amount: number }

const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN");

const BudgetCalculatorPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [players, setPlayers] = useState(32);
  const [entryFee, setEntryFee] = useState(150000);
  const [prizePct, setPrizePct] = useState(40);
  const [sponsorship, setSponsorship] = useState(0);
  const [costs, setCosts] = useState<CostLine[]>([
    { id: uid(), label: t("budget.cost.court"),   amount: 1500000 },
    { id: uid(), label: t("budget.cost.referee"), amount: 800000 },
    { id: uid(), label: t("budget.cost.gear"),    amount: 500000 },
  ]);

  const totals = useMemo(() => {
    const revenue = players * entryFee + sponsorship;
    const prize = Math.round((revenue * prizePct) / 100);
    const operating = costs.reduce((s, c) => s + (Number.isFinite(c.amount) ? c.amount : 0), 0);
    const totalCost = prize + operating;
    const profit = revenue - totalCost;
    const breakEvenFee = players > 0 ? Math.ceil((operating + prize - sponsorship) / players) : 0;
    return { revenue, prize, operating, totalCost, profit, breakEvenFee };
  }, [players, entryFee, prizePct, sponsorship, costs]);

  const addCost = () => setCosts(prev => [...prev, { id: uid(), label: "", amount: 0 }]);
  const updateCost = (id: string, patch: Partial<CostLine>) =>
    setCosts(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  const removeCost = (id: string) => setCosts(prev => prev.filter(c => c.id !== id));

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" /> {t("budget.title")}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{t("budget.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Result summary — sticky-ish hero */}
        <Card className="p-4 shadow-card bg-gradient-to-br from-primary/5 via-card to-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t("budget.revenue")}</p>
              <p className="text-lg font-stat font-bold text-foreground tabular-nums">{fmt(totals.revenue)}đ</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t("budget.totalCost")}</p>
              <p className="text-lg font-stat font-bold text-foreground tabular-nums">{fmt(totals.totalCost)}đ</p>
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {totals.profit >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {totals.profit >= 0 ? t("budget.profit") : t("budget.loss")}
              </p>
            </div>
            <p className={`text-xl font-stat font-bold tabular-nums ${totals.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {totals.profit >= 0 ? "+" : ""}{fmt(totals.profit)}đ
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t("budget.breakEven")}: <span className="font-stat font-semibold text-foreground tabular-nums">{fmt(totals.breakEvenFee)}đ</span> / {t("budget.perPlayer")}
          </p>
        </Card>

        {/* Inputs — Revenue side */}
        <Card className="p-4 shadow-card space-y-3">
          <h2 className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3 w-3" /> {t("budget.section.revenue")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("budget.players")}</Label>
              <Input type="number" min={0} value={players} onChange={e => setPlayers(Math.max(0, +e.target.value || 0))} className="h-9 tabular-nums" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("budget.entryFee")} (đ)</Label>
              <Input type="number" min={0} value={entryFee} onChange={e => setEntryFee(Math.max(0, +e.target.value || 0))} className="h-9 tabular-nums" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("budget.sponsorship")} (đ)</Label>
            <Input type="number" min={0} value={sponsorship} onChange={e => setSponsorship(Math.max(0, +e.target.value || 0))} className="h-9 tabular-nums" />
          </div>
        </Card>

        {/* Inputs — Prize */}
        <Card className="p-4 shadow-card space-y-3">
          <h2 className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Award className="h-3 w-3" /> {t("budget.section.prize")}
          </h2>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <Label className="text-[11px] text-muted-foreground">{t("budget.prizePct")}</Label>
              <span className="text-xs font-stat font-bold text-primary tabular-nums">{prizePct}% · {fmt(totals.prize)}đ</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={prizePct}
              onChange={e => setPrizePct(+e.target.value)}
              className="w-full accent-primary"
            />
          </div>
        </Card>

        {/* Operating costs */}
        <Card className="p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" /> {t("budget.section.cost")} <span className="tabular-nums text-foreground">{fmt(totals.operating)}đ</span>
            </h2>
            <button onClick={addCost} className="h-7 px-2 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/15 inline-flex items-center gap-1">
              <Plus className="h-3 w-3" /> {t("budget.addCost")}
            </button>
          </div>
          <div className="space-y-2">
            {costs.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Input
                  value={c.label} onChange={e => updateCost(c.id, { label: e.target.value })}
                  placeholder={t("budget.costLabelPh")} className="h-9 flex-1"
                />
                <Input
                  type="number" min={0} value={c.amount}
                  onChange={e => updateCost(c.id, { amount: Math.max(0, +e.target.value || 0) })}
                  className="h-9 w-28 tabular-nums" placeholder="0"
                />
                <button onClick={() => removeCost(c.id)} className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {costs.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center py-2">{t("budget.noCost")}</p>
            )}
          </div>
        </Card>

        <p className="text-[10px] text-muted-foreground text-center px-2">
          {t("budget.disclaimer")}
        </p>

        <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>{t("common.back")}</Button>
      </div>
    </div>
  );
};

export default BudgetCalculatorPage;
