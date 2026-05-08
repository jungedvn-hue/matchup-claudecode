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
import RefereeDashboardPage from "./pages/RefereeDashboardPage";
import MyMatchesPage from "./pages/MyMatchesPage";
import VerificationPage from "./pages/VerificationPage";
import ArenaPage from "./pages/ArenaPage";
import HelpPage from "./pages/HelpPage";
import CheckinScannerPage from "./pages/CheckinScannerPage";
import ServiceDetailPage from "./pages/ServiceDetailPage";
import StoreDashboardPage from "./pages/StoreDashboardPage";
import StoreProductsPage from "./pages/StoreProductsPage";
import StoreBookingsPage from "./pages/StoreBookingsPage";
import StoreProfilePage from "./pages/StoreProfilePage";
import StoreEditPage from "./pages/StoreEditPage";
import HealthHub from "./pages/health-hub/HealthHub";
import NotFound from "./pages/NotFound";

import { useLanguage } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RequireMaster from "@/components/RequireMaster";
import FeatureGate from "@/components/FeatureGate";
import AdminApplicationsPage from "./pages/AdminApplicationsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminTournamentsPage from "./pages/AdminTournamentsPage";
import AdminStatsPage from "./pages/AdminStatsPage";
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
        <Route path="/dashboard" element={<ProtectedRoute><FeatureGate role="host"><HostDashboard /></FeatureGate></ProtectedRoute>} />
        <Route path="/create-tournament" element={<ProtectedRoute><FeatureGate role="host"><CreateTournamentPage /></FeatureGate></ProtectedRoute>} />
        <Route path="/tournament-live" element={<TournamentLivePage />} />
        <Route path="/tournament-live/:tournamentId" element={<TournamentLivePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/store/:storeId" element={<StoreProfilePage />} />
        <Route path="/my-store" element={<ProtectedRoute><FeatureGate role="store_owner"><StoreDashboardPage /></FeatureGate></ProtectedRoute>} />
        <Route path="/my-store/products" element={<ProtectedRoute><FeatureGate role="store_owner"><StoreProductsPage /></FeatureGate></ProtectedRoute>} />
        <Route path="/my-store/bookings" element={<ProtectedRoute><FeatureGate role="store_owner"><StoreBookingsPage /></FeatureGate></ProtectedRoute>} />
        <Route path="/my-store/edit" element={<ProtectedRoute><FeatureGate role="store_owner"><StoreEditPage /></FeatureGate></ProtectedRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/my-tickets" element={<MyTicketsPage />} />
        <Route path="/assistant-checkin" element={<AssistantCheckInPage />} />
        <Route path="/favorite-partners" element={<FavoritePartnersPage />} />
        <Route path="/match-history" element={<MatchHistoryPage />} />
        <Route path="/arena" element={<ProtectedRoute><ArenaPage /></ProtectedRoute>} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/checkin/:eventId" element={<ProtectedRoute><CheckinScannerPage /></ProtectedRoute>} />
        <Route path="/checkin" element={<ProtectedRoute><CheckinScannerPage /></ProtectedRoute>} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/create-event" element={<CreateEventPage />} />
        
        <Route path="/tour-manager" element={<ProtectedRoute><FeatureGate role="host"><TourManagerPage /></FeatureGate></ProtectedRoute>} />
        <Route path="/tour-manager/create" element={<ProtectedRoute><FeatureGate role="host"><TourManagerCreatePage /></FeatureGate></ProtectedRoute>} />
        <Route path="/tour-manager/:tournamentId" element={<ProtectedRoute><FeatureGate role="host"><TourManagerControlPage /></FeatureGate></ProtectedRoute>} />
        <Route path="/referee" element={<ProtectedRoute><RefereeDashboardPage /></ProtectedRoute>} />
        <Route path="/my-matches" element={<ProtectedRoute><MyMatchesPage /></ProtectedRoute>} />
        
        <Route path="/admin/applications" element={<RequireMaster><AdminApplicationsPage /></RequireMaster>} />
        <Route path="/admin/users" element={<RequireMaster><AdminUsersPage /></RequireMaster>} />
        <Route path="/admin/tournaments" element={<RequireMaster><AdminTournamentsPage /></RequireMaster>} />
        <Route path="/admin/stats" element={<RequireMaster><AdminStatsPage /></RequireMaster>} />

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

const ErrorFallback = ({ error, onReload }: { error: Error | null; onReload: () => void }) => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card p-6 rounded-xl border border-destructive/50 shadow-2xl">
        <h2 className="text-xl font-bold text-destructive mb-2">{t("error.title")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("error.desc")}</p>
        <pre className="bg-muted p-3 rounded-lg text-[10px] overflow-auto max-h-40 mb-4 border border-border">
          {error?.toString()}
        </pre>
        <Button onClick={onReload} className="w-full">{t("error.reload")}</Button>
      </div>
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
      return <ErrorFallback error={this.state.error} onReload={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <ErrorBoundary>
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
      </ErrorBoundary>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
