import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarSize, setSidebarSize] = useState(20); // porcentagem padrão para a sidebar
  
  useEffect(() => {
    // Verificar se é mobile ao inicializar
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Carregar o tamanho salvo da sidebar
    const savedSize = localStorage.getItem('sidebarSize');
    if (savedSize) {
      setSidebarSize(parseInt(savedSize));
    }
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Salva o tamanho da sidebar quando for alterado
  const handleResizeEnd = (sizes: number[]) => {
    setSidebarSize(sizes[0]);
    localStorage.setItem('sidebarSize', sizes[0].toString());
  };
  
  return (
    <div className="h-screen w-full overflow-hidden bg-background transition-colors duration-200">
      {isMobile ? (
        // Layout móvel (sem painel redimensionável)
        <div className="flex h-full">
          {/* Sidebar */}
          <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile} />
          
          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <Header setSidebarOpen={setSidebarOpen} />
            <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6 bg-slate-50 dark:bg-background transition-colors duration-200">
              {children}
            </div>
          </main>
        </div>
      ) : (
        // Layout desktop com painel redimensionável
        <ResizablePanelGroup 
          direction="horizontal" 
          className="h-full"
          onLayout={handleResizeEnd}
        >
          {/* Sidebar como painel redimensionável */}
          <ResizablePanel 
            defaultSize={sidebarSize} 
            minSize={16} 
            maxSize={35}
            className="transition-all duration-300"
          >
            <Sidebar open={true} setOpen={setSidebarOpen} isMobile={isMobile} />
          </ResizablePanel>
          
          {/* Handle de redimensionamento com estilo personalizado */}
          <ResizableHandle 
            withHandle 
            className="bg-secondary dark:bg-[#0F0A19] border-x-2 border-secondary-light dark:border-primary/40 w-1.5 transition-colors"
          />
          
          {/* Conteúdo principal */}
          <ResizablePanel defaultSize={100 - sidebarSize}>
            <main className="flex-1 flex flex-col overflow-hidden h-full">
              <Header setSidebarOpen={setSidebarOpen} />
              <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6 bg-slate-50 dark:bg-background transition-colors duration-200">
                {children}
              </div>
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
