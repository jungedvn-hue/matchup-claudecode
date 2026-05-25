import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { ArrowLeft, Camera, CheckCircle2, XCircle, Keyboard, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { checkinTicket, type CheckinResult } from "@/hooks/useTickets";
import { toast } from "sonner";

const CheckinScannerPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockRef = useRef(false);

  const [active, setActive] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(tk => tk.stop());
    streamRef.current = null;
    setActive(false);
  };

  const handleToken = async (token: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setSubmitting(true);
    stopCamera();
    const r = await checkinTicket(token);
    setResult(r);
    setSubmitting(false);
    if (r.ok) toast.success(t("checkin.success", { name: r.display_name ?? "" }));
    else toast.error(t(`checkin.err.${r.error ?? "invalid"}`));
    // unlock after a beat so a fresh scan can happen after reset
    setTimeout(() => { lockRef.current = false; }, 500);
  };

  const tick = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || v.readyState !== v.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
    if (code?.data) {
      handleToken(code.data.trim());
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const startCamera = async () => {
    setCamError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      setCamError(e?.message ?? "Camera unavailable");
    }
  };

  useEffect(() => () => stopCamera(), []);

  const submitManual = async () => {
    if (!manualToken.trim()) return;
    await handleToken(manualToken.trim());
    setManualToken("");
  };

  const reset = () => {
    setResult(null);
    lockRef.current = false;
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> {t("checkin.title")}
          </h1>
          <button
            onClick={() => { stopCamera(); setManualMode(m => !m); setResult(null); }}
            className="ml-auto h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={t("checkin.manual")}
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        {!result && !manualMode && (
          <Card className="p-3 shadow-card overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card">
            <div className="aspect-square w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-black relative">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {!active && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
                  <Camera className="h-10 w-10 opacity-60" />
                  <p className="text-xs">{t("checkin.cameraIdle")}</p>
                </div>
              )}
              {active && (
                <div className="absolute inset-8 border-2 border-primary/70 rounded-2xl pointer-events-none animate-pulse" />
              )}
            </div>
            {camError && <p className="text-[11px] text-destructive mt-2 text-center">{camError}</p>}
            <div className="flex gap-2 mt-3">
              {!active ? (
                <Button onClick={startCamera} className="flex-1 rounded-xl">
                  <Camera className="h-4 w-4 mr-1.5" /> {t("checkin.startScan")}
                </Button>
              ) : (
                <Button variant="outline" onClick={stopCamera} className="flex-1 rounded-xl">
                  {t("checkin.stop")}
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">{t("checkin.hint")}</p>
          </Card>
        )}

        {!result && manualMode && (
          <Card className="p-3 shadow-card bg-gradient-to-br from-primary/5 via-card to-card space-y-2">
            <p className="text-xs font-medium text-foreground">{t("checkin.manualHint")}</p>
            <Input value={manualToken} onChange={e => setManualToken(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="font-mono text-xs" />
            <Button onClick={submitManual} disabled={submitting || !manualToken.trim()} className="w-full rounded-xl">
              {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("checkin.submit")}
            </Button>
          </Card>
        )}

        {result && (
          <Card className={`p-5 shadow-card text-center bg-gradient-to-br ${result.ok ? "from-primary/10" : "from-destructive/10"} via-card to-card`}>
            {result.ok ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-2" />
                <p className="text-base font-display font-bold text-foreground">{t("checkin.success", { name: result.display_name ?? "" })}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("checkin.successHint")}</p>
              </>
            ) : (
              <>
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                <p className="text-base font-display font-bold text-foreground">{t(`checkin.err.${result.error ?? "invalid"}`)}</p>
              </>
            )}
            <Button onClick={reset} className="w-full rounded-xl mt-4">
              {t("checkin.next")}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CheckinScannerPage;
