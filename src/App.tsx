import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { TournamentProvider } from "@/context/TournamentContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import AIAssistant from "@/components/AIAssistant";
import HomePage from "./pages/HomePage";
import GroupDetailPage from "./pages/GroupDetailPage";
import DiscoverPage from "./pages/DiscoverPage";
import GroupsPage from "./pages/GroupsPage";
import TournamentsPage from "./pages/TournamentsPage";
import HostDashboard from "./pages/HostDashboard";
import ProfilePage from "./pages/ProfilePage";
import MarketplacePage from "./pages/MarketplacePage";
import OnboardingPage from "./pages/OnboardingPage";
import CreateTournamentPage from "./pages/CreateTournamentPage";
import TournamentLivePage from "./pages/TournamentLivePage";
import SettingsPage from "./pages/SettingsPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import AssistantCheckInPage from "./pages/AssistantCheckInPage";
import FavoritePartnersPage from "./pages/FavoritePartnersPage";
import MatchHistoryPage from "./pages/MatchHistoryPage";
import StatisticsPage from "./pages/StatisticsPage";
import EditProfilePage from "./pages/EditProfilePage";
import CreateEventPage from "./pages/CreateEventPage";
import TourManagerPage from "./pages/TourManagerPage";
import TourManagerCreatePage from "./pages/TourManagerCreatePage";
import TourManagerControlPage from "./pages/TourManagerControlPage";
import VerificationPage from "./pages/VerificationPage";
import ServiceDetailPage from "./pages/ServiceDetailPage";
import HealthHub from "./pages/health-hub/HealthHub";
import NotFound from "./pages/NotFound";

import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";

const queryClient = new QueryClient();

const AppShell = () => {
  const location = useLocation();
  const isOnboarding = location.pathname === "/onboarding" || location.pathname === "/login";

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen relative">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/group/:groupId" element={<GroupDetailPage />} />
        <Route path="/tournaments" element={<TournamentsPage />} />
        <Route path="/dashboard" element={<HostDashboard />} />
        <Route path="/create-tournament" element={<CreateTournamentPage />} />
        <Route path="/tournament-live" element={<TournamentLivePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/my-tickets" element={<MyTicketsPage />} />
        <Route path="/assistant-checkin" element={<AssistantCheckInPage />} />
        <Route path="/favorite-partners" element={<FavoritePartnersPage />} />
        <Route path="/match-history" element={<MatchHistoryPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/create-event" element={<CreateEventPage />} />
        
        {/* QA BYPASS: No ProtectedRoute for testing */}
        <Route path="/tour-manager" element={<TourManagerPage />} />
        <Route path="/tour-manager/create" element={<TourManagerCreatePage />} />
        <Route path="/tour-manager/:tournamentId" element={<TourManagerControlPage />} />
        
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/marketplace/service/:serviceId" element={<ServiceDetailPage />} />
        <Route path="/health" element={<HealthHub />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isOnboarding && <AIAssistant />}
      {!isOnboarding && <BottomNav />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TournamentProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppShell />
            </BrowserRouter>
          </TooltipProvider>
        </TournamentProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
