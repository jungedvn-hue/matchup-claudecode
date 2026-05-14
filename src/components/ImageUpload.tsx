import { useRef, useState } from "react";
import { Upload, X, ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

const sb = supabase as unknown as {
  storage: { from: (b: string) => any };
};

interface SingleProps {
  mode: "single";
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  className?: string;
  aspect?: "square" | "wide";
}

interface MultiProps {
  mode: "multi";
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
  className?: string;
}

type Props = SingleProps | MultiProps;

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const ImageUpload = (props: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user) { toast.error(t("upload.signInFirst")); return null; }
    if (file.size > MAX_BYTES) { toast.error(t("upload.tooLarge")); return null; }

    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `${user.id}/${fileName}`;

    const { error } = await sb.storage.from("store-assets").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    if (error) { toast.error(error.message); return null; }

    const { data } = sb.storage.from("store-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      if (props.mode === "single") {
        const url = await uploadFile(files[0]);
        if (url) props.onChange(url);
      } else {
        const max = props.max ?? 8;
        const remaining = max - props.value.length;
        const toUpload = Array.from(files).slice(0, remaining);
        if (toUpload.length === 0) {
          toast.error(t("upload.maxReached", { max }));
          return;
        }
        const urls: string[] = [];
        for (const f of toUpload) {
          const url = await uploadFile(f);
          if (url) urls.push(url);
        }
        if (urls.length > 0) props.onChange([...props.value, ...urls]);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (index: number) => {
    if (props.mode === "single") props.onChange(null);
    else props.onChange(props.value.filter((_, i) => i !== index));
  };

  if (props.mode === "single") {
    const aspectClass = props.aspect === "wide" ? "aspect-[2/1]" : "aspect-square";
    return (
      <div className={props.className}>
        {props.label && <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">{props.label}</p>}
        <div className={`relative ${aspectClass} rounded-xl border-2 border-dashed border-border bg-secondary/30 overflow-hidden flex items-center justify-center group hover:border-primary/40 transition-all`}>
          {props.value ? (
            <>
              <img src={props.value} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeAt(0)}
                className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              ><X className="h-3.5 w-3.5" /></button>
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all opacity-0 hover:opacity-100 flex items-center justify-center text-white text-xs font-bold"
              >{uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("upload.replace")}</button>
            </>
          ) : (
            <button onClick={() => inputRef.current?.click()} disabled={uploading} className="flex flex-col items-center gap-2 text-muted-foreground">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-7 w-7 opacity-40" />}
              <span className="text-xs font-semibold">{t("upload.tap")}</span>
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>
    );
  }

  // multi
  const max = props.max ?? 8;
  return (
    <div className={props.className}>
      {props.label && <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">{props.label} ({props.value.length}/{max})</p>}
      <div className="grid grid-cols-4 gap-2">
        {props.value.map((url, i) => (
          <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removeAt(i)}
              className="absolute top-1 right-1 h-6 w-6 rounded-md bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            ><X className="h-3 w-3" /></button>
          </div>
        ))}
        {props.value.length < max && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 opacity-40" />}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
};

export default ImageUpload;
