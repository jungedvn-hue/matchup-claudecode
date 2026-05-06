import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Clock, X, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-roles";
import ApplyRoleDialog from "@/components/ApplyRoleDialog";

type ApplicableRole = Exclude<AppRole, "master" | "player">;
type Status = "pending" | "approved" | "rejected";

interface Props {
  role: ApplicableRole;
  /** Title shown on the locked card */
  title?: string;
  /** Body shown on the locked card when user has not applied yet */
  description?: string;
  /** Children rendered when role is active (or user is master) */
  children: React.ReactNode;
}

const ROLE_LABEL: Record<ApplicableRole, string> = {
  host: "Social Host",
  court_owner: "Court Owner",
  store_owner: "Store Owner",
};

const FeatureGate: React.FC<Props> = ({ role, title, description, children }) => {
  const navigate = useNavigate();
  const { user, roles, rolesLoading, isMaster } = useAuth();
  const [latest, setLatest] = useState<{ status: Status; reviewer_note: string | null } | null>(null);
  const [appsLoading, setAppsLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);

  const fetchLatest = useCallback(async () => {
    if (!user) {
      setAppsLoading(false);
      return;
    }
    setAppsLoading(true);
    const { data } = await supabase
      .from("role_applications")
      .select("status, reviewer_note")
      .eq("user_id", user.id)
      .eq("requested_role", role)
      .order("created_at", { ascending: false })
      .limit(1);
    setLatest((data?.[0] as { status: Status; reviewer_note: string | null }) ?? null);
    setAppsLoading(false);
  }, [user, role]);

  useEffect(() => { fetchLatest(); }, [fetchLatest]);

  if (rolesLoading || appsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const hasRole = isMaster || roles.includes(role);
  if (hasRole) return <>{children}</>;

  const status = latest?.status ?? null;

  return (
    <div className="px-4 pt-6 min-h-screen">
      <Card className="p-6 text-center space-y-4 max-w-md mx-auto">
        <div className="flex justify-center">
          {status === "pending" ? (
            <div className="h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-500" />
            </div>
          ) : status === "rejected" ? (
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="h-7 w-7 text-destructive" />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-display font-bold">
            {title ?? `Tính năng yêu cầu vai trò ${ROLE_LABEL[role]}`}
          </h2>
          {status === "pending" && (
            <p className="text-sm text-muted-foreground">
              Đơn đăng ký của bạn đang chờ master xét duyệt. Thường mất 1-3 ngày.
            </p>
          )}
          {status === "rejected" && (
            <>
              <p className="text-sm text-muted-foreground">
                Đơn trước đã bị từ chối. Bạn có thể gửi lại đơn mới.
              </p>
              {latest?.reviewer_note && (
                <p className="text-xs p-2 rounded bg-secondary text-left mt-2">
                  <span className="text-muted-foreground">Ghi chú:</span> {latest.reviewer_note}
                </p>
              )}
            </>
          )}
          {status === null && (
            <p className="text-sm text-muted-foreground">
              {description ?? `Hãy đăng ký để mở khoá tính năng dành cho ${ROLE_LABEL[role]}.`}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {(status === null || status === "rejected") && (
            <Button onClick={() => setApplyOpen(true)} className="w-full">
              <ShieldAlert className="h-4 w-4 mr-2" />
              Đăng ký {ROLE_LABEL[role]}
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/")}>
            Về trang chủ
          </Button>
        </div>
      </Card>

      <ApplyRoleDialog
        role={role}
        open={applyOpen}
        onOpenChange={setApplyOpen}
        onSubmitted={fetchLatest}
      />
    </div>
  );
};

export default FeatureGate;
