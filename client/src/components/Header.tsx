import { useLocation, Link } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Bell, HelpCircle, Sun, Moon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, profile, logoutMutation } = useAuth();
  
  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };
  
  const getThemeIcon = () => {
    if (theme === "light") return <Moon className="h-4 w-4" />;
    if (theme === "dark") return <Sun className="h-4 w-4" />;
    return <Sun className="h-4 w-4" />; // system theme
  };
  
  const getThemeTitle = () => {
    if (theme === "light") return "Mudar para tema escuro";
    if (theme === "dark") return "Mudar para tema do sistema";
    return "Mudar para tema claro";
  };
  
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/leads":
        return "Leads";
      case "/agendamentos":
        return "Agendamentos";
      case "/calendario":
        return "Calendário";
      case "/tarefas":
        return "Tarefas";
      case "/whatsapp":
        return "WhatsApp";
      case "/whatsapp/config":
        return "Configurações do WhatsApp";
      case "/favale-ia":
        return "FavaleIA";
      case "/config":
        return "Configurações";
      case "/auth":
        return "Autenticação";
      case "/politica-de-privacidade":
        return "Política de Privacidade";
      default:
        // Para rotas dinâmicas como /tarefas/:id
        if (location.startsWith("/tarefas/")) {
          return "Detalhes da Tarefa";
        }
        return "FavaleTrainer";
    }
  };
  
  return (
    <header className="h-16 flex items-center justify-between z-10 mb-2">
      <div className="flex items-center">
        <button 
          className="lg:hidden mr-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="material-icons text-gray-600 dark:text-gray-300">menu</span>
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          {getPageTitle()}
        </h1>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="sm"
          className="font-normal text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 flex items-center gap-1 h-9"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          className="font-normal text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 flex items-center gap-1 h-9"
        >
          <Bell className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={toggleTheme}
          className="font-normal text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 flex items-center gap-1 h-9"
          title={getThemeTitle()}
        >
          {getThemeIcon()}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center cursor-pointer ml-2">
              <Avatar className="h-9 w-9 border-2 border-white dark:border-gray-800 ring-2 ring-gray-200 dark:ring-gray-700">
                <AvatarFallback className="text-sm font-medium text-white bg-gray-700">
                  {(profile?.username || user?.email || 'U')?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="ml-2 hidden sm:block">
                <div className="text-sm font-medium text-gray-800 dark:text-white">{profile?.username || user?.email?.split('@')[0] || 'Usuário'}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{profile?.role === 'admin' ? 'Admin' : 'Usuário'}</div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/config">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil e Configurações</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
