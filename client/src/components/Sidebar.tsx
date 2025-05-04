import { useLocation, Link } from "wouter";
import { useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar as ShadcnSidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Calendar,
  Settings,
  LogOut,
  User,
  Shield,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function AppSidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  const { theme } = useTheme();
  const { user, logoutMutation } = useAuth();
  const isMobileDevice = useIsMobile();
  
  // Mapping de ícones baseado no Lucide React
  // ao invés de usar os ícones do Material Design
  const navItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: "/leads", label: "Leads", icon: <Users className="h-5 w-5" /> },
    { path: "/agendamentos", label: "Agendamentos", icon: <CalendarDays className="h-5 w-5" /> },
    { path: "/calendario", label: "Calendário", icon: <Calendar className="h-5 w-5" /> },
    { path: "/config", label: "Configurações", icon: <Settings className="h-5 w-5" /> },
  ];
  
  // Hook personalizado do Shadcn UI Sidebar
  const SidebarContent = () => {
    const { state, toggleSidebar } = useSidebar();
    const isExpanded = state === "expanded";
    
    useEffect(() => {
      // Sincronizar o estado do sidebar mobile do Shadcn com o estado do app
      if (isMobileDevice) {
        document.documentElement.classList.toggle('overflow-hidden', open);
      }
    }, [open]);
    
    return (
      <ShadcnSidebar 
        className={`${isExpanded ? 'w-64' : 'w-auto'} ${theme === 'dark' ? 'bg-[#0F0A19] text-white' : 'bg-secondary text-white'} z-30 border-r ${theme === 'dark' ? 'border-primary/40 dark:glow-border' : 'border-secondary-light'}`}
        collapsible="icon"
      >
        <SidebarHeader className="py-4 px-3">
          <div className="flex items-center justify-between w-full">
            {isExpanded ? (
              <div className="font-heading text-xl font-bold tracking-wider dark:glow-text">
                Favale<span className="text-primary">&Pink</span>
              </div>
            ) : (
              <div className="font-heading text-xl font-bold tracking-wider text-center mx-auto dark:glow-text">
                <span className="text-primary">F&P</span>
              </div>
            )}
            
            {!isMobileDevice && (
              <SidebarTrigger 
                className={`${isExpanded ? 'flex' : 'hidden'} p-1.5 rounded-full hover:bg-secondary-light dark:hover:bg-gray-800 transition-colors ml-2`}
              >
                {isExpanded ? <ChevronLeft className="h-4 w-4 text-white" /> : <ChevronRight className="h-4 w-4 text-white" />}
              </SidebarTrigger>
            )}
          </div>
        </SidebarHeader>
        
        <SidebarSeparator className="bg-secondary-light dark:bg-primary/20" />
        
        <div className="px-2 py-2 min-h-0 flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = location === item.path;
              return (
                <Link 
                  key={item.path} 
                  href={item.path} 
                  onClick={() => isMobileDevice && setOpen(false)}
                >
                  <SidebarMenuItem 
                    className={`${isActive ? 'bg-primary dark:glow' : 'hover:bg-secondary-light/50 dark:hover:bg-gray-800/50'} text-white gap-3 my-1 py-2.5 rounded-md transition-all duration-200`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuItem>
                </Link>
              );
            })}
          </SidebarMenu>
        </div>
        
        {user && (
          <SidebarFooter className="mt-auto p-0">
            <SidebarSeparator className="bg-secondary-light dark:bg-primary/20" />
            <div className="p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center w-full ${isExpanded ? 'justify-between' : 'justify-center'} text-white hover:bg-secondary-light/50 dark:hover:bg-gray-800/50 rounded-md p-2.5`}>
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 bg-primary-light">
                        <AvatarFallback className="text-sm font-medium text-white">
                          {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isExpanded && (
                        <span className="ml-3 truncate">{user.username}</span>
                      )}
                    </div>
                    {isExpanded && (
                      <ChevronRight className="h-4 w-4 text-white" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/config" onClick={() => setOpen(false)}>
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Perfil e Configurações</span>
                    </DropdownMenuItem>
                  </Link>
                  {user.role === 'admin' && (
                    <Link href="/config" onClick={() => setOpen(false)}>
                      <DropdownMenuItem>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Segurança</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        )}
      </ShadcnSidebar>
    );
  };
  
  return (
    <>
      {/* Mobile sidebar using Shadcn Sheet component */}
      {isMobileDevice ? (
        <>
          <div 
            className={`fixed inset-0 bg-black/40 z-20 lg:hidden transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div 
            className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <SidebarProvider>
              <SidebarContent />
            </SidebarProvider>
          </div>
        </>
      ) : (
        // Desktop sidebar
        <SidebarProvider>
          <SidebarContent />
        </SidebarProvider>
      )}
    </>
  );
}
