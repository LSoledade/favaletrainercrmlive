import { useLocation, Link } from "wouter";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: "dashboard" },
    { path: "/leads", label: "Leads", icon: "people" },
    { path: "/agendamentos", label: "Agendamentos", icon: "calendar_today" },
    { path: "/campanhas", label: "Campanhas", icon: "campaign" },
    { path: "/configuracoes", label: "Configurações", icon: "settings" },
  ];
  
  const getNavClasses = (path: string) => {
    const isActive = location === path;
    const baseClasses = "flex items-center px-5 py-3 text-white transition-all duration-200";
    return isActive 
      ? `${baseClasses} bg-secondary-light`
      : `${baseClasses} hover:bg-secondary-light hover:bg-opacity-70`;
  };
  
  return (
    <>
      {/* Desktop sidebar */}
      <aside 
        className={`w-64 bg-secondary text-white md:block flex-shrink-0 fixed md:relative inset-y-0 left-0 transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-200 ease-in-out z-30`}
      >
        <div className="p-5 flex items-center justify-center border-b border-secondary-light">
          <div className="font-heading text-xl font-bold tracking-wider">
            Favale<span className="text-primary">&Pink</span>
          </div>
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
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
