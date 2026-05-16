import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import type { InvestorBIData } from "@/hooks/useInvestorBI";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Coins, Gift, MousePointerClick, ShoppingBag } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const vnd = (n: number) => `${new Intl.NumberFormat("en-US").format(n)} ₫`;

const BIRevenueTab = ({ data }: { data: InvestorBIData }) => {
  const { t } = useLanguage();

  const trendData = data.coinTrend.map((d) => ({ label: d.date.slice(5), volume: d.volume }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3 border-primary/40 bg-primary/5">
          <div className="flex items-center gap-2">
            <Coins className="h-3.5 w-3.5 text-primary" />
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
              {t("investorBI.revenue.coinVolume30d")}
            </p>
          </div>
          <p className="text-xl font-stat font-bold mt-1 text-primary">{fmt(data.coinVolume30d)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
              {t("investorBI.revenue.coinVolume7d")}
            </p>
          </div>
          <p className="text-xl font-stat font-bold mt-1">{fmt(data.coinVolume7d)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Gift className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
              {t("investorBI.revenue.giftingVolume")}
            </p>
          </div>
          <p className="text-xl font-stat font-bold mt-1">{fmt(data.giftingVolume30d)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
              {t("investorBI.revenue.affiliateClicks")}
            </p>
          </div>
          <p className="text-xl font-stat font-bold mt-1">{fmt(data.affiliateClicks30d)}</p>
        </Card>
        <Card className="p-3 col-span-2 border-primary/40 bg-primary/5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-3.5 w-3.5 text-primary" />
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
              {t("investorBI.revenue.estimatedGMV")}
            </p>
          </div>
          <p className="text-xl font-stat font-bold mt-1 text-primary">{vnd(data.estimatedGMV)}</p>
        </Card>
      </div>

      <Card className="p-3">
        <h3 className="text-xs font-display font-semibold mb-1">{t("investorBI.revenue.coinTrend")}</h3>
        <div className="h-36 -mx-2 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 8 }} interval={4} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 8 }} width={30} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default BIRevenueTab;
