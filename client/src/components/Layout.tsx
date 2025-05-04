import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  
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
  
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} expanded={sidebarExpanded} />
      
      {/* Botão de expandir/recolher fixo */}
      {!isMobile && (
        <button 
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className="fixed left-3 bottom-24 z-[9999] p-1 rounded-full hover:bg-secondary-light dark:hover:bg-gray-700 transition-all duration-300 bg-secondary/90 dark:bg-[#0F0A19] border-2 border-gray-500 dark:border-primary/80 dark:shadow-glow dark:hover:shadow-glow-lg w-10 h-10 flex items-center justify-center hover:scale-110 shadow-lg"
          title="Alternar menu"
        >
          <span className="material-icons text-white text-base dark:text-primary dark:glow-text-sm font-bold">
            {sidebarExpanded ? "chevron_left" : "menu"}
          </span>
        </button>
      )}
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header setSidebarOpen={setSidebarOpen} />
        <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6 bg-slate-50 dark:bg-background transition-colors duration-200">
          {children}
        </div>
      </main>
    </div>
  );
}
