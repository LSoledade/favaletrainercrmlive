import { ReactNode } from "react";
import CustomSidebar from "./Sidebar";
import Header from "./Header";
import { SidebarProvider } from "@/components/ui/sidebar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-background transition-colors duration-200">
        {/* Sidebar */}
        <CustomSidebar />
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50 dark:bg-background transition-colors duration-200">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
