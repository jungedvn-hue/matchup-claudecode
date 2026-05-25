import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Trophy, Users, Loader2, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SkillBadge from "@/components/SkillBadge";
import FriendButton from "@/components/social/FriendButton";
import GiftPickerDialog from "@/components/GiftPickerDialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as { from: (t: string) => any };

interface PublicProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  skill_level: string | null;
  location: string | null;
  bio: string | null;
  dupr_rating: number | null;
  friend_count: number | null;
}

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [giftOpen, setGiftOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    sb.from("profiles")
      .select("user_id, display_name, avatar_url, skill_level, location, bio, dupr_rating, friend_count")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }: { data: PublicProfile | null }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [userId]);

  // Redirect to /profile if user looks at their own profile
  useEffect(() => {
    if (user && userId && user.id === userId) navigate("/profile", { replace: true });
  }, [user, userId, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-40" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Users className="h-10 w-10 opacity-20" />
      <p className="text-sm">{t("profile.notFound")}</p>
      <button onClick={() => navigate(-1)} className="text-xs text-primary font-medium">{t("common.goBack")}</button>
    </div>
  );

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-display font-bold text-foreground truncate">{profile.display_name ?? t("common.unknown")}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 shadow-card bg-gradient-to-br from-primary/5 via-card to-card">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-display font-bold text-2xl">
                  {(profile.display_name ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-display font-bold text-foreground truncate">{profile.display_name ?? t("common.unknown")}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {profile.skill_level && <SkillBadge level={profile.skill_level as any} />}
                  {profile.location && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />{profile.location}
                    </span>
                  )}
                </div>
                {profile.bio && <p className="text-[13px] text-muted-foreground mt-2.5 leading-relaxed">{profile.bio}</p>}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <FriendButton userId={profile.user_id} className="flex-1" />
              {user && user.id !== profile.user_id && (
                <button
                  onClick={() => setGiftOpen(true)}
                  className="h-10 px-3 rounded-xl bg-pink-500/10 hover:bg-pink-500/15 border border-pink-500/30 text-pink-600 dark:text-pink-400 font-bold text-sm flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Gift className="h-4 w-4" /> {t("gift.send")}
                </button>
              )}
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3.5 shadow-card text-center">
            <Trophy className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <p className="text-base font-stat font-bold tabular-nums">{profile.dupr_rating?.toFixed(2) ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">DUPR</p>
          </Card>
          <Card className="p-3.5 shadow-card text-center">
            <Users className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-base font-display font-bold tabular-nums">{profile.friend_count ?? 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{t("friends.friends")}</p>
          </Card>
        </div>
      </div>

      <GiftPickerDialog
        open={giftOpen}
        onOpenChange={setGiftOpen}
        receiverId={profile.user_id}
        receiverName={profile.display_name ?? t("common.unknown")}
        contextType="profile"
        contextId={profile.user_id}
      />
    </div>
  );
};

export default UserProfilePage;
