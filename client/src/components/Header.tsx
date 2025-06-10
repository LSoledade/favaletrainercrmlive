import { useLocation, Link } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Sun, Moon } from "lucide-react";
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
  const { user, logout } = useAuth();

  const logoutMutation = {
    mutate: logout
  };

  const getPageTitle = () => {
    switch(location) {
      case '/':
        return 'Dashboard';
      case '/leads':
        return 'Leads';
      case '/students':
        return 'Alunos';
      case '/sessions':
        return 'Sessões';
      case '/trainers':
        return 'Personal Trainers';
      case '/whatsapp':
        return 'WhatsApp';
      case '/whatsapp-config':
        return 'Configurar WhatsApp';
      case '/tasks':
        return 'Tarefas';
      case '/config':
        return 'Configurações';
      case '/data-analysis':
        return 'Análise de Dados';
      case '/favale-ia':
        return 'Favale IA';
      default:
        return 'Favale&Pink Personal Training';
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const getThemeIcon = () => {
    return theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
  };

  const getThemeTitle = () => {
    return theme === "light" ? "Mudar para modo escuro" : "Mudar para modo claro";
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          {getPageTitle()}
        </h1>
      </div>
      
      <div className="flex items-center space-x-2">
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
                  {user?.username.substring(0, 2).toUpperCase() || "LW"}
                </AvatarFallback>
              </Avatar>
              <div className="ml-2 hidden sm:block">
                <div className="text-sm font-medium text-gray-800 dark:text-white">{user?.username || "Leslie Watson"}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Admin</div>
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