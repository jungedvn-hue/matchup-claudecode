import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  className?: string;
  children?: React.ReactNode; // extra row below (search bar etc.)
}

const PageHeader = ({ title, back, onBack, right, className, children }: Props) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <div className={cn("sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3", className)}>
      <div className="flex items-center gap-3">
        {(back || onBack) && (
          <button onClick={handleBack} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <h1 className="text-lg font-display font-bold text-foreground flex-1 truncate">{title}</h1>
        {right}
        <NotificationBell />
      </div>
      {children}
    </div>
  );
};

export default PageHeader;
