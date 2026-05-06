import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { AppRole } from "@/hooks/use-roles";
import { Loader2 } from "lucide-react";

type ApplicableRole = Exclude<AppRole, "master" | "player">;

const ROLE_LABELS: Record<ApplicableRole, { title: string; desc: string; needsBusiness: boolean }> = {
  host: {
    title: "Đăng ký làm Social Host",
    desc: "Tổ chức giải đấu, mời trọng tài, quản lý event.",
    needsBusiness: false,
  },
  court_owner: {
    title: "Đăng ký làm Court Owner",
    desc: "Quản lý sân, cho thuê, đặt lịch.",
    needsBusiness: true,
  },
  store_owner: {
    title: "Đăng ký làm Store Owner",
    desc: "Bán dụng cụ, phụ kiện pickleball.",
    needsBusiness: true,
  },
  referee: {
    title: "Đăng ký làm Verified Referee",
    desc: "Trở thành trọng tài chính thức, được host mời từ pool hệ thống.",
    needsBusiness: false,
  },
};

interface Props {
  role: ApplicableRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

const ApplyRoleDialog: React.FC<Props> = ({ role, open, onOpenChange, onSubmitted }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!role) return null;
  const meta = ROLE_LABELS[role];

  const reset = () => {
    setReason("");
    setBusinessName("");
    setTaxId("");
    setAddress("");
  };

  const submit = async () => {
    if (!user) return;
    if (reason.trim().length < 10) {
      toast({ title: "Lý do quá ngắn", description: "Vui lòng mô tả ít nhất 10 ký tự.", variant: "destructive" });
      return;
    }
    if (meta.needsBusiness && !businessName.trim()) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng điền tên doanh nghiệp.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const business_info = meta.needsBusiness
      ? { business_name: businessName.trim(), tax_id: taxId.trim(), address: address.trim() }
      : null;

    const { error } = await supabase.from("role_applications").insert({
      user_id: user.id,
      requested_role: role,
      reason: reason.trim(),
      business_info,
    });

    setSubmitting(false);
    if (error) {
      const msg = error.message?.includes("uniq_pending_application")
        ? "Anh đã có đơn đang chờ duyệt cho vai trò này."
        : error.message;
      toast({ title: "Không gửi được", description: msg, variant: "destructive" });
      return;
    }

    toast({ title: "Đã gửi đơn", description: "Master sẽ xét duyệt trong 1-3 ngày." });
    reset();
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reason">Lý do <span className="text-destructive">*</span></Label>
            <Textarea
              id="reason"
              placeholder="Mô tả ngắn về kinh nghiệm, mục đích sử dụng vai trò này..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {meta.needsBusiness && (
            <>
              <div className="space-y-2">
                <Label htmlFor="biz">Tên doanh nghiệp <span className="text-destructive">*</span></Label>
                <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Mã số thuế</Label>
                <Input id="tax" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr">Địa chỉ</Label>
                <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Gửi đơn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyRoleDialog;
