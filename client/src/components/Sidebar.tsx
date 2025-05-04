import { useLocation, Link } from "wouter";
import { useTheme } from "@/context/ThemeContext";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubTrigger,
  SidebarMenuSubContent,
  SidebarMenuSubItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";

export default function CustomSidebar() {
  const [location] = useLocation();
  const { theme } = useTheme();
  const { state } = useSidebar();
  const isExpanded = state === "expanded";
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: "dashboard" },
    { path: "/leads", label: "Leads", icon: "people" },
    { path: "/agendamentos", label: "Agendamentos", icon: "calendar_today" },
    { path: "/campanhas", label: "Campanhas", icon: "campaign" },
    { path: "/configuracoes", label: "Configurações", icon: "settings" },
  ];
  
  return (
    <Sidebar
      className="bg-secondary dark:bg-[#0F0A19] dark:glow-border text-white border-r border-secondary-light dark:border-primary/40"
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-secondary-light dark:border-primary/20">
        <div className="flex items-center justify-between p-2">
          {isExpanded ? (
            <div className="font-heading text-xl font-bold tracking-wider dark:glow-text ml-2">
              Favale<span className="text-primary">&Pink</span>
            </div>
          ) : (
            <div className="font-heading text-xl font-bold tracking-wider text-center mx-auto dark:glow-text">
              <span className="text-primary">F&P</span>
            </div>
          )}
          
          <SidebarTrigger className="p-1 rounded-full hover:bg-secondary-light dark:hover:bg-gray-800 transition-colors">
            <span className="material-icons text-white text-sm">
              {isExpanded ? "chevron_left" : "chevron_right"}
            </span>
          </SidebarTrigger>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                asChild
                data-active={location === item.path}
                className="bg-secondary dark:bg-[#0F0A19] hover:bg-secondary-light/70 text-white
                           data-[active=true]:bg-primary data-[active=true]:dark:glow"
              >
                <Link href={item.path}>
                  <span className="material-icons">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-secondary-light dark:border-primary/20 p-4">
        <div className="text-xs text-center text-white/70">
          © {new Date().getFullYear()} Favale&Pink
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
