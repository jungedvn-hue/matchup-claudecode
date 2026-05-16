import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import type { InvestorBIData } from "@/hooks/useInvestorBI";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

const BIEngagementTab = ({ data }: { data: InvestorBIData }) => {
  const { t } = useLanguage();

  const wauMauPct = data.mau > 0 ? Math.round((data.wau / data.mau) * 100) : 0;

  const dauChart = data.dauSeries.map((d) => ({ label: d.date.slice(5), count: d.count }));

  // Heatmap — find max for color scaling
  const maxHeat = Math.max(1, ...data.density.map((c) => c.count));
  const weekdays = [
    t("investorBI.weekday.mon"),
    t("investorBI.weekday.tue"),
    t("investorBI.weekday.wed"),
    t("investorBI.weekday.thu"),
    t("investorBI.weekday.fri"),
    t("investorBI.weekday.sat"),
    t("investorBI.weekday.sun"),
  ];

  // Peak hours — top 3 hours by total count across all days
  const hourTotals = Array.from({ length: 24 }, (_, h) =>
    data.density.filter((c) => c.hour === h).reduce((s, c) => s + c.count, 0),
  );
  const peakHours = hourTotals
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .filter((p) => p.count > 0);

  return (
    <div className="space-y-3">
      {/* DAU line chart */}
      <Card className="p-3">
        <h3 className="text-xs font-display font-semibold mb-1">{t("investorBI.engagement.dau")}</h3>
        <div className="h-32 -mx-2 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dauChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 8 }} interval={4} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 8 }} width={24} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#dauGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* WAU/MAU + sessions/user + avg daily time */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {t("investorBI.engagement.wauMau")}
          </p>
          <p className="text-xl font-display font-bold mt-1 text-primary">{wauMauPct}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            {t("investorBI.engagement.wau")} {fmt(data.wau)} / {t("investorBI.engagement.mau")} {fmt(data.mau)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {t("investorBI.engagement.sessionsPerUser")}
          </p>
          <p className="text-xl font-display font-bold mt-1 text-primary">{data.sessionsPerActiveUser}</p>
        </Card>
        <Card className="p-3 col-span-2 border-primary/40 bg-primary/5">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {t("investorBI.engagement.avgDailyTime")}
          </p>
          <p className="text-xl font-display font-bold mt-1 text-primary">
            {data.avgDailyMinutes} <span className="text-xs">{t("investorBI.unit.minutes")}</span>
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5 italic">
            {t("investorBI.engagement.avgDailyTimeNote")}
          </p>
        </Card>
      </div>

      {/* Density heatmap */}
      <Card className="p-3">
        <h3 className="text-xs font-display font-semibold mb-1">{t("investorBI.engagement.density")}</h3>
        <p className="text-[10px] text-muted-foreground mb-2">{t("investorBI.engagement.densityNote")}</p>
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="border-separate border-spacing-[1px]">
            <thead>
              <tr>
                <th className="w-7" />
                {Array.from({ length: 24 }).map((_, h) => (
                  <th key={h} className="w-3.5 h-3.5 text-[7px] text-muted-foreground font-normal">
                    {h % 3 === 0 ? h : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekdays.map((day, dIdx) => (
                <tr key={dIdx}>
                  <td className="text-[8px] text-muted-foreground pr-1 text-right font-medium">{day}</td>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const cell = data.density.find((c) => c.day === dIdx && c.hour === h);
                    const intensity = cell ? cell.count / maxHeat : 0;
                    const opacity = intensity > 0 ? 0.15 + intensity * 0.85 : 0.05;
                    return (
                      <td
                        key={h}
                        title={`${day} ${h}:00 — ${cell?.count ?? 0}`}
                        className="w-3.5 h-3.5 rounded-[2px]"
                        style={{ background: `hsl(var(--primary) / ${opacity})` }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {peakHours.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-3">
            {t("investorBI.engagement.peakHours")}:{" "}
            <span className="font-mono text-foreground font-semibold">
              {peakHours.map((p) => `${p.hour}:00`).join(" · ")}
            </span>
          </p>
        )}
      </Card>

      {/* Retention */}
      <Card className="p-3">
        <h3 className="text-xs font-display font-semibold mb-3">{t("investorBI.engagement.retention")}</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { lbl: t("investorBI.engagement.d1"), v: data.retentionD1 },
            { lbl: t("investorBI.engagement.d7"), v: data.retentionD7 },
            { lbl: t("investorBI.engagement.d30"), v: data.retentionD30 },
          ].map((r) => (
            <div key={r.lbl} className="text-center">
              <div className="relative h-16 w-16 mx-auto">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="16" fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="3"
                    strokeDasharray={`${r.v}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-display font-bold">{r.v}%</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">{r.lbl}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default BIEngagementTab;
