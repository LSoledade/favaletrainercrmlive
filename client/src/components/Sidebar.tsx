import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  const { theme } = useTheme();
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
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: "dashboard" },
    { path: "/leads", label: "Leads", icon: "people" },
    { path: "/agendamentos", label: "Agendamentos", icon: "calendar_today" },
    { path: "/campanhas", label: "Campanhas", icon: "campaign" },
    { path: "/configuracoes", label: "Configurações", icon: "settings" },
  ];
  
  const getNavClasses = (path: string) => {
    const isActive = location === path;
    const baseClasses = "flex items-center text-white transition-all duration-200 rounded-md my-1 mx-2";
    return isActive 
      ? `${baseClasses} bg-primary dark:glow ${expanded ? 'px-5' : 'justify-center'} py-3`
      : `${baseClasses} hover:bg-secondary-light hover:bg-opacity-70 dark:hover:bg-opacity-30 ${expanded ? 'px-5' : 'justify-center'} py-3`;
  };
  
  return (
    <>
      {/* Desktop sidebar */}
      <aside 
        className={`${expanded ? 'w-64' : 'w-20'} bg-secondary dark:bg-[#0F0A19] dark:glow-border text-white lg:block flex-shrink-0 fixed lg:relative inset-y-0 left-0 transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-all duration-300 ease-in-out z-30 border-r border-secondary-light dark:border-primary/40`}
      >
        <div className="p-4 flex items-center justify-between border-b border-secondary-light dark:border-primary/20">
          {expanded ? (
            <div className="font-heading text-xl font-bold tracking-wider dark:glow-text">
              Favale<span className="text-primary">&Pink</span>
            </div>
          ) : (
            <div className="font-heading text-xl font-bold tracking-wider text-center mx-auto dark:glow-text">
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
        
        <nav className="py-4">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link 
                  href={item.path}
                  onClick={() => setOpen(false)}
                  className={getNavClasses(item.path)}
                >
                  <span className="material-icons mr-3">{item.icon}</span>
                  {expanded && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
