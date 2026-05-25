import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card } from "@/components/ui/card";
import RefereeProfilePage from "@/pages/RefereeProfilePage";

const ProfileTab = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">{t("auth.loginRequired")}</Card>;
  }
  return <RefereeProfilePage userIdOverride={user.id} embedded />;
};

export default ProfileTab;
