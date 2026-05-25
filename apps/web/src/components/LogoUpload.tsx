import { useRef, useState } from "react";
import { Camera, Loader2, Store as StoreIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  size?: number; // px
  rounded?: "xl" | "2xl" | "full";
}

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const LogoUpload = ({ value, onChange, size = 80, rounded = "2xl" }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_BYTES) {
      toast({ title: t("auth.toast.error"), description: "Image must be ≤ 2 MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("store-assets").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("store-assets").getPublicUrl(path);
    onChange(pub.publicUrl);
    setUploading(false);
  };

  const onPick = () => inputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  };

  const radius = rounded === "full" ? "rounded-full" : rounded === "xl" ? "rounded-xl" : "rounded-2xl";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onPick}
        disabled={uploading}
        style={{ width: size, height: size }}
        className={`relative ${radius} bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors group shrink-0`}
      >
        {value ? (
          <img src={value} alt="Logo" className="h-full w-full object-cover" />
        ) : (
          <StoreIcon className="h-7 w-7 text-primary" />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
      </button>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-50 text-left"
        >
          {uploading ? "Uploading..." : value ? "Change logo" : "Upload logo"}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        )}
        <p className="text-[10px] text-muted-foreground">PNG/JPG/WebP · ≤ 2 MB</p>
      </div>

      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onFileChange} className="hidden" />
    </div>
  );
};

export default LogoUpload;
