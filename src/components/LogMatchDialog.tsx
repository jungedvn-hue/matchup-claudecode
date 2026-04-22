import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { favoritePartners } from "@/data/profile";
import { Trophy, Target, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface LogMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LogMatchDialog = ({ open, onOpenChange }: LogMatchDialogProps) => {
  const [step, setStep] = useState(1);
  const [opponentId, setOpponentId] = useState("");
  const [refereeId, setRefereeId] = useState("");
  const [set1, setSet1] = useState({ player: "", opponent: "" });
  const [set2, setSet2] = useState({ player: "", opponent: "" });
  const [format, setFormat] = useState("singles");

  const handleNext = () => {
    if (step === 1 && !opponentId) {
      toast({ title: "Chọn đối thủ", description: "Vui lòng chọn người bạn đã đấu cùng.", variant: "destructive" });
      return;
    }
    if (step === 1 && !refereeId) {
      toast({ title: "Chọn trọng tài", description: "Vui lòng chọn một người chơi làm trọng tài.", variant: "destructive" });
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = () => {
    toast({
      title: "Gửi kết quả thành công!",
      description: "Đang chờ đối thủ xác nhận để cập nhật điểm DUPR và XP.",
    });
    onOpenChange(false);
    setStep(1);
  };

  const selectedOpponent = favoritePartners.find(p => p.id === opponentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Ghi nhận trận đấu
          </DialogTitle>
          <DialogDescription>
            Tự tin ghi điểm, nâng hạng DUPR và tích lũy XP.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label>Định dạng</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn định dạng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="singles">Đơn (Singles)</SelectItem>
                    <SelectItem value="doubles">Đôi (Doubles)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Đối thủ</Label>
                <Select value={opponentId} onValueChange={setOpponentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tìm đối thủ trong hội" />
                  </SelectTrigger>
                  <SelectContent>
                    {favoritePartners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Trọng tài (bất kì player nào)</Label>
                <Select value={refereeId} onValueChange={setRefereeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trọng tài" />
                  </SelectTrigger>
                  <SelectContent>
                    {favoritePartners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 py-4"
            >
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl border border-border">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                  {selectedOpponent?.avatar}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Đối thủ</p>
                  <p className="text-sm font-bold">{selectedOpponent?.name}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Set 1</span>
                  <Input 
                    type="number" 
                    placeholder="Bạn" 
                    value={set1.player} 
                    onChange={e => setSet1({...set1, player: e.target.value})}
                    className="text-center font-bold"
                  />
                  <Input 
                    type="number" 
                    placeholder="Đối thủ" 
                    value={set1.opponent} 
                    onChange={e => setSet1({...set1, opponent: e.target.value})}
                    className="text-center font-bold"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Set 2</span>
                  <Input 
                    type="number" 
                    placeholder="Bạn" 
                    value={set2.player} 
                    onChange={e => setSet2({...set2, player: e.target.value})}
                    className="text-center font-bold"
                  />
                  <Input 
                    type="number" 
                    placeholder="Đối thủ" 
                    value={set2.opponent} 
                    onChange={e => setSet2({...set2, opponent: e.target.value})}
                    className="text-center font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-primary/5 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">
                  Kết quả sẽ được gửi tới {selectedOpponent?.name} và trọng tài để xác thực. Điểm DUPR chỉ cập nhật sau khi cả hai hoàn tất xác nhận.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="flex flex-row gap-2 sm:justify-end">
          {step === 2 && (
            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 sm:flex-none">Quay lại</Button>
          )}
          <Button onClick={step === 1 ? handleNext : handleSubmit} className="flex-1 sm:flex-none">
            {step === 1 ? "Tiếp theo" : "Gửi kết quả"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogMatchDialog;
