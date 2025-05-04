import { useLocation, Link } from "wouter";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
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
  const { theme, toggleTheme } = useTheme();
  const { user, logoutMutation } = useAuth();
  
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/leads":
        return "Gerenciamento de Leads";
      case "/agendamentos":
        return "Agendamentos";
      case "/campanhas":
        return "Campanhas";
      case "/config":
        return "Configurações";
      default:
        return "Favale&Pink";
    }
  };
  
  return (
    <header className="bg-background border-b border-border shadow-md h-16 flex items-center px-4 justify-between z-10 transition-colors duration-200">
      <div className="flex items-center">
        <button 
          className="lg:hidden mr-4"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="material-icons text-secondary dark:text-white">menu</span>
        </button>
        <h1 className="font-heading text-secondary dark:text-white text-xl hidden sm:block dark:glow-text">
          {getPageTitle()}
        </h1>
      </div>
      
      <div className="flex items-center">
        <div className="relative mr-4">
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            className="bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded-full py-1 px-4 pl-10 outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary text-sm w-40 md:w-auto transition-colors duration-200" 
          />
          <span className="material-icons absolute left-3 top-1 text-gray-400 dark:text-gray-300 text-sm">search</span>
        </div>
        
        <div className="flex items-center">
          <button className="p-2 relative mr-2">
            <span className="material-icons text-gray-600 dark:text-gray-300">notifications</span>
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-white text-xs flex items-center justify-center dark:glow">3</span>
          </button>
          
          <button 
            onClick={toggleTheme}
            className="p-2 mr-4 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
          >
            <span className="material-icons">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full py-1 px-2">
                  <Avatar className="h-8 w-8 mr-2 bg-primary-light">
                    <AvatarFallback className="text-sm font-medium text-white">
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:block">{user.username}</span>
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
          ) : (
            <Link href="/auth">
              <Button size="sm" variant="outline" className="gap-2">
                <User className="h-4 w-4" />
                <span>Entrar</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
