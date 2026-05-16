import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, Plus, Trash2, ChevronDown, ChevronUp, Wand2,
  Download, TrendingUp, TrendingDown, Wallet, CheckCircle2,
  DollarSign, LayoutTemplate, RefreshCw, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Tournament } from "@/lib/tournament/types";
import {
  type TournamentBudget, type BudgetItem, type BudgetCategory, type Currency, type TemplateSize,
  CATEGORY_META, BUDGET_TEMPLATES,
  getTotalRevenue, getTotalExpense, getProfitLoss, getPaidAmount, getItemTotal,
  formatMoney, createEmptyBudget, loadBudget, saveBudget, smartEstimate,
} from "@/lib/tournament/budget";

interface TourBudgetTabProps {
  tournament: Tournament;
}

const TourBudgetTab = ({ tournament }: TourBudgetTabProps) => {
  const { t } = useLanguage();
  const [budget, setBudget] = useState<TournamentBudget>(() =>
    loadBudget(tournament.id) ?? createEmptyBudget(tournament.id)
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["venue"]));
  const [showTemplates, setShowTemplates] = useState(false);
  const [addingCategory, setAddingCategory] = useState<BudgetCategory | null>(null);
  const [newItem, setNewItem] = useState({ description: "", unit: "", quantity: 1, unitPrice: 0, notes: "" });

  // Auto-save on change
  useEffect(() => {
    saveBudget(budget);
  }, [budget]);

  const totalRevenue = getTotalRevenue(budget);
  const totalExpense = getTotalExpense(budget);
  const profitLoss = getProfitLoss(budget);
  const paidAmount = getPaidAmount(budget);
  const paidPercent = totalExpense > 0 ? Math.round((paidAmount / totalExpense) * 100) : 0;
  const isProfit = profitLoss >= 0;

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const updateRevenue = (field: keyof typeof budget.revenue, value: number | string) => {
    setBudget(prev => ({
      ...prev,
      revenue: { ...prev.revenue, [field]: value }
    }));
  };

  const addItem = (category: BudgetCategory) => {
    if (!newItem.description) { toast.error(t("budget.toast.descRequired")); return; }
    const item: BudgetItem = {
      id: `item-${Date.now()}`,
      category,
      description: newItem.description,
      unit: newItem.unit || t("budget.unit.times"),
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      currency: budget.currency,
      isPaid: false,
      notes: newItem.notes,
    };
    setBudget(prev => ({ ...prev, items: [...prev.items, item] }));
    setNewItem({ description: "", unit: "", quantity: 1, unitPrice: 0, notes: "" });
    setAddingCategory(null);
    toast.success(t("budget.toast.itemAdded"));
  };

  const removeItem = (id: string) => {
    setBudget(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const togglePaid = (id: string) => {
    setBudget(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === id ? { ...i, isPaid: !i.isPaid } : i)
    }));
  };

  const applyTemplate = (size: TemplateSize) => {
    const tpl = BUDGET_TEMPLATES[size];
    const items: BudgetItem[] = tpl.items.map((item, idx) => ({
      ...item,
      id: `tpl-${size}-${idx}`,
      isPaid: false,
    }));
    setBudget(prev => ({
      ...prev,
      currency: tpl.revenue.currency,
      revenue: tpl.revenue,
      items,
    }));
    setShowTemplates(false);
    toast.success(t("budget.toast.templateApplied", { name: t(tpl.nameKey) }));
  };

  const applySmartEstimate = () => {
    const estimates = smartEstimate(
      budget.revenue.estimatedParticipants || tournament.categories.reduce((s, c) => s + c.entries.length, 0),
      tournament.courtsAvailable || 4,
      tournament.matchDuration || 20,
      budget.currency
    );
    const newItems: BudgetItem[] = estimates.map((e, idx) => ({
      ...e as any,
      id: `smart-${Date.now()}-${idx}`,
      isPaid: false,
    }));
    setBudget(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
    toast.success(t("budget.toast.smartEstimateDone"));
  };

  const setCurrency = (c: Currency) => {
    setBudget(prev => ({ ...prev, currency: c, revenue: { ...prev.revenue, currency: c } }));
  };

  // Group items by category
  const itemsByCategory = Object.keys(CATEGORY_META).reduce((acc, cat) => {
    acc[cat as BudgetCategory] = budget.items.filter(i => i.category === cat);
    return acc;
  }, {} as Record<BudgetCategory, BudgetItem[]>);

  return (
    <div className="space-y-4 pb-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="text-base font-display font-bold">{t("budget.title")}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-lg gap-1.5 text-xs" onClick={() => setShowTemplates(!showTemplates)}>
            <LayoutTemplate className="h-3.5 w-3.5" /> {t("budget.templates")}
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg gap-1.5 text-xs" onClick={applySmartEstimate}>
            <Wand2 className="h-3.5 w-3.5 text-primary" /> {t("budget.smartEstimate")}
          </Button>
        </div>
      </div>

      {/* Templates Panel */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-primary" /> {t("budget.chooseTemplate")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 grid grid-cols-3 gap-2">
                {(["small", "medium", "large"] as TemplateSize[]).map(size => {
                  const tpl = BUDGET_TEMPLATES[size];
                  return (
                    <button key={size} onClick={() => applyTemplate(size)}
                      className="text-left p-3 rounded-xl border border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5 transition-all space-y-1">
                      <p className="font-bold text-sm text-foreground">{t(tpl.nameKey)}</p>
                      <p className="text-[11px] text-muted-foreground">{t(tpl.participantRangeKey)}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{t(tpl.descriptionKey)}</p>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">{t("budget.totalRevenue")}</span>
          </div>
          <p className="text-lg font-display font-bold text-primary dark:text-primary">
            {formatMoney(totalRevenue, budget.currency)}
          </p>
        </Card>
        <Card className="p-3 bg-rose-500/5 border-rose-500/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-rose-500" />
            <span className="text-xs font-medium text-muted-foreground">{t("budget.totalExpense")}</span>
          </div>
          <p className="text-lg font-display font-bold text-rose-600 dark:text-rose-400">
            {formatMoney(totalExpense, budget.currency)}
          </p>
        </Card>
        <Card className={`p-3 col-span-2 ${isProfit ? "bg-blue-500/5 border-blue-500/20" : "bg-orange-500/5 border-orange-500/20"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className={`h-4 w-4 ${isProfit ? "text-blue-500" : "text-orange-500"}`} />
              <span className="text-sm font-bold text-foreground">{isProfit ? t("budget.profitExpected") : t("budget.lossExpected")}</span>
            </div>
            <p className={`text-lg font-display font-bold ${isProfit ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>
              {isProfit ? "+" : ""}{formatMoney(profitLoss, budget.currency)}
            </p>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> {t("budget.paid")}</span>
              <span>{paidPercent}% ({formatMoney(paidAmount, budget.currency)})</span>
            </div>
            <Progress value={paidPercent} className="h-1.5" />
          </div>
        </Card>
      </div>

      {/* Currency & Revenue Config */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> {t("budget.revenueConfig")}
            </CardTitle>
            <Select value={budget.currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="w-24 h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VND">🇻🇳 VND</SelectItem>
                <SelectItem value="USD">🇺🇸 USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("budget.entryFee")}</Label>
              <Input type="number" className="h-9 rounded-lg text-sm"
                value={budget.revenue.entryFeePerPerson || ""}
                onChange={e => updateRevenue("entryFeePerPerson", parseFloat(e.target.value) || 0)}
                placeholder={budget.currency === "VND" ? "200,000" : "8"} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("budget.estimatedParticipants")}</Label>
              <Input type="number" className="h-9 rounded-lg text-sm"
                value={budget.revenue.estimatedParticipants || ""}
                onChange={e => updateRevenue("estimatedParticipants", parseInt(e.target.value) || 0)}
                placeholder="64" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("budget.sponsorship")}</Label>
            <Input type="number" className="h-9 rounded-lg text-sm"
              value={budget.revenue.sponsorship || ""}
              onChange={e => updateRevenue("sponsorship", parseFloat(e.target.value) || 0)}
              placeholder={budget.currency === "VND" ? "5,000,000" : "200"} />
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-xs font-medium text-muted-foreground">{t("budget.totalRevenueExpected")}</span>
            <span className="text-sm font-bold text-primary">{formatMoney(totalRevenue, budget.currency)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Expense Categories */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground px-1">{t("budget.expensesByCategory")}</p>
        {(Object.keys(CATEGORY_META) as BudgetCategory[]).map(cat => {
          const meta = CATEGORY_META[cat];
          const items = itemsByCategory[cat];
          const catTotal = items.reduce((s, i) => s + getItemTotal(i), 0);
          const isExpanded = expandedCategories.has(cat);
          const isAdding = addingCategory === cat;

          return (
            <Card key={cat} className="overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
                onClick={() => toggleCategory(cat)}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{meta.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{t(meta.labelKey)}</span>
                  {items.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{items.length}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {catTotal > 0 && (
                    <span className="text-xs font-semibold text-foreground">
                      {formatMoney(catTotal, budget.currency)}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                    className="overflow-hidden border-t border-border/50">
                    <div className="px-4 py-3 space-y-2">
                      {/* Existing items */}
                      {items.map(item => (
                        <div key={item.id} className={`flex items-center gap-2 p-2.5 rounded-lg border ${item.isPaid ? "bg-primary/5 border-primary/20" : "bg-secondary/40 border-transparent"}`}>
                          <Switch checked={item.isPaid} onCheckedChange={() => togglePaid(item.id)} className="scale-75" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{item.description}</p>
                            <p className="text-[10px] text-muted-foreground">{item.quantity} {item.unit} × {formatMoney(item.unitPrice, item.currency)}</p>
                          </div>
                          <span className="text-xs font-bold shrink-0">{formatMoney(getItemTotal(item), item.currency)}</span>
                          <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Add new item form */}
                      <AnimatePresence>
                        {isAdding && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                            <Input placeholder={t("budget.descPlaceholder")} className="h-8 text-xs rounded-lg"
                              value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} />
                            <div className="grid grid-cols-3 gap-2">
                              <Input placeholder={t("budget.unit")} className="h-8 text-xs rounded-lg"
                                value={newItem.unit} onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))} />
                              <Input type="number" placeholder={t("budget.qty")} className="h-8 text-xs rounded-lg"
                                value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))} />
                              <Input type="number" placeholder={t("budget.unitPrice")} className="h-8 text-xs rounded-lg"
                                value={newItem.unitPrice || ""} onChange={e => setNewItem(p => ({ ...p, unitPrice: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            {newItem.quantity > 0 && newItem.unitPrice > 0 && (
                              <p className="text-xs text-center font-semibold text-primary">
                                = {formatMoney(newItem.quantity * newItem.unitPrice, budget.currency)}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 h-8 rounded-lg text-xs" onClick={() => addItem(cat)}>{t("budget.add")}</Button>
                              <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => setAddingCategory(null)}>{t("budget.cancel")}</Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!isAdding && (
                        <button onClick={() => setAddingCategory(cat)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 transition-colors">
                          <Plus className="h-3.5 w-3.5" /> {t("budget.addExpense")}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {/* Bottom info */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border/40">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground">{t("budget.bottomInfo")}</p>
      </div>
    </div>
  );
};

export default TourBudgetTab;
