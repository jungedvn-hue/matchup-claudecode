import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AdminAuthProvider } from "@/auth/AdminAuthProvider";
import RequireAdmin from "@/auth/RequireAdmin";
import AdminShell from "@/layout/AdminShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import DashboardPage from "@/pages/DashboardPage";
import UsersListPage from "@/pages/UsersListPage";
import UserDetailPage from "@/pages/users/UserDetailPage";

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

const Stub = ({ k }: { k: string }) => (
  <div className="text-slate-500">Coming soon — <code>{k}</code></div>
);

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={qc}>
      <AdminAuthProvider>
        <BrowserRouter>
          <RequireAdmin>
            <Routes>
              <Route path="/" element={<AdminShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="users" element={<UsersListPage />} />
                <Route path="users/:id" element={<UserDetailPage />} />
                {/* Stub routes for the rest of the nav */}
                {[
                  "venues","bookings","tournaments","groups","marketplace","events",
                  "referees","health","payments","refunds","disputes","reconciliation",
                  "reports","broadcasts","banners","flags","impersonate","audit","settings",
                ].map(k => (
                  <Route key={k} path={k} element={<Stub k={k} />} />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </RequireAdmin>
        </BrowserRouter>
      </AdminAuthProvider>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
