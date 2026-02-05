import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SecurityProvider } from "@/hooks/usePrivacyMode";
import { ProtectedRoute } from "@/components/ProtectedRoute";
 import { ProtectedRouteWithPermission } from "@/components/ProtectedRouteWithPermission";
import { AppShell } from "@/components/layout/AppShell";

// Auth Pages
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import ForgotPasswordPage from "./pages/Auth/ForgotPasswordPage";

// App Pages
import DashboardPage from "./pages/Dashboard/DashboardPage";
import PatientsPage from "./pages/Patients/PatientsPage";
import PatientDetailsPage from "./pages/Patients/PatientDetailsPage";
import SessionsPage from "./pages/Sessions/SessionsPage";
import SessionDetailPage from "./pages/Sessions/SessionDetailPage";
import NewSessionPage from "./pages/Sessions/NewSessionPage";
import CalendarPage from "./pages/Calendar/CalendarPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import AIAssistantPage from "./pages/AI/AIAssistantPage";
import ReportsPage from "./pages/Reports/ReportsPage";
import NotFound from "./pages/NotFound";

// Create QueryClient outside component to ensure stability
const queryClient = new QueryClient();

// Smart redirect: logged in → dashboard, logged out → login
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? "/dashboard" : "/auth/login"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Patient routes */}
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <AppShell>
              <PatientsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
           <ProtectedRouteWithPermission requiredPermission="canViewSessions" redirectTo="/patients">
            <AppShell>
              <PatientDetailsPage />
            </AppShell>
           </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/sessions"
        element={
           <ProtectedRouteWithPermission requiredPermission="canViewSessions" redirectTo="/dashboard">
            <AppShell>
              <SessionsPage />
            </AppShell>
           </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/sessions/:id"
        element={
           <ProtectedRouteWithPermission requiredPermission="canViewSessions" redirectTo="/dashboard">
            <AppShell>
              <SessionDetailPage />
            </AppShell>
           </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/new-session/:patientId"
        element={
           <ProtectedRouteWithPermission requiredPermission="canCreateSessions" redirectTo="/dashboard">
            <AppShell>
              <NewSessionPage />
            </AppShell>
           </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/calendar"
        element={
           <ProtectedRouteWithPermission requiredPermission="canViewSessions" redirectTo="/dashboard">
            <AppShell>
              <CalendarPage />
            </AppShell>
           </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/ai-assistant"
        element={
           <ProtectedRouteWithPermission requiredPermission="canUseAI" redirectTo="/dashboard">
            <AppShell>
              <AIAssistantPage />
            </AppShell>
           </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/settings"
        element={
           <ProtectedRouteWithPermission requiredPermission="canAccessSettings" redirectTo="/dashboard">
            <AppShell>
              <SettingsPage />
            </AppShell>
           </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/reports"
        element={
           <ProtectedRouteWithPermission requiredPermission="canUseAI" redirectTo="/dashboard">
            <AppShell>
              <ReportsPage />
            </AppShell>
           </ProtectedRouteWithPermission>
        }
      />

      {/* Redirects */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SecurityProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppRoutes />
            </TooltipProvider>
          </SecurityProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
