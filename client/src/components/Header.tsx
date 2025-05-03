import { useLocation } from "wouter";

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const [location] = useLocation();
  
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
      case "/configuracoes":
        return "Configurações";
      default:
        return "Favale&Pink";
    }
  };
  
  return (
    <header className="bg-white shadow-md h-16 flex items-center px-4 justify-between z-10">
      <div className="flex items-center">
        <button 
          className="md:hidden mr-4"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="material-icons text-secondary">menu</span>
        </button>
        <h1 className="font-heading text-secondary text-xl hidden sm:block">
          {getPageTitle()}
        </h1>
      </div>
      
      <div className="flex items-center">
        <div className="relative mr-4">
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            className="bg-slate-50 rounded-full py-1 px-4 pl-10 outline-none focus:ring-2 focus:ring-primary text-sm w-40 md:w-auto" 
          />
          <span className="material-icons absolute left-3 top-1 text-gray-400 text-sm">search</span>
        </div>
        
        <div className="flex items-center">
          <button className="p-2 relative mr-4">
            <span className="material-icons text-gray-600">notifications</span>
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-white text-xs flex items-center justify-center">3</span>
          </button>
          
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mr-2">
              <span className="material-icons text-sm">person</span>
            </div>
            <span className="text-sm font-medium hidden sm:block">Administrador</span>
          </div>
        </div>
      </div>
    </header>
  );
}
