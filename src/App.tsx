import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { TournamentProvider } from "@/context/TournamentContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import React from "react";
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
import { Button } from "@/components/ui/button";
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

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card p-6 rounded-xl border border-destructive/50 shadow-2xl">
            <h2 className="text-xl font-bold text-destructive mb-2">Đã xảy ra lỗi hệ thống</h2>
            <p className="text-sm text-muted-foreground mb-4">Ứng dụng gặp sự cố bất ngờ. Vui lòng chụp ảnh lỗi này và gửi cho bộ phận hỗ trợ.</p>
            <pre className="bg-muted p-3 rounded-lg text-[10px] overflow-auto max-h-40 mb-4 border border-border">
              {this.state.error?.toString()}
            </pre>
            <Button onClick={() => window.location.reload()} className="w-full">Tải lại trang</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
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
  </ErrorBoundary>
);

export default App;
