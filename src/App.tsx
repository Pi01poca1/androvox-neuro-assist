import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SecurityProvider } from "@/hooks/usePrivacyMode";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import CalendarPage from "./pages/Calendar/CalendarPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SecurityProvider>
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
                    <AppShell>
                      <DashboardPage />
                    </AppShell>
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
                  <ProtectedRoute>
                    <AppShell>
                      <PatientDetailsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sessions"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <SessionsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sessions/:id"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <SessionDetailPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <CalendarPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-assistant"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <div className="text-center p-8">
                        <h1 className="text-2xl font-bold mb-4">Assistente IA</h1>
                        <p className="text-muted-foreground">Em breve...</p>
                      </div>
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <div className="text-center p-8">
                        <h1 className="text-2xl font-bold mb-4">Configurações</h1>
                        <p className="text-muted-foreground">Em breve...</p>
                      </div>
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              {/* Redirects */}
              <Route path="/" element={<Navigate to="/auth/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SecurityProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
