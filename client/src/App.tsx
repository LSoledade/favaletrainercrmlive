import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage";
import LeadsPage from "@/pages/LeadsPage";
import AuthPage from "@/pages/AuthPage";
import ConfigPage from "@/pages/ConfigPage";
import SessionsPage from "@/pages/SessionsPage";
import CalendarPage from "@/pages/CalendarPage";
import WhatsappPage from "@/pages/WhatsappPage";
import ReportPage from "@/pages/ReportPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/context/ThemeContext";
import { LeadProvider } from "@/context/LeadContext";
import { WhatsappProvider } from "@/context/WhatsappContext";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/leads" component={LeadsPage} />
      <ProtectedRoute path="/agendamentos" component={SessionsPage} />
      <ProtectedRoute path="/calendario" component={CalendarPage} />
      <ProtectedRoute path="/whatsapp" component={WhatsappPage} />
      <ProtectedRoute path="/config" component={ConfigPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isAuthPage = location === "/auth";
  
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <LeadProvider>
            <WhatsappProvider>
              {isAuthPage ? (
                <Router />
              ) : (
                <Layout>
                  <Router />
                </Layout>
              )}
              <Toaster />
            </WhatsappProvider>
          </LeadProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
