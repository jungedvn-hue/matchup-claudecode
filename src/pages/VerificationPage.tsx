import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, XCircle, ShieldCheck, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePendingVerifications, useVerifyMatch, type MatchRecord } from "@/hooks/useMatches";
import { useAuth } from "@/context/AuthContext";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const VerificationPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { matches, loading, refetch } = usePendingVerifications();
  const { verifyMatch, working } = useVerifyMatch();

  const handle = async (m: MatchRecord, action: "confirm" | "dispute") => {
    if (!user) return;
    const role: "opponent" | "referee" = m.opponent_user_id === user.id ? "opponent" : "referee";
    const res = await verifyMatch(m.id, role, action);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(action === "confirm" ? t("verify.toast.confirmed") : t("verify.toast.disputed"), {
      description: action === "confirm" ? t("verify.toast.confirmedDesc") : t("verify.toast.disputedDesc"),
    });
    refetch();
  };

  const renderMatch = (match: MatchRecord, i: number) => {
    if (!user) return null;
    const isMyOpponent = match.opponent_user_id === user.id;
    // From verifier's perspective, the "opponent on the card" is whoever they are NOT
    const otherProfile = isMyOpponent ? match.submitter_profile : match.submitter_profile;
    // verifier sees submitter as the recorder; show their score vs verifier
    const verifierScores: number[] = [];
    const submitterScores: number[] = [];
    for (let s = 1; s <= 5; s++) {
      const sub = (match as unknown as Record<string, number | null>)[`submitter_score_set${s}`];
      const opp = (match as unknown as Record<string, number | null>)[`opponent_score_set${s}`];
      if (sub != null && opp != null) {
        submitterScores.push(sub);
        verifierScores.push(opp);
      }
    }
    // result is from submitter's view; flip if I'm the opponent
    const verifierResult: "won" | "lost" = isMyOpponent
      ? match.result === "won" ? "lost" : "won"
      : match.result;

    return (
      <motion.div key={match.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
        <Card className="p-4 shadow-card overflow-hidden relative">
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
            <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Clock className="h-2.5 w-2.5" /> {isMyOpponent ? t("verify.opponentBadge") : t("verify.refereeBadge")}
            </div>
            <div className="flex gap-1">
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold border ${match.opponent_verified ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-secondary text-muted-foreground border-border"}`}>
                {t("verify.opp")} {match.opponent_verified ? "✓" : ""}
              </span>
              {match.referee_user_id && (
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold border ${match.referee_verified ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-secondary text-muted-foreground border-border"}`}>
                  {t("verify.ref")} {match.referee_verified ? "✓" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4 pr-24">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary">
              {otherProfile?.display_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold truncate">{otherProfile?.display_name || "Unknown"}</h4>
              {match.referee_profile && (
                <p className="text-[10px] text-muted-foreground truncate">
                  Referee: <span className="text-foreground font-semibold">{match.referee_profile.display_name}</span>
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(match.created_at)} · {t(`verify.format.${match.format}`)}</p>
            </div>
          </div>

          <div className="bg-secondary/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-muted-foreground">{t("verify.recordedResult")}</span>
              <span className={`font-bold ${verifierResult === "won" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {verifierResult === "won" ? t("verify.youWin") : t("verify.youLose")}
              </span>
            </div>
            <div className="flex justify-center items-center gap-3 font-display font-black tabular-nums">
              <span className="text-2xl">{verifierScores.join(", ")}</span>
              <span className="text-muted-foreground/40 text-xs">VS</span>
              <span className="text-2xl">{submitterScores.join(", ")}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => handle(match, "confirm")} disabled={working} className="flex-1 rounded-xl gap-2 font-bold">
              <CheckCircle className="h-4 w-4" /> {t("common.confirm")}
            </Button>
            <Button variant="outline" onClick={() => handle(match, "dispute")} disabled={working} className="flex-1 rounded-xl gap-2 font-bold border-destructive/20 text-destructive hover:bg-destructive/10">
              <XCircle className="h-4 w-4" /> {t("verify.dispute")}
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="pb-20 min-h-screen bg-secondary/30">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">{t("verify.title")}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        <Card className="p-4 shadow-card overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-primary">{t("verify.transparencyTitle")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t("verify.transparencyDesc")}</p>
          </div>
        </Card>

        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">{t("verify.pendingTitle")}</h2>

        <div className="space-y-3">
          {loading ? (
            <p className="text-xs text-muted-foreground py-8 text-center">…</p>
          ) : matches.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="h-12 w-12 bg-secondary rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">{t("verify.empty")}</p>
            </div>
          ) : (
            matches.map((m, i) => renderMatch(m, i))
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;
