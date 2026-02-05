import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SecurityProvider } from "@/hooks/usePrivacyMode";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedRouteWithPermission } from "@/components/ProtectedRouteWithPermission";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";

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
import SecretaryCalendarPage from "./pages/Calendar/SecretaryCalendarPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import AIAssistantPage from "./pages/AI/AIAssistantPage";
import ReportsPage from "./pages/Reports/ReportsPage";
 import InstallPage from "./pages/Install/InstallPage";
import NotFound from "./pages/NotFound";

// Create QueryClient outside component to ensure stability
const queryClient = new QueryClient();

// Smart redirect: logged in → dashboard, logged out → login
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? "/dashboard" : "/auth/login"} replace />;
}

// Calendar route - shows different page based on role
function CalendarRouteContent() {
  const { userRole } = useAuth();
  
  // Secretary gets simplified calendar (no clinical data)
  if (userRole === 'secretario') {
    return <SecretaryCalendarPage />;
  }
  
  // Professional gets full calendar
  return <CalendarPage />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected routes - Dashboard uses its own layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Patient routes - using UnifiedLayout */}
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <UnifiedLayout>
              <PatientsPage />
            </UnifiedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <ProtectedRouteWithPermission requiredPermission="canViewSessions" redirectTo="/patients">
            <UnifiedLayout>
              <PatientDetailsPage />
            </UnifiedLayout>
          </ProtectedRouteWithPermission>
        }
      />
      
      {/* Calendar - accessible by both roles but with different content */}
      <Route
        path="/calendar"
        element={
          <ProtectedRouteWithPermission requiredPermission="canManageSchedule" redirectTo="/dashboard">
            <UnifiedLayout>
              <CalendarRouteContent />
            </UnifiedLayout>
          </ProtectedRouteWithPermission>
        }
      />
      
      {/* Sessions - only for professionals */}
      <Route
        path="/sessions"
        element={
          <ProtectedRouteWithPermission requiredPermission="canViewSessions" redirectTo="/dashboard">
            <UnifiedLayout>
              <SessionsPage />
            </UnifiedLayout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/sessions/:id"
        element={
          <ProtectedRouteWithPermission requiredPermission="canViewSessions" redirectTo="/dashboard">
            <UnifiedLayout>
              <SessionDetailPage />
            </UnifiedLayout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/new-session/:patientId"
        element={
          <ProtectedRouteWithPermission requiredPermission="canCreateSessions" redirectTo="/dashboard">
            <UnifiedLayout>
              <NewSessionPage />
            </UnifiedLayout>
          </ProtectedRouteWithPermission>
        }
      />
      
      {/* AI Assistant - only for professionals */}
      <Route
        path="/ai-assistant"
        element={
          <ProtectedRouteWithPermission requiredPermission="canUseAI" redirectTo="/dashboard">
            <UnifiedLayout>
              <AIAssistantPage />
            </UnifiedLayout>
          </ProtectedRouteWithPermission>
        }
      />
      
      {/* Settings - only for professionals */}
      <Route
        path="/settings"
        element={
          <ProtectedRouteWithPermission requiredPermission="canAccessSettings" redirectTo="/dashboard">
            <UnifiedLayout>
              <SettingsPage />
            </UnifiedLayout>
          </ProtectedRouteWithPermission>
        }
      />
      
      {/* Reports - only for professionals */}
      <Route
        path="/reports"
        element={
          <ProtectedRouteWithPermission requiredPermission="canUseAI" redirectTo="/dashboard">
            <UnifiedLayout>
              <ReportsPage />
            </UnifiedLayout>
          </ProtectedRouteWithPermission>
        }
      />

       {/* Install PWA - public route */}
       <Route path="/install" element={<InstallPage />} />
 
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
