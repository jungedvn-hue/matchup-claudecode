import React, { useState } from "react";
import { motion } from "framer-motion";
import { Ticket, Clock, MapPin, Users, CheckCircle2, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GroupEvent } from "@/data/events";

interface BuyTicketDialogProps {
  event: GroupEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (eventId: string, message?: string) => void;
}

const formatPrice = (price: number) => {
  if (price === 0) return "Miễn phí";
  return price.toLocaleString("vi-VN") + "đ";
};

const BuyTicketDialog = ({ event, open, onOpenChange, onSubmit }: BuyTicketDialogProps) => {
  const [step, setStep] = useState<"info" | "confirm" | "success">("info");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      onSubmit(event!.id, message || undefined);
      setStep("success");
      setLoading(false);
    }, 1000);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("info");
      setMessage("");
    }, 300);
  };

  if (!event) return null;

  const spotsLeft = event.maxSpots - event.bookedSpots;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
        {step === "success" ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-6 text-center space-y-3"
          >
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-display font-bold text-foreground">Đã gửi yêu cầu mua vé!</h3>
            <p className="text-sm text-muted-foreground">
              Host sẽ xem xét và phê duyệt vé của bạn. Bạn sẽ nhận thông báo khi được duyệt.
            </p>
            <div className="bg-secondary rounded-xl p-3 text-left">
              <p className="text-xs font-semibold text-foreground">{event.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{event.date} · {event.time}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">Trạng thái</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                  ⏳ Chờ duyệt
                </span>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full rounded-xl mt-2">
              Đã hiểu
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="h-2 bg-gradient-to-r from-primary to-accent" />
            <div className="p-5 space-y-4">
              <DialogHeader className="space-y-0">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Ticket className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-base font-display font-bold text-foreground text-left">
                      {event.title}
                    </DialogTitle>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Hosted by {event.hostName}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{event.date}</p>
                    <p className="text-[10px] text-muted-foreground">{event.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground truncate">{event.location.split(" - ")[0]}</p>
                    <p className="text-[10px] text-muted-foreground">{event.location.split(" - ")[1]}</p>
                  </div>
                </div>
              </div>

              {/* Ticket Info */}
              <div className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Giá vé</span>
                  <span className={`text-sm font-display font-bold ${event.price === 0 ? "text-primary" : "text-foreground"}`}>
                    {formatPrice(event.price)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Còn trống</span>
                  <span className={`text-xs font-semibold ${spotsLeft <= 3 ? "text-destructive" : "text-foreground"}`}>
                    {spotsLeft}/{event.maxSpots} chỗ
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(event.bookedSpots / event.maxSpots) * 100}%` }}
                  />
                </div>
              </div>

              {step === "confirm" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Lời nhắn cho Host (tùy chọn)</label>
                  <Textarea
                    placeholder="Giới thiệu bản thân hoặc ghi chú gì thêm..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="rounded-xl text-xs min-h-[60px] resize-none"
                    autoFocus
                  />
                </motion.div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={handleClose} className="flex-1 rounded-xl">
                  Hủy
                </Button>
                <Button
                  onClick={() => {
                    if (step === "info") {
                      setStep("confirm");
                    } else {
                      handleSubmit();
                    }
                  }}
                  disabled={loading || spotsLeft === 0}
                  className="flex-1 rounded-xl gap-1.5"
                >
                  {loading ? (
                    "Đang xử lý..."
                  ) : step === "info" ? (
                    <>
                      <Ticket className="h-3.5 w-3.5" /> Mua vé {event.price > 0 ? formatPrice(event.price) : ""}
                    </>
                  ) : (
                    "Xác nhận gửi"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BuyTicketDialog;
