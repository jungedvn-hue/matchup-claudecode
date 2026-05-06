import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GroupReview } from "@/data/groups";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

interface GroupRatingProps {
  groupName: string;
  avgRating: number;
  totalReviews: number;
  reviews: GroupReview[];
  canRate: boolean; // only members can rate
}

const StarDisplay = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
  const sizeClass = size === "md" ? "h-4 w-4" : "h-3 w-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= Math.round(rating)
              ? "fill-accent text-accent"
              : star - 0.5 <= rating
              ? "fill-accent/50 text-accent"
              : "text-muted-foreground/20"
          }`}
        />
      ))}
    </div>
  );
};

export { StarDisplay };

const GroupRating = ({ groupName, avgRating, totalReviews, reviews, canRate }: GroupRatingProps) => {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (userRating === 0) return;
    setSubmitted(true);
    setShowForm(false);
    toast({
      title: t("rating.thanks"),
      description: t("rating.thanksDesc").replace("{name}", groupName).replace("{rating}", String(userRating)),
    });
  };

  const displayRating = hoverRating || userRating;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-semibold text-foreground">{t("rating.title")}</h3>
        {canRate && !submitted && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-[10px] text-primary font-medium"
          >
            {showForm ? t("common.cancel") : t("rating.write")}
          </button>
        )}
      </div>

      <Card className="p-4 shadow-card">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-foreground">{avgRating.toFixed(1)}</p>
            <StarDisplay rating={avgRating} size="md" />
            <p className="text-[10px] text-muted-foreground mt-1">{totalReviews} {t("rating.totalReviews")}</p>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => r.rating === star).length;
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-3">{star}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Rating Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-4 shadow-card space-y-3 border-primary/20">
              <p className="text-xs font-medium text-foreground">{t("rating.experience")}</p>
              <div className="flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setUserRating(star)}
                    className="transition-transform hover:scale-110 p-0.5"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= displayRating
                          ? "fill-accent text-accent"
                          : "text-muted-foreground/20"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {displayRating > 0 && (
                <motion.p
                  key={displayRating}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-center font-medium text-accent"
                >
                  {t(`rating.label.${displayRating}`)}
                </motion.p>
              )}
              <Textarea
                placeholder={t("rating.commentPh")}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="rounded-xl text-xs min-h-[60px] resize-none"
              />
              <Button
                onClick={handleSubmit}
                disabled={userRating === 0}
                className="w-full rounded-xl gap-1.5"
                size="sm"
              >
                <Send className="h-3.5 w-3.5" /> {t("rating.send")}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Reviews */}
      {reviews.length > 0 && (
        <div className="space-y-2">
          {reviews.slice(0, 3).map((review) => (
            <Card key={review.id} className="p-3 shadow-card">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-sm shrink-0">
                  {review.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-card-foreground">{review.userName}</p>
                    <p className="text-[9px] text-muted-foreground">{review.date}</p>
                  </div>
                  <StarDisplay rating={review.rating} />
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{review.comment}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupRating;
