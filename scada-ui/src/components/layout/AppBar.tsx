import { useState } from "react";
import { Menu, Bell, Settings, User, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import PerfilDialog from "@/components/PerfilDialog";
import ConfiguracionDialog from "@/components/ConfiguracionDialog";
import { useNotifications } from "@/contexts/NotificationsContext";

interface AppBarProps {
  onMenuClick: () => void;
  onLogout?: () => void;
}

const AppBar = ({ onMenuClick, onLogout }: AppBarProps) => {
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const { notificaciones, noLeidas, marcarLeida, marcarTodasLeidas, limpiarNotificaciones } = useNotifications();

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'error': return 'text-destructive';
      case 'warning': return 'text-amber-400';
      case 'success': return 'text-emerald-400';
      default: return 'text-primary';
    }
  };

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SC</span>
            </div>
            <div>
              <h1 className="text-lg font-medium text-foreground">
                Sistema de Gestión SCADA
              </h1>
              <p className="text-xs text-muted-foreground">
                Control y Supervisión Industrial
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
                {noLeidas > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {noLeidas > 9 ? '9+' : noLeidas}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-card border-border max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="font-medium text-foreground">Notificaciones</h3>
                <div className="flex gap-1">
                  {noLeidas > 0 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={marcarTodasLeidas} title="Marcar todas como leídas">
                      <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  {notificaciones.length > 0 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={limpiarNotificaciones} title="Limpiar">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
              {notificaciones.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Sin notificaciones</div>
              ) : (
                notificaciones.slice(0, 20).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!n.leida ? 'bg-muted/30' : ''}`}
                    onClick={() => marcarLeida(n.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {!n.leida && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      <span className={`text-sm font-medium ${getTipoColor(n.tipo)}`}>{n.titulo}</span>
                    </div>
                    <span className="text-xs text-muted-foreground pl-4">{n.mensaje}</span>
                    <span className="text-xs text-muted-foreground/60 pl-4">{n.fechaHora}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setConfigOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => setPerfilOpen(true)}>
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfigOpen(true)}>
                Configuración
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive cursor-pointer"
                onClick={onLogout}
              >
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <PerfilDialog open={perfilOpen} onOpenChange={setPerfilOpen} />
      <ConfiguracionDialog open={configOpen} onOpenChange={setConfigOpen} />
    </>
  );
};

export default AppBar;
