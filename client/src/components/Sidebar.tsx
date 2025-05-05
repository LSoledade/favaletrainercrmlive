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
  expanded?: boolean;
}

export default function Sidebar({ open, setOpen, expanded = true }: SidebarProps) {
  const [location] = useLocation();
  const { theme } = useTheme();
  const { user, logoutMutation } = useAuth();
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
    { path: "/calendario", label: "Calendário", icon: "event" },
    { path: "/config", label: "Configurações", icon: "settings" },
  ];
  
  
  const getNavClasses = (path: string) => {
    const isActive = location === path;
    const baseClasses = "flex items-center text-white transition-all duration-300 rounded-md my-1 relative overflow-hidden group";
    
    return isActive 
      ? `${baseClasses} bg-primary dark:bg-primary/80 ${expanded ? 'px-3 sm:px-5 mx-2' : 'justify-center mx-1 w-10 h-10'} py-2 sm:py-3`
      : `${baseClasses} hover:bg-secondary-light/50 dark:hover:bg-white/10 ${expanded ? 'px-3 sm:px-5 mx-2' : 'justify-center mx-1 w-10 h-10'} py-2 sm:py-3`;
  };
  
  return (
    <>
      {/* Mobile/Desktop sidebar */}
      <aside 
        className={`${expanded ? 'w-64' : 'w-16'} bg-secondary dark:bg-[#0F0A19] dark:bg-opacity-95 text-white lg:block flex-shrink-0 fixed lg:relative inset-y-0 left-0 transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-all duration-300 ease-in-out z-30 border-r border-secondary-light/50 dark:border-primary/30 h-full flex flex-col overflow-hidden shadow-lg dark:shadow-primary/10`}
      >
        <div className="p-3 sm:p-4 flex items-center justify-between border-b border-secondary-light/30 dark:border-primary/20 relative">
          {expanded ? (
            <div className="font-heading text-lg sm:text-xl font-bold tracking-wider dark:text-white/90">
              Favale<span className="text-primary bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">Pink</span>
            </div>
          ) : (
            <div className="font-heading text-lg sm:text-xl font-bold tracking-wider text-center w-full dark:text-white/90">
              <span className="text-primary bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">F&P</span>
            </div>
          )}
        </div>
        
        <nav className="py-3 sm:py-5 overflow-y-auto flex-grow px-1">
          <ul className={`space-y-2 ${!expanded ? 'flex flex-col items-center' : ''}`}>
            {navItems.map((item) => (
              <li key={item.path} className={!expanded ? 'w-full flex justify-center' : ''}>
                <Link 
                  href={item.path}
                  onClick={() => setOpen(false)}
                  className={getNavClasses(item.path)}
                  title={!expanded ? item.label : undefined}
                >
                  <span className={`material-icons text-base sm:text-lg ${expanded ? 'mr-3 sm:mr-4' : ''} transition-all duration-300 ${location === item.path ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
                  {expanded && <span className="text-sm sm:text-base font-medium">{item.label}</span>}
                  {location === item.path && expanded && (
                    <span className="absolute inset-y-0 left-0 w-1 bg-white dark:bg-white/80 rounded-r-full" />
                  )}
                  {location === item.path && !expanded && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-white dark:bg-white/80 rounded-t-full" />
                  )}
                  <span className="absolute inset-0 bg-white/0 dark:bg-white/0 group-hover:bg-white/5 dark:group-hover:bg-white/5 transition-all duration-300" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* User Profile Section */}
        {user && (
          <div className="mt-auto border-t border-secondary-light/30 dark:border-primary/20 p-2.5 sm:p-3.5 sticky bottom-0 bg-secondary/95 dark:bg-[#0F0A19]/95 backdrop-blur-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className={`flex items-center w-full ${expanded ? 'justify-between' : 'justify-center'} text-white hover:bg-secondary-light/50 dark:hover:bg-white/10 rounded-md p-1.5 sm:p-2 transition-all duration-200 group`}
                  title={!expanded ? "Perfil de usuário" : undefined}
                >
                  <div className="flex items-center">
                    <Avatar className={`${expanded ? 'h-7 w-7 sm:h-9 sm:w-9' : 'h-8 w-8 sm:h-9 sm:w-9'} bg-gradient-to-br from-primary to-primary-light transition-all duration-200 ring-2 ring-white/10 group-hover:ring-white/20`}>
                      <AvatarFallback className="text-xs sm:text-sm font-medium text-white">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {expanded && (
                      <span className="ml-2 sm:ml-3 truncate text-sm sm:text-base font-medium">{user.username}</span>
                    )}
                  </div>
                  {expanded && (
                    <span className="material-icons text-xs sm:text-sm text-white/70 group-hover:text-white/90 transition-all">expand_more</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 sm:w-56 animate-in slide-in-from-bottom-5 duration-200">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/config" onClick={() => setOpen(false)}>
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70" />
                    <span className="text-sm">Perfil e Configurações</span>
                  </DropdownMenuItem>
                </Link>
                {user.role === 'admin' && (
                  <Link href="/config" onClick={() => {
                    setOpen(false);
                  }}>
                    <DropdownMenuItem className="cursor-pointer">
                      <Shield className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70" />
                      <span className="text-sm">Segurança</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="cursor-pointer text-red-500 focus:text-red-500">
                  <LogOut className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70" />
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden transition-all duration-300" 
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
