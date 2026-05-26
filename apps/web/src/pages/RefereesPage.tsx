import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import RefereesTab from "./discover/components/RefereesTab";
import { useLanguage } from "@/i18n/LanguageContext";

const RefereesPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <div className="pb-24 min-h-screen">
      <PageHeader
        title={t("discover.referees")}
        back
        onBack={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
      />
      <div className="px-4 pt-4 max-w-2xl mx-auto">
        <RefereesTab />
      </div>
    </div>
  );
};

export default RefereesPage;
