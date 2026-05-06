import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

const RequireMaster = ({ children }: Props) => {
  const { session, loading, isMaster, rolesLoading } = useAuth();
  const location = useLocation();

  if (loading || rolesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Đang xác thực quyền...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isMaster) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RequireMaster;
