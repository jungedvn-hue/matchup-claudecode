import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Modal from "@/components/Modal";
import { rejectVenue, suspendVenue } from "@/lib/admin-venues";

interface Props {
  mode: "reject" | "suspend";
  open: boolean;
  onClose: () => void;
  venueId: string;
  venueName: string;
}

export default function RejectOrSuspendDialog({ mode, open, onClose, venueId, venueName }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  const ns = mode === "reject" ? "reject_venue" : "suspend_venue";

  const mut = useMutation({
    mutationFn: () => (mode === "reject" ? rejectVenue : suspendVenue)(venueId, reason.trim()),
    onSuccess: () => {
      toast.success(t(`${ns}.success`));
      qc.invalidateQueries({ queryKey: ["admin-venue", venueId] });
      qc.invalidateQueries({ queryKey: ["admin-venues"] });
      setReason("");
      onClose();
    },
    onError: (e: any) => toast.error(`${t(`${ns}.error`)}: ${e?.message ?? "unknown"}`),
  });

  const ok = reason.trim().length > 0 && !mut.isPending;

  return (
    <Modal open={open} onClose={() => !mut.isPending && onClose()}
      title={`${t(`${ns}.title`)} — ${venueName}`}
      subtitle={t(`${ns}.subtitle`)}
      footer={<>
        <button onClick={onClose} disabled={mut.isPending}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50">
          {t(`${ns}.cancel`)}
        </button>
        <button onClick={() => mut.mutate()} disabled={!ok}
          className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50">
          {t(`${ns}.submit`)}
        </button>
      </>}>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t(`${ns}.reason_label`)}</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
      </div>
    </Modal>
  );
}
