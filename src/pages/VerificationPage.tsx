import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, XCircle, ShieldCheck, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pendingMatches } from "@/data/profile";
import { toast } from "@/hooks/use-toast";

const VerificationPage = () => {
  const navigate = useNavigate();

  const handleVerify = (id: string, status: "confirm" | "dispute") => {
    toast({
      title: status === "confirm" ? "Xác nhận thành công" : "Đã gửi khiếu nại",
      description: status === "confirm" 
        ? "Điểm DUPR và XP của cả hai đã được cập nhật." 
        : "Hệ thống sẽ xem xét lại kết quả này.",
    });
  };

  return (
    <div className="pb-20 min-h-screen bg-secondary/30">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">Xác thực kết quả</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-primary">Tính minh bạch của cộng đồng</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Xác thực kết quả giúp xây dựng bảng xếp hạng DUPR chính xác cho mọi người. Hãy trung thực!
            </p>
          </div>
        </div>

        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Đang chờ xác nhận</h2>

        <div className="space-y-3">
          {pendingMatches.map((match, i) => (
            <motion.div 
              key={match.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-4 shadow-card border-none overflow-hidden relative">
                <div className="absolute top-0 right-0 p-2 flex flex-col gap-1 items-end">
                   <div className="flex items-center gap-1 text-[9px] font-bold text-sport-orange bg-sport-orange/10 px-2 py-0.5 rounded-full border border-sport-orange/20">
                     <Clock className="h-2.5 w-2.5" /> PENDING
                   </div>
                   <div className="flex gap-1">
                     <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold border ${match.opponentVerified ? "bg-primary/20 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border"}`}>
                       OPPONENT {match.opponentVerified ? "✓" : ""}
                     </span>
                     <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold border ${match.refereeVerified ? "bg-primary/20 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border"}`}>
                       REFEREE {match.refereeVerified ? "✓" : ""}
                     </span>
                   </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-2xl">
                    {match.opponentAvatar}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{match.opponent}</h4>
                    <p className="text-[10px] text-muted-foreground">Referee: <span className="text-foreground font-semibold">{match.referee}</span></p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{match.date}</p>
                  </div>
                </div>

                <div className="bg-secondary/50 rounded-xl p-3 mb-4">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-muted-foreground">Kết quả ghi nhận:</span>
                    <span className={`font-bold ${match.result === "won" ? "text-primary" : "text-destructive"}`}>
                      BẠN {match.result === "won" ? "THẮNG" : "THUA"}
                    </span>
                  </div>
                  <div className="flex justify-center items-center gap-4 text-2xl font-display font-black text-foreground">
                    {match.score.split(",")[0].split("-")[0]}
                    <span className="text-muted-foreground/30 text-sm">VS</span>
                    {match.score.split(",")[0].split("-")[1]}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleVerify(match.id, "confirm")} 
                    className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-bold"
                  >
                    <CheckCircle className="h-4 w-4" /> Xác nhận
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleVerify(match.id, "dispute")}
                    className="flex-1 rounded-xl gap-2 font-bold border-destructive/20 text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4" /> Khiếu nại
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
          
          {pendingMatches.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <div className="h-12 w-12 bg-secondary rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Không có trận đấu nào cần xác thực.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;
