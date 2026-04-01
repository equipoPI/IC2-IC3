import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import GestionEmpleados from "@/pages/GestionEmpleados";
import GestionPlantas from "@/pages/GestionPlantas";
import GestionSensores from "@/pages/GestionSensores";
import MonitorizacionSCADA from "@/pages/MonitorizacionSCADA";
import VisualizacionSCADA from "@/pages/VisualizacionSCADA";
import GestionAlarmas from "@/pages/GestionAlarmas";
import Auditoria from "@/pages/Auditoria";
import PlanificacionProduccion from "@/pages/PlanificacionProduccion";
import GestionPlantillas from "@/pages/GestionPlantillas";
import ConfiguracionMQTT from "@/pages/ConfiguracionMQTT";
import AdministracionAlmacenamiento from "@/pages/AdministracionAlmacenamiento";
import AuditoriaAdmin from "@/pages/AuditoriaAdmin";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import LandingPage from "@/pages/LandingPage";
import { StorageProvider } from "@/contexts/StorageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { isAuthenticated, isAdmin, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<MainLayout onLogout={logout} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/empleados" element={<GestionEmpleados />} />
        <Route path="/plantas" element={<GestionPlantas />} />
        <Route path="/sensores" element={<GestionSensores />} />
        <Route path="/monitorizacion" element={<MonitorizacionSCADA />} />
        <Route path="/scada" element={<VisualizacionSCADA />} />
        <Route path="/planificacion" element={<PlanificacionProduccion />} />
        <Route path="/alarmas" element={<GestionAlarmas />} />
        <Route path="/plantillas" element={<GestionPlantillas />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/comunicacion" element={<ConfiguracionMQTT />} />
        <Route path="/almacenamiento" element={<AdministracionAlmacenamiento />} />
        {isAdmin && <Route path="/admin" element={<AuditoriaAdmin />} />}
      </Route>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
        <StorageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ProtectedRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </StorageProvider>
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
