import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage";
import LeadsPage from "@/pages/LeadsPage";
import AuthPage from "@/pages/AuthPage";
import ConfigPage from "@/pages/ConfigPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/context/ThemeContext";
import { LeadProvider } from "@/context/LeadContext";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/leads" component={LeadsPage} />
      <ProtectedRoute path="/config" component={ConfigPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <LeadProvider>
            <Layout>
              <Router />
            </Layout>
            <Toaster />
          </LeadProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
