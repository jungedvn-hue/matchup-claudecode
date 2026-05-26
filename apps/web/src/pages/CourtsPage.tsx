import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import CourtsTab from "./discover/components/CourtsTab";
import { useLanguage } from "@/i18n/LanguageContext";

const CourtsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <div className="pb-24 min-h-screen">
      <PageHeader
        title={t("discover.courts")}
        back
        onBack={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
      />
      <div className="px-4 pt-4 max-w-2xl mx-auto">
        <CourtsTab />
      </div>
    </div>
  );
};

export default CourtsPage;
