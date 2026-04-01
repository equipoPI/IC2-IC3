import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppBar from "./AppBar";
import Sidebar from "./Sidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  onLogout: () => void;
}

const MainLayout = ({ onLogout }: MainLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <AppBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} onLogout={onLogout} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main
        className={cn(
          "transition-all duration-300 ease-in-out pt-4 pb-8 px-4 lg:px-6",
          sidebarOpen ? "lg:ml-72" : "lg:ml-0"
        )}
      >
        <div className="max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
