import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
<<<<<<< HEAD
import FabricasDashboard from "@/components/FabricasDashboard";
=======
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import GestionEmpleados from "@/pages/GestionEmpleados";
import GestionPlantas from "@/pages/GestionPlantas";
<<<<<<< HEAD
=======
import GestionSecciones from "@/pages/GestionSecciones";
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
import GestionSensores from "@/pages/GestionSensores";
import MonitorizacionSCADA from "@/pages/MonitorizacionSCADA";
import VisualizacionSCADA from "@/pages/VisualizacionSCADA";
import GestionAlarmas from "@/pages/GestionAlarmas";
import Auditoria from "@/pages/Auditoria";
<<<<<<< HEAD
import PlanificacionProduccion from "@/pages/PlanificacionProduccion";
import GestionPlantillas from "@/pages/GestionPlantillas";
import ConfiguracionMQTT from "@/pages/ConfiguracionMQTT";
import AdministracionAlmacenamiento from "@/pages/AdministracionAlmacenamiento";
import AuditoriaAdmin from "@/pages/AuditoriaAdmin";
=======
import AnalisisEstadisticas from "@/pages/AnalisisEstadisticas";
import PlanificacionProduccion from "@/pages/PlanificacionProduccion";
import GestionPlantillas from "@/pages/GestionPlantillas";
import ConfiguracionMQTT from "@/pages/ConfiguracionMQTT";
import Credenciales from "@/pages/Credenciales";
import AdministracionAlmacenamiento from "@/pages/AdministracionAlmacenamiento";
import GuiaSistema from "@/pages/GuiaSistema";
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
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
<<<<<<< HEAD

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { isAuthenticated, isAdmin, logout } = useAuth();
=======
import { WebSocketProvider } from "@/contexts/WebSocketContext";

const queryClient = new QueryClient();

const ProtectedPage = ({ path, element }: { path: string; element: JSX.Element }) => {
  const { usuario, isAdmin } = useAuth();
  const rangoNum = Number(usuario?.rango || (isAdmin ? 8 : 1));

  if (rangoNum === 8 || isAdmin) return element;
  if ([1, 2, 3, 4].includes(rangoNum)) { // Director, Gerente, Jefe de Sección, Coordinador
    if (['/plantas', '/secciones', '/sensores', '/almacenamiento', '/credenciales', '/comunicacion'].includes(path)) {
      return <Navigate to="/dashboard" replace />;
    }
    return element;
  }
  if (rangoNum === 5) { // Especialista
    if (['/empleados', '/plantas', '/secciones', '/sensores', '/almacenamiento', '/auditoria', '/credenciales', '/comunicacion'].includes(path)) {
      return <Navigate to="/dashboard" replace />;
    }
    return element;
  }
  // Rangos 6 y 7 (Empleado, Pasante)
  if (['/empleados', '/plantas', '/secciones', '/sensores', '/almacenamiento', '/plantillas', '/auditoria', '/credenciales', '/comunicacion'].includes(path)) {
    return <Navigate to="/dashboard" replace />;
  }
  return element;
};

const ProtectedRoutes = () => {
  const { isAuthenticated, logout } = useAuth();
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/password-reset" element={<PasswordReset />} />
        <Route path="/password-reset-confirm" element={<PasswordResetConfirm />} />
<<<<<<< HEAD
=======
        <Route path="/password-reset-confirm/" element={<PasswordResetConfirm />} />
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<MainLayout onLogout={logout} />}>
<<<<<<< HEAD
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
=======
        <Route path="/dashboard" element={<ProtectedPage path="/dashboard" element={<Dashboard />} />} />
        <Route path="/empleados" element={<ProtectedPage path="/empleados" element={<GestionEmpleados />} />} />
        <Route path="/plantas" element={<ProtectedPage path="/plantas" element={<GestionPlantas />} />} />
        <Route path="/secciones" element={<ProtectedPage path="/secciones" element={<GestionSecciones />} />} />
        <Route path="/sensores" element={<ProtectedPage path="/sensores" element={<GestionSensores />} />} />
        <Route path="/monitorizacion" element={<ProtectedPage path="/monitorizacion" element={<MonitorizacionSCADA />} />} />
        <Route path="/scada" element={<ProtectedPage path="/scada" element={<VisualizacionSCADA />} />} />
        <Route path="/planificacion" element={<ProtectedPage path="/planificacion" element={<PlanificacionProduccion />} />} />
        <Route path="/alarmas" element={<ProtectedPage path="/alarmas" element={<GestionAlarmas />} />} />
        <Route path="/plantillas" element={<ProtectedPage path="/plantillas" element={<GestionPlantillas />} />} />
        <Route path="/auditoria" element={<ProtectedPage path="/auditoria" element={<Auditoria />} />} />
        <Route path="/analisis" element={<ProtectedPage path="/analisis" element={<AnalisisEstadisticas />} />} />
        <Route path="/comunicacion" element={<ProtectedPage path="/comunicacion" element={<ConfiguracionMQTT />} />} />
        <Route path="/credenciales" element={<ProtectedPage path="/credenciales" element={<Credenciales />} />} />
        <Route path="/almacenamiento" element={<ProtectedPage path="/almacenamiento" element={<AdministracionAlmacenamiento />} />} />
        <Route path="/guia-sistema" element={<ProtectedPage path="/guia-sistema" element={<GuiaSistema />} />} />
      </Route>
      {/* Permitimos acceso a la verificación de email aun cuando el usuario
          ya esté autenticado (el enlace de confirmación debe funcionar
          independientemente del estado de sesión). */}
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/password-reset-confirm" element={<PasswordResetConfirm />} />
      <Route path="/password-reset-confirm/" element={<PasswordResetConfirm />} />
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
<<<<<<< HEAD
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
=======
        <WebSocketProvider>
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
        </WebSocketProvider>
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
