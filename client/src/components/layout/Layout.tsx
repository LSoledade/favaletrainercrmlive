import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar"; // Correct: sibling component
import Header from "./Header"; // Correct: sibling component
import { useWhatsappContext } from "@/context/WhatsappContext"; // Unchanged
import WhatsappModal from "@/features/whatsapp/components/WhatsappModal"; // Updated path
import { useTheme } from "@/providers/ThemeProvider"; // Updated path

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const { isWhatsappOpen, selectedLeadForWhatsapp, closeWhatsappChat } = useWhatsappContext();
  const { theme } = useTheme();
  
  useEffect(() => {
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
    <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} expanded={sidebarExpanded} />
      {!isMobile && (
        <button 
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className="fixed left-3 bottom-24 z-[9999] p-1 rounded-full hover:bg-secondary-light dark:hover:bg-gray-700 transition-all duration-300 dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-600 w-10 h-10 flex items-center justify-center hover:scale-110 shadow-lg bg-[#111827]"
          title="Alternar menu"
        >
          <span className="material-icons text-white text-base font-bold">
            {sidebarExpanded ? "chevron_left" : "menu"}
          </span>
        </button>
      )}
      <main className="flex-1 flex flex-col p-4">
        <Header setSidebarOpen={setSidebarOpen} />
        <div className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-y-auto">
          {children}
        </div>
      </main>
      <WhatsappModal 
        isOpen={isWhatsappOpen} 
        onClose={closeWhatsappChat} 
        lead={selectedLeadForWhatsapp} 
      />
    </div>
  );
}
