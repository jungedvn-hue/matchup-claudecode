import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import type { InvestorBIData } from "@/hooks/useInvestorBI";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

const BIGrowthTab = ({ data }: { data: InvestorBIData }) => {
  const { t } = useLanguage();

  const chartData = data.weeklySignups.map((w) => ({
    label: w.week.slice(5),
    count: w.count,
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {t("investorBI.growth.signups7d")}
          </p>
          <p className="text-xl font-display font-bold mt-1 text-primary">{fmt(data.signups7d)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {t("investorBI.growth.signups30d")}
          </p>
          <p className="text-xl font-display font-bold mt-1 text-primary">{fmt(data.signups30d)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {t("investorBI.growth.signups90d")}
          </p>
          <p className="text-xl font-display font-bold mt-1 text-primary">{fmt(data.signups90d)}</p>
        </Card>
      </div>

      <Card className="p-3">
        <h3 className="text-xs font-display font-semibold mb-1">{t("investorBI.growth.title")}</h3>
        <p className="text-[10px] text-muted-foreground mb-3">{t("investorBI.growth.weeklySignups")}</p>
        <div className="h-44 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 9 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 9 }} width={28} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-3">
        <h3 className="text-xs font-display font-semibold mb-3">{t("investorBI.growth.topCities")}</h3>
        {data.topCities.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">—</p>
        )}
        <div className="space-y-2">
          {data.topCities.map((c) => {
            const pct = data.totalUsers > 0 ? (c.count / data.totalUsers) * 100 : 0;
            const display = c.city === "—" ? t("investorBI.growth.noCity") : c.city;
            return (
              <div key={c.city}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-medium">{display}</span>
                  <span className="font-mono text-muted-foreground">
                    {fmt(c.count)} · {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, pct * 3)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default BIGrowthTab;
