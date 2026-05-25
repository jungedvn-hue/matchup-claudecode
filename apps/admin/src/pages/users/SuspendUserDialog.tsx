import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Modal from "@/components/Modal";
import { suspendUser, type SuspendReasonCode } from "@/lib/admin-users";

const REASON_CODES: SuspendReasonCode[] = [
  "spam", "fraud", "abuse", "tos_violation", "impersonation", "other",
];

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userLabel: string;
}

export default function SuspendUserDialog({ open, onClose, userId, userLabel }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [reasonCode, setReasonCode] = useState<SuspendReasonCode>("tos_violation");
  const [reasonNote, setReasonNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [confirm, setConfirm] = useState("");

  const reset = () => {
    setReasonCode("tos_violation");
    setReasonNote("");
    setExpiresAt("");
    setConfirm("");
  };

  const mut = useMutation({
    mutationFn: () =>
      suspendUser({
        userId,
        reasonCode,
        reasonNote: reasonNote.trim(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    onSuccess: () => {
      toast.success(t("suspend.success"));
      qc.invalidateQueries({ queryKey: ["user-detail", userId] });
      qc.invalidateQueries({ queryKey: ["user-detail-raw", userId] });
      qc.invalidateQueries({ queryKey: ["user-active-suspension", userId] });
      qc.invalidateQueries({ queryKey: ["user-suspensions", userId] });
      reset();
      onClose();
    },
    onError: (e: any) => toast.error(`${t("suspend.error")}: ${e?.message ?? "unknown"}`),
  });

  const canSubmit =
    reasonNote.trim().length > 0 && confirm === "CONFIRM" && !mut.isPending;

  return (
    <Modal
      open={open}
      onClose={() => { if (!mut.isPending) { reset(); onClose(); } }}
      title={`${t("suspend.title")} — ${userLabel}`}
      subtitle={t("suspend.subtitle")}
      footer={
        <>
          <button onClick={() => { reset(); onClose(); }} disabled={mut.isPending}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50">
            {t("suspend.cancel")}
          </button>
          <button onClick={() => mut.mutate()} disabled={!canSubmit}
            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50">
            {t("suspend.submit")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("suspend.reason_code")}</label>
          <select value={reasonCode} onChange={e => setReasonCode(e.target.value as SuspendReasonCode)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
            {REASON_CODES.map(rc => (
              <option key={rc} value={rc}>{t(`suspend.reason_codes.${rc}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("suspend.reason_note")}</label>
          <textarea value={reasonNote} onChange={e => setReasonNote(e.target.value)} rows={3} required
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("suspend.expiry_label")}</label>
          <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          <p className="text-xs text-slate-500 mt-1">{t("suspend.expiry_help")}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("suspend.confirm_label")}</label>
          <input type="text" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder={t("suspend.confirm_placeholder")}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono" />
        </div>
      </div>
    </Modal>
  );
}
