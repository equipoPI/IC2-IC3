import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const pageNames: Record<string, string> = {
  "/plantas": "Gestión de Plantas y Fábricas",
  "/sensores": "Gestión de Sensores y Máquinas",
  "/scada": "Visualización SCADA",
  "/planificacion": "Planificación de la Producción",
  "/alarmas": "Gestión de Alarmas y Notificaciones",
  "/plantillas": "Apartado de Plantillas (Recetas)",
  "/auditoria": "Auditoría y Registro de Actividades",
};

const PlaceholderPage = () => {
  const location = useLocation();
  const pageName = pageNames[location.pathname] || "Página";

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="bg-card border-border max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {pageName}
          </h2>
          <p className="text-muted-foreground">
            Esta sección está en desarrollo. Pronto estará disponible con todas
            las funcionalidades de gestión.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
