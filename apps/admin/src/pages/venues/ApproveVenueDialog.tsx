import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Modal from "@/components/Modal";
import { approveVenue } from "@/lib/admin-venues";

interface Props {
  open: boolean;
  onClose: () => void;
  venueId: string;
  venueName: string;
  currentCommission: number | null;
}

export default function ApproveVenueDialog({ open, onClose, venueId, venueName, currentCommission }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [commission, setCommission] = useState(currentCommission ?? 0.05);
  const [note, setNote] = useState("");

  const mut = useMutation({
    mutationFn: () => approveVenue(venueId, commission, note.trim() || null),
    onSuccess: () => {
      toast.success(t("approve_venue.success"));
      qc.invalidateQueries({ queryKey: ["admin-venue", venueId] });
      qc.invalidateQueries({ queryKey: ["admin-venues"] });
      setNote("");
      onClose();
    },
    onError: (e: any) => toast.error(`${t("approve_venue.error")}: ${e?.message ?? "unknown"}`),
  });

  const ok = commission >= 0 && commission <= 1 && !mut.isPending;

  return (
    <Modal open={open} onClose={() => !mut.isPending && onClose()}
      title={`${t("approve_venue.title")} — ${venueName}`}
      subtitle={t("approve_venue.subtitle")}
      footer={<>
        <button onClick={onClose} disabled={mut.isPending}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50">
          {t("approve_venue.cancel")}
        </button>
        <button onClick={() => mut.mutate()} disabled={!ok}
          className="px-3 py-1.5 text-sm bg-brand hover:bg-brand-dark text-white rounded disabled:opacity-50">
          {t("approve_venue.submit")}
        </button>
      </>}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("approve_venue.commission_label")}</label>
          <input type="number" step="0.01" min="0" max="1" value={commission}
            onChange={e => setCommission(Number(e.target.value))}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          <p className="text-xs text-slate-500 mt-1">{t("approve_venue.commission_help")}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("approve_venue.note_label")}</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
      </div>
    </Modal>
  );
}
