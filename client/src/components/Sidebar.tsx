import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  const { theme } = useTheme();
  const { user, logoutMutation } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Verificar se é mobile ao inicializar
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Itens de navegação padrão
  let navItems = [
    { path: "/", label: "Dashboard", icon: "dashboard" },
    { path: "/leads", label: "Leads", icon: "people" },
    { path: "/agendamentos", label: "Agendamentos", icon: "calendar_today" },
    { path: "/campanhas", label: "Campanhas", icon: "campaign" },
    { path: "/config", label: "Configurações", icon: "settings" },
  ];
  
  // Comentário removido - a seção de segurança agora está dentro da página de configurações
  
  const getNavClasses = (path: string) => {
    const isActive = location === path;
    const baseClasses = "flex items-center text-white transition-all duration-200 rounded-md my-1 mx-1 sm:mx-2";
    return isActive 
      ? `${baseClasses} bg-primary dark:glow ${expanded ? 'px-3 sm:px-5' : 'justify-center'} py-2 sm:py-3`
      : `${baseClasses} hover:bg-secondary-light hover:bg-opacity-70 dark:hover:bg-opacity-30 ${expanded ? 'px-3 sm:px-5' : 'justify-center'} py-2 sm:py-3`;
  };
  
  return (
    <>
      {/* Mobile/Desktop sidebar */}
      <aside 
        className={`${expanded ? 'w-64' : 'w-20'} bg-secondary dark:bg-[#0F0A19] dark:glow-border text-white lg:block flex-shrink-0 fixed lg:relative inset-y-0 left-0 transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-all duration-300 ease-in-out z-30 border-r border-secondary-light dark:border-primary/40 h-full overflow-y-auto`}
      >
        <div className="p-3 sm:p-4 flex items-center justify-between border-b border-secondary-light dark:border-primary/20">
          {expanded ? (
            <div className="font-heading text-lg sm:text-xl font-bold tracking-wider dark:glow-text">
              Favale<span className="text-primary">&Pink</span>
            </div>
          ) : (
            <div className="font-heading text-lg sm:text-xl font-bold tracking-wider text-center mx-auto dark:glow-text">
              <span className="text-primary">F&P</span>
            </div>
          )}
          
          {!isMobile && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-full hover:bg-secondary-light dark:hover:bg-gray-800 transition-colors"
              title={expanded ? "Recolher menu" : "Expandir menu"}
            >
              <span className="material-icons text-white text-sm">
                {expanded ? "chevron_left" : "chevron_right"}
              </span>
            </button>
          )}
        </div>
        
        <nav className="py-2 sm:py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link 
                  href={item.path}
                  onClick={() => setOpen(false)}
                  className={getNavClasses(item.path)}
                >
                  <span className="material-icons text-base sm:text-lg mr-2 sm:mr-3">{item.icon}</span>
                  {expanded && <span className="text-sm sm:text-base">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* User Profile Section */}
        {user && (
          <div className="mt-auto border-t border-secondary-light dark:border-primary/20 p-2 sm:p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center w-full ${expanded ? 'justify-between' : 'justify-center'} text-white hover:bg-secondary-light hover:bg-opacity-70 dark:hover:bg-opacity-30 rounded-md p-1.5 sm:p-2`}>
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 sm:h-8 sm:w-8 bg-primary-light">
                      <AvatarFallback className="text-xs sm:text-sm font-medium text-white dark:text-white">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {expanded && (
                      <span className="ml-2 sm:ml-3 truncate text-sm sm:text-base">{user.username}</span>
                    )}
                  </div>
                  {expanded && (
                    <span className="material-icons text-xs sm:text-sm">expand_more</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 sm:w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/config" onClick={() => setOpen(false)}>
                  <DropdownMenuItem>
                    <User className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-sm">Perfil e Configurações</span>
                  </DropdownMenuItem>
                </Link>
                {user.role === 'admin' && (
                  <Link href="/config" onClick={() => {
                    setOpen(false);
                  }}>
                    <DropdownMenuItem>
                      <Shield className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-sm">Segurança</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                  <LogOut className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-sm">Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>
      
      {/* Background overlay for mobile sidebar */}
      {open && isMobile && (
        <div 
          className="fixed inset-0 bg-black/40 z-20 lg:hidden" 
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
