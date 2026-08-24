import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import GestionEmpleados from "@/pages/GestionEmpleados";
import GestionPlantas from "@/pages/GestionPlantas";
import GestionSecciones from "@/pages/GestionSecciones";
import GestionSensores from "@/pages/GestionSensores";
import MonitorizacionSCADA from "@/pages/MonitorizacionSCADA";
import VisualizacionSCADA from "@/pages/VisualizacionSCADA";
import GestionAlarmas from "@/pages/GestionAlarmas";
import Auditoria from "@/pages/Auditoria";
import AnalisisEstadisticas from "@/pages/AnalisisEstadisticas";
import PlanificacionProduccion from "@/pages/PlanificacionProduccion";
import GestionPlantillas from "@/pages/GestionPlantillas";
import ConfiguracionMQTT from "@/pages/ConfiguracionMQTT";
import AdministracionAlmacenamiento from "@/pages/AdministracionAlmacenamiento";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import PasswordReset from "@/pages/PasswordReset";
import PasswordResetConfirm from "@/pages/PasswordResetConfirm";
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
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/password-reset" element={<PasswordReset />} />
        <Route path="/password-reset-confirm" element={<PasswordResetConfirm />} />
        <Route path="/password-reset-confirm/" element={<PasswordResetConfirm />} />
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
      <Route path="/secciones" element={<GestionSecciones />} />
        <Route path="/sensores" element={<GestionSensores />} />
        <Route path="/monitorizacion" element={<MonitorizacionSCADA />} />
        <Route path="/scada" element={<VisualizacionSCADA />} />
        <Route path="/planificacion" element={<PlanificacionProduccion />} />
        <Route path="/alarmas" element={<GestionAlarmas />} />
        <Route path="/plantillas" element={<GestionPlantillas />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/analisis" element={<AnalisisEstadisticas />} />
        <Route path="/comunicacion" element={<ConfiguracionMQTT />} />
        <Route path="/almacenamiento" element={<AdministracionAlmacenamiento />} />
      </Route>
      {/* Permitimos acceso a la verificación de email aun cuando el usuario
          ya esté autenticado (el enlace de confirmación debe funcionar
          independientemente del estado de sesión). */}
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/password-reset-confirm" element={<PasswordResetConfirm />} />
      <Route path="/password-reset-confirm/" element={<PasswordResetConfirm />} />
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
