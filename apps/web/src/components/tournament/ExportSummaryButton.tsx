import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Tournament } from "@/lib/tournament/types";
import TournamentSummarySheet from "./TournamentSummarySheet";
import { exportSummaryAsPDF } from "@/lib/tournament/exportSummary";

type Variant = "default" | "outline" | "ghost" | "secondary";

export default function ExportSummaryButton({
  tournament,
  variant = "outline",
  size = "sm",
  label,
}: {
  tournament: Tournament;
  variant?: Variant;
  size?: "sm" | "default";
  label?: string;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      await exportSummaryAsPDF(sheetRef.current, tournament.name, tournament.date);
      toast.success("Đã xuất PDF");
    } catch (e: any) {
      console.error(e);
      toast.error("Xuất PDF thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={handleExport} disabled={busy} className="gap-1.5">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {label ?? "Xuất thể lệ (PDF)"}
      </Button>
      {/* Off-screen render target for html-to-image capture */}
      <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }} aria-hidden>
        <TournamentSummarySheet ref={sheetRef} tournament={tournament} />
      </div>
    </>
  );
}
