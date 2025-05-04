import { ReactNode, useState, useEffect } from "react";
import AppSidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background transition-colors duration-200">
      {/* Sidebar */}
      <AppSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
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
