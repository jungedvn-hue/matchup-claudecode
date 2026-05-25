import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Modal from "@/components/Modal";
import { unsuspendUser } from "@/lib/admin-users";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  suspensionId: string;
}

export default function UnsuspendUserDialog({ open, onClose, userId, suspensionId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [liftReason, setLiftReason] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      unsuspendUser({ suspensionId, userId, liftReason: liftReason.trim() }),
    onSuccess: () => {
      toast.success(t("unsuspend.success"));
      qc.invalidateQueries({ queryKey: ["user-detail", userId] });
      qc.invalidateQueries({ queryKey: ["user-suspensions", userId] });
      setLiftReason("");
      onClose();
    },
    onError: (e: any) => toast.error(`${t("unsuspend.error")}: ${e?.message ?? "unknown"}`),
  });

  const canSubmit = liftReason.trim().length > 0 && !mut.isPending;

  return (
    <Modal
      open={open}
      onClose={() => { if (!mut.isPending) onClose(); }}
      title={t("unsuspend.title")}
      subtitle={t("unsuspend.subtitle")}
      footer={
        <>
          <button onClick={onClose} disabled={mut.isPending}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50">
            {t("unsuspend.cancel")}
          </button>
          <button onClick={() => mut.mutate()} disabled={!canSubmit}
            className="px-3 py-1.5 text-sm bg-brand hover:bg-brand-dark text-white rounded disabled:opacity-50">
            {t("unsuspend.submit")}
          </button>
        </>
      }
    >
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t("unsuspend.lift_reason")}</label>
        <textarea value={liftReason} onChange={e => setLiftReason(e.target.value)} rows={3} required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
      </div>
    </Modal>
  );
}
