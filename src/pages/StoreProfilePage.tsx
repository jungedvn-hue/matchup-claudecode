import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, MapPin, Phone, Globe, Loader2, Store, Package, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useStore, useCreateBooking, useCreateReview } from "@/hooks/useStores";

const StoreProfilePage = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { store, products, reviews, loading, refetch } = useStore(storeId);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="p-6 text-center max-w-sm">
          <p className="text-sm text-muted-foreground">{t("store.profile.notFound")}</p>
          <Button className="mt-4 w-full" variant="outline" onClick={() => navigate("/marketplace")}>{t("common.back")}</Button>
        </Card>
      </div>
    );
  }

  const isOwner = user?.id === store.owner_user_id;

  return (
    <div className="pb-32 min-h-screen">
      {/* Cover */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10">
        <button onClick={() => navigate(-1)} className="absolute top-3 left-3 h-9 w-9 rounded-xl bg-card/80 backdrop-blur flex items-center justify-center hover:bg-card transition-colors">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
      </div>

      <div className="px-4 -mt-10 max-w-2xl mx-auto">
        {/* Store header card */}
        <Card className="p-4 shadow-card relative">
          <div className="flex items-start gap-3">
            <div className="h-16 w-16 rounded-2xl bg-card border-4 border-card shadow-sm flex items-center justify-center text-2xl shrink-0 overflow-hidden -mt-8 bg-primary/10">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-7 w-7 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-display font-bold text-foreground">{store.name}</h1>
                {store.is_featured && <Badge variant="secondary" className="text-[10px]">⭐ {t("store.profile.featured")}</Badge>}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                {store.avg_rating > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {store.avg_rating.toFixed(1)} ({store.review_count})
                  </span>
                )}
                {store.address && (
                  <span className="flex items-center gap-0.5 truncate"><MapPin className="h-3 w-3" /> {store.address}</span>
                )}
              </div>
              {store.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {store.categories.slice(0, 4).map(c => (
                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{t(`store.cat.${c}`)}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contact actions */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
            {store.phone && (
              <Button asChild variant="outline" size="sm" className="flex-1 h-9 rounded-lg">
                <a href={`tel:${store.phone}`}><Phone className="h-3.5 w-3.5 mr-1.5" /> {t("store.profile.callNow")}</a>
              </Button>
            )}
            {store.website && (
              <Button asChild variant="outline" size="sm" className="flex-1 h-9 rounded-lg">
                <a href={store.website} target="_blank" rel="noreferrer"><Globe className="h-3.5 w-3.5 mr-1.5" /> Web</a>
              </Button>
            )}
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="products" className="mt-5">
          <TabsList className="grid grid-cols-3 w-full h-9">
            <TabsTrigger value="products" className="text-xs">{t("store.profile.products")}</TabsTrigger>
            <TabsTrigger value="about" className="text-xs">{t("store.profile.about")}</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs">
              {t("store.profile.reviews")} {store.review_count > 0 && `(${store.review_count})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-4 space-y-2.5">
            {products.length === 0 ? (
              <Card className="p-8 text-center shadow-card">
                <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("store.empty.products")}</p>
              </Card>
            ) : (
              products.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="p-3.5 shadow-card">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-display font-semibold text-foreground">{p.name}</h3>
                          {p.price_display && <span className="text-xs font-bold text-primary shrink-0">{p.price_display}</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t(`store.cat.${p.category}`)}</p>
                        {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{p.description}</p>}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-4 space-y-3">
            <Card className="p-4 shadow-card">
              {store.description ? (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{store.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">—</p>
              )}
            </Card>
            {(store.address || store.map_url || store.phone || store.email || store.website) && (
              <Card className="p-4 shadow-card space-y-2">
                {store.address && (
                  store.map_url ? (
                    <a href={store.map_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{store.address}</span>
                    </a>
                  ) : (
                    <Row icon={MapPin}>{store.address}</Row>
                  )
                )}
                {!store.address && store.map_url && (
                  <a href={store.map_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("store.viewOnMap")}</span>
                  </a>
                )}
                {store.phone && <Row icon={Phone}>{store.phone}</Row>}
                {store.email && <Row icon={Send}>{store.email}</Row>}
                {store.website && <Row icon={Globe}>{store.website}</Row>}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 space-y-3">
            {!isOwner && user && (
              <Button variant="outline" className="w-full" onClick={() => setReviewOpen(true)}>
                <Star className="h-4 w-4 mr-1.5" /> {t("store.review.write")}
              </Button>
            )}
            {reviews.length === 0 ? (
              <Card className="p-8 text-center shadow-card">
                <Star className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("store.empty.reviews")}</p>
              </Card>
            ) : (
              reviews.map(r => (
                <Card key={r.id} className="p-3.5 shadow-card">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{r.player_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={`h-3 w-3 ${n <= r.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-xs text-muted-foreground leading-relaxed">{r.comment}</p>}
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Book button */}
      {!isOwner && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-3 bg-gradient-to-t from-background via-background to-transparent z-30">
          <div className="max-w-2xl mx-auto">
            <Button size="lg" className="w-full rounded-xl shadow-lg" onClick={() => setBookingOpen(true)}>
              <Send className="h-4 w-4 mr-2" /> {t("store.profile.bookService")}
            </Button>
          </div>
        </div>
      )}

      <BookingDialog
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        storeId={store.id}
        storeName={store.name}
      />
      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        storeId={store.id}
        onSubmitted={refetch}
      />
    </div>
  );
};

const Row = ({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) => (
  <div className="flex items-start gap-2.5 text-xs text-foreground">
    <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
    <span className="break-words">{children}</span>
  </div>
);

// ───────── Booking Dialog ─────────

const BookingDialog = ({ open, onClose, storeId, storeName }: { open: boolean; onClose: () => void; storeId: string; storeName: string }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { submit } = useCreateBooking();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user && open) {
    onClose();
    navigate("/auth");
    return null;
  }

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    const { error } = await submit({
      storeId,
      playerName: name,
      playerPhone: phone || undefined,
      message: message || undefined,
      scheduledDate: date || undefined,
      scheduledTime: time || undefined,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("store.booking.toast.submitted"), description: t("store.booking.toast.submittedDesc") });
    onClose();
    setName(""); setPhone(""); setMessage(""); setDate(""); setTime("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("store.booking.form.title")}</DialogTitle>
          <p className="text-xs text-muted-foreground">{storeName}</p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("store.booking.form.name")} <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("store.booking.form.phone")}</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("store.booking.form.preferredDate")}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("store.booking.form.preferredTime")}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("store.booking.form.message")}</Label>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("store.booking.form.messagePh")} className="resize-none" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("store.booking.form.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ───────── Review Dialog ─────────

const ReviewDialog = ({ open, onClose, storeId, onSubmitted }: { open: boolean; onClose: () => void; storeId: string; onSubmitted: () => void }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { submit } = useCreateReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const playerName = user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Player";
    const { error } = await submit({ storeId, playerName, rating, comment: comment || undefined });
    setSubmitting(false);
    if (error) {
      toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("store.review.toast.submitted") });
    onSubmitted();
    onClose();
    setComment("");
    setRating(5);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("store.review.write")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs">{t("store.review.rating")}</Label>
            <div className="flex items-center gap-1.5 justify-center py-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)} className="active:scale-90 transition-transform">
                  <Star className={`h-8 w-8 ${n <= rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("store.review.comment")}</Label>
            <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("store.review.commentPh")} className="resize-none" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StoreProfilePage;
