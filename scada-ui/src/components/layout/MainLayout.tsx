import { useState } from "react";
<<<<<<< HEAD
import { Outlet } from "react-router-dom";
import AppBar from "./AppBar";
import Sidebar from "./Sidebar";
=======
import { Outlet, useLocation } from "react-router-dom";
import AppBar from "./AppBar";
import Sidebar from "./Sidebar";
import ErrorBoundary from "@/components/ErrorBoundary";
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  onLogout: () => void;
}

const MainLayout = ({ onLogout }: MainLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
<<<<<<< HEAD
=======
  const location = useLocation();
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385

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
<<<<<<< HEAD
          <Outlet />
=======
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
