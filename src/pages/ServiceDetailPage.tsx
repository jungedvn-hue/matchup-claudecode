import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Star, Clock, Phone, MessageSquare,
  Wrench, ShoppingBag, Check, Camera, Plus, Calendar,
  ChevronRight, Info, AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { marketplaceServices } from "@/data/marketplace";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

const ServiceDetailPage = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const service = marketplaceServices.find(s => s.id === Number(serviceId));

  const [activeTab, setActiveTab] = useState<"overview" | "book">("overview");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
  const [selectedGrip, setSelectedGrip] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <p className="text-muted-foreground mb-4">Service not found</p>
        <Button onClick={() => navigate("/marketplace")}>Back to Marketplace</Button>
      </div>
    );
  }

  const handleBooking = () => {
    toast({
      title: "Yêu cầu đã được gửi!",
      description: "Cửa hàng sẽ liên hệ với bạn trong vòng 30 phút.",
    });
    setTimeout(() => navigate("/marketplace"), 1000);
  };

  return (
    <div className="pb-24 min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-display font-bold text-foreground truncate">{service.name}</h1>
            <p className="text-[10px] text-muted-foreground">{service.category.toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Top Info Card */}
        <Card className="p-4 shadow-card border-primary/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 blur-sm flex items-center justify-center">
            <span className="text-9xl grayscale">{service.image}</span>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                {service.image}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-display font-bold text-card-foreground line-clamp-1">{service.name}</h2>
                  {service.featured && <Badge className="text-[9px] bg-accent/20 text-accent border-accent/20">Featured</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-accent fill-accent" />{service.rating} ({service.reviews})</span>
                  <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{service.distance}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic">"{service.description}"</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" size="sm" className="rounded-xl gap-2 h-9 text-xs">
                <Phone className="h-3.5 w-3.5" /> Gọi ngay
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl gap-2 h-9 text-xs">
                <MessageSquare className="h-3.5 w-3.5" /> Nhắn tin
              </Button>
            </div>
          </div>
        </Card>

        {/* Dynamic Service Sections */}
        <div className="space-y-6">
          {/* Repair Services Section */}
          {service.repairServices && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h3 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" /> Dịch vụ sửa chữa
              </h3>
              <div className="space-y-2">
                {service.repairServices.map((rs) => (
                  <button
                    key={rs.id}
                    onClick={() => setSelectedService(rs.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      selectedService === rs.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/20"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-card-foreground">{rs.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Phí ước tính: {rs.price.toLocaleString()}đ</p>
                    </div>
                    {selectedService === rs.id && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {selectedService && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground mb-1 block uppercase">Thông tin sản phẩm</label>
                    <Input placeholder="Nhập tên vợt hoặc giày cần sửa..." className="h-9 text-xs rounded-lg" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground mb-1 block uppercase">Mô tả tình trạng</label>
                    <Textarea placeholder="Vợt bị rạn khung, giày hỏng đế..." className="text-xs rounded-lg min-h-[60px]" />
                  </div>
                  <Button variant="outline" className="w-full h-10 rounded-xl gap-2 border-dashed border-muted-foreground/30 text-muted-foreground">
                    <Camera className="h-4 w-4" /> Thêm hình ảnh thực tế
                  </Button>
                </motion.div>
              )}
            </motion.section>
          )}

          {/* Demo Rackets Section */}
          {service.demoRackets && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h3 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" /> Demo Vợt mới
              </h3>
              <div className="grid gap-2.5">
                {service.demoRackets.map((dr) => (
                  <Card
                    key={dr.id}
                    className={`p-3 cursor-pointer transition-all border ${
                      selectedDemo === dr.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"
                    }`}
                    onClick={() => dr.availability === "available" && setSelectedDemo(dr.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-xl">🏓</div>
                        <div>
                          <p className="text-xs font-semibold text-card-foreground">{dr.model}</p>
                          <p className="text-[9px] text-muted-foreground">{dr.brand} · {dr.weight} · Size {dr.gripSize}</p>
                        </div>
                      </div>
                      <Badge variant={dr.availability === "available" ? "outline" : "secondary"} className={`text-[9px] ${dr.availability === "available" ? "text-primary border-primary/30" : "grayscale"}`}>
                        {dr.availability === "available" ? "Sẵn sàng" : "Đã có người mượn"}
                      </Badge>
                    </div>
                    {selectedDemo === dr.id && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pt-3 border-t border-primary/10 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Phí cọc:</p>
                          <p className="text-xs font-bold text-primary">{dr.deposit.toLocaleString()}đ</p>
                        </div>
                        <Button size="sm" className="h-7 text-[10px] rounded-lg">Chọn thời gian mượn</Button>
                      </motion.div>
                    )}
                  </Card>
                ))}
              </div>
            </motion.section>
          )}

          {/* Grip Options Section */}
          {service.gripOptions && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" /> Thay quấn cán (Grip)
                </h3>
              </div>
              <div className="space-y-4">
                {service.gripOptions.map((go) => (
                  <div key={go.id} className="p-3 rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-card-foreground">{go.name} <span className="text-[10px] text-muted-foreground font-normal">by {go.brand}</span></p>
                      <Badge variant="outline" className="text-[9px] text-primary border-primary/30">Free Install</Badge>
                    </div>
                    <div className="flex gap-2.5">
                      {go.colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setSelectedGrip(go.id);
                            setSelectedColor(color);
                          }}
                          className={`h-8 w-8 rounded-lg border-2 transition-all flex items-center justify-center ${
                            selectedGrip === go.id && selectedColor === color ? "border-primary scale-110 shadow-lg" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {selectedGrip === go.id && selectedColor === color && (
                            <Check className={`h-4 w-4 ${color === "white" || color === "#add8e6" ? "text-primary" : "text-white"}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Location & Hours */}
          <section className="bg-secondary/20 p-4 rounded-2xl space-y-3">
             <div className="flex items-start gap-2">
               <Calendar className="h-4 w-4 text-primary mt-0.5" />
               <div className="flex-1">
                 <p className="text-xs font-semibold text-foreground">Giờ hoạt động</p>
                 <p className="text-[11px] text-muted-foreground">{service.hours} · Thứ 2 - Chủ nhật</p>
               </div>
             </div>
             <div className="flex items-start gap-2">
               <Info className="h-4 w-4 text-primary mt-0.5" />
               <div className="flex-1">
                 <p className="text-xs font-semibold text-foreground">Chính sách bảo hành</p>
                 <p className="text-[10px] text-muted-foreground italic leading-relaxed">Cam kết bảo hành mối hàn 3 tháng, căng dây bảo hành 1 tuần. Miễn phí đổi trả vợt demo trong 24h.</p>
               </div>
             </div>
          </section>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-20 left-4 right-4 z-50">
        <Button
          onClick={handleBooking}
          disabled={!selectedService && !selectedDemo && !selectedColor}
          className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold shadow-elevated gap-2 transition-all active:scale-[0.98]"
        >
          {selectedService ? "Đặt lịch sửa chữa ngay" : selectedDemo ? "Xác nhận mượn vợt" : selectedColor ? "Đặt lịch thay Grip" : "Chọn dịch vụ bên trên"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ServiceDetailPage;
