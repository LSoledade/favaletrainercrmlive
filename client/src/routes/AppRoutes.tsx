import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/feedback/toaster"; // UPDATED
import { TooltipProvider } from "@/components/feedback/tooltip"; // UPDATED
import NotFoundPage from "@/routes/NotFoundPage"; // UPDATED
import Layout from "@/components/layout/Layout"; // UPDATED
import DashboardPage from "@/features/dashboard/pages/DashboardPage"; // UPDATED
import LeadsPage from "@/features/leads/pages/LeadsPage"; // UPDATED
import AuthPage from "@/features/auth/pages/AuthPage"; // UPDATED
import ConfigPage from "@/features/settings/pages/ConfigPage"; // UPDATED
import SessionsPage from "@/features/training/pages/SessionsPage"; // UPDATED
import CalendarPage from "@/features/calendar/pages/CalendarPage"; // UPDATED
import WhatsappPage from "@/features/whatsapp/pages/WhatsappPage"; // UPDATED
import WhatsappConfigPage from "@/features/whatsapp/pages/WhatsappConfigPage"; // UPDATED
// ReportPage removed as unused
import TasksPage from "@/features/tasks/pages/TasksPage"; // UPDATED
import TaskDetailsPage from "@/features/tasks/pages/TaskDetailsPage"; // UPDATED
import { FavaleIAPage } from "@/features/favale-ia/pages/FavaleIAPage"; // UPDATED
import ProtectedRoute from "@/routes/ProtectedRoute"; // UPDATED
import { ThemeProvider } from "@/providers/ThemeProvider"; // UPDATED
import { LeadProvider } from "@/context/LeadContext";
import { WhatsappProvider } from "@/context/WhatsappContext";
import { TaskProvider } from "@/context/TaskContext";
import { AuthProvider } from "@/providers/AuthProvider"; // UPDATED
import PrivacyPolicyPage from "@/features/legal/pages/PrivacyPolicyPage"; // UPDATED
import ErrorBoundary from "@/components/feedback/ErrorBoundary"; // UPDATED

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/leads" component={LeadsPage} />
      <ProtectedRoute path="/agendamentos" component={SessionsPage} />
      <ProtectedRoute path="/calendario" component={CalendarPage} />
      <ProtectedRoute path="/whatsapp" component={WhatsappPage} />
      <ProtectedRoute path="/whatsapp/config" component={WhatsappConfigPage} />
      <ProtectedRoute path="/favale-ia" component={FavaleIAPage} />
      <ProtectedRoute path="/tarefas" component={TasksPage} />
      <ProtectedRoute path="/tarefas/:id" component={TaskDetailsPage} />
      <ProtectedRoute path="/config" component={ConfigPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/politica-de-privacidade" component={PrivacyPolicyPage} />
      <Route component={NotFoundPage} /> {/* UPDATED */}
    </Switch>
  );
}

function AppRoutes() { // UPDATED
  const [location] = useLocation();
  const isAuthPage = location === "/auth";

  // ErrorBoundary, ThemeProvider, AuthProvider, and Toaster are now handled in main.tsx
  return (
    <TooltipProvider> {/* TooltipProvider can stay if it's desired per-route-tree */}
      <LeadProvider>
        <WhatsappProvider>
          <TaskProvider>
            {isAuthPage ? (
              <Router />
            ) : (
              <Layout>
                <Router />
              </Layout>
            )}
          </TaskProvider>
        </WhatsappProvider>
      </LeadProvider>
    </TooltipProvider>
  );
}

export default AppRoutes; // UPDATED