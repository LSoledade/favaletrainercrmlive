import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage";
import LeadsPage from "@/pages/LeadsPage";
import { ThemeProvider } from "@/context/ThemeContext";
import { LeadProvider } from "@/context/LeadContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/leads" component={LeadsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <LeadProvider>
          <Layout>
            <Router />
          </Layout>
          <Toaster />
        </LeadProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
