
import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { SidebarInset } from "./ui/sidebar";
import { Settings, Home, Users, Calendar, Campaign } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";

export default function Layout() {
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className={`min-h-screen bg-background ${theme}`}>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar variant="sidebar" collapsible="icon">
            <SidebarHeader>
              <div className="flex items-center p-2">
                <div className="font-heading text-xl font-bold tracking-wider dark:text-primary-foreground">
                  Favale<span className="text-primary">&Pink</span>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Link to="/">
                    <SidebarMenuButton 
                      isActive={location.pathname === "/"} 
                      tooltip="Dashboard"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link to="/leads">
                    <SidebarMenuButton 
                      isActive={location.pathname === "/leads"} 
                      tooltip="Leads"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>Leads</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link to="/agendamentos">
                    <SidebarMenuButton 
                      isActive={location.pathname === "/agendamentos"} 
                      tooltip="Agendamentos"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Agendamentos</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link to="/campanhas">
                    <SidebarMenuButton 
                      isActive={location.pathname === "/campanhas"} 
                      tooltip="Campanhas"
                    >
                      <Campaign className="mr-2 h-4 w-4" />
                      <span>Campanhas</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link to="/configuracoes">
                    <SidebarMenuButton 
                      isActive={location.pathname === "/configuracoes"} 
                      tooltip="Configurações"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              <div className="px-3 py-2 text-xs text-muted-foreground">
                © 2024 Favale & Pink
              </div>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <Header setSidebarOpen={setSidebarOpen} />
            <div className="p-4 md:p-6 overflow-auto h-[calc(100vh-64px)]">
              <Outlet />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
