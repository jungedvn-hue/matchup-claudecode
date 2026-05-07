import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";

type DeviceStatus = "connected" | "disconnected";

interface Device {
  name: string;
  status: DeviceStatus;
  logo: ReactNode;
  bgColor: string;
}

const AppleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
    <path d="M17.05,20.28c-.96.78-2.1,1.24-3.23,1.24-1.14,0-2.02-.38-2.91-.38-.91,0-1.87.38-2.93.38-1.55,0-3.13-.93-4.14-2.58-1.07-1.74-1.12-4.11-.11-5.83,1.01-1.72,2.71-2.61,4.24-2.61.98,0,1.86.38,2.77.38.89,0,1.82-.38,2.94-.38,1.49,0,3,.88,3.92,2.37-3.08,1.81-2.59,6.04.53,8.41ZM12.03,7.25c-.02-2.13,1.61-3.99,3.64-4.13.1,2.26-1.7,4.35-3.64,4.13Z" />
  </svg>
);

const DEVICES: Device[] = [
  { name: "Apple Watch", status: "connected", logo: <AppleLogo />, bgColor: "#000" },
  {
    name: "Oura Ring",
    status: "disconnected",
    logo: <span className="text-white font-extrabold text-lg">O</span>,
    bgColor: "#e11d48",
  },
  {
    name: "Garmin Connect",
    status: "disconnected",
    logo: <span className="text-white font-extrabold text-[9px]">GARMIN</span>,
    bgColor: "#007cc3",
  },
];

const DevicesTab = () => {
  const { t } = useLanguage();

  return (
    <Card className="p-4 shadow-card">
      <h3 className="text-sm font-display font-bold text-foreground">{t("health.devices.title")}</h3>
      <p className="text-xs text-muted-foreground mb-3">{t("health.devices.subtitle")}</p>

      <div className="space-y-2">
        {DEVICES.map((d) => (
          <DeviceRow key={d.name} device={d} t={t} />
        ))}
      </div>
    </Card>
  );
};

const DeviceRow = ({ device, t }: { device: Device; t: (k: string) => string }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
    <div
      className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: device.bgColor }}
    >
      {device.logo}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-display font-bold text-foreground">{device.name}</p>
      <Badge variant={device.status === "connected" ? "default" : "secondary"} className="mt-0.5 text-[10px]">
        {device.status === "connected" ? t("health.device.connected") : t("health.device.disconnected")}
      </Badge>
    </div>
    <Button size="sm" variant={device.status === "connected" ? "outline" : "default"}>
      {device.status === "connected" ? t("health.device.disconnect") : t("health.device.connect")}
    </Button>
  </div>
);

export default DevicesTab;
