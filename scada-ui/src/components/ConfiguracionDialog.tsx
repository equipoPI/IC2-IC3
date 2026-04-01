import { useState } from "react";
import { Settings, Bell, Moon, Globe, Shield, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface ConfiguracionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ConfiguracionDialog = ({ open, onOpenChange }: ConfiguracionDialogProps) => {
  const [config, setConfig] = useState({
    notificacionesEmail: true,
    notificacionesPush: true,
    sonidoAlarmas: true,
    temaOscuro: true,
    idioma: "es",
    zonaHoraria: "Europe/Madrid",
    sesionAutomatica: false,
    dobleFactorAuth: false,
  });

  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "Los cambios se han aplicado correctamente",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Notificaciones */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Bell className="h-4 w-4" />
              Notificaciones
            </h3>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notif" className="text-muted-foreground">
                  Notificaciones por email
                </Label>
                <Switch
                  id="email-notif"
                  checked={config.notificacionesEmail}
                  onCheckedChange={(v) => setConfig({...config, notificacionesEmail: v})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="push-notif" className="text-muted-foreground">
                  Notificaciones push
                </Label>
                <Switch
                  id="push-notif"
                  checked={config.notificacionesPush}
                  onCheckedChange={(v) => setConfig({...config, notificacionesPush: v})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sound-notif" className="text-muted-foreground">
                  Sonido de alarmas
                </Label>
                <Switch
                  id="sound-notif"
                  checked={config.sonidoAlarmas}
                  onCheckedChange={(v) => setConfig({...config, sonidoAlarmas: v})}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Apariencia */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Moon className="h-4 w-4" />
              Apariencia
            </h3>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="text-muted-foreground">
                  Tema oscuro
                </Label>
                <Switch
                  id="dark-mode"
                  checked={config.temaOscuro}
                  onCheckedChange={(v) => setConfig({...config, temaOscuro: v})}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Regional */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Globe className="h-4 w-4" />
              Regional
            </h3>
            <div className="space-y-3 pl-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Idioma</Label>
                <Select value={config.idioma} onValueChange={(v) => setConfig({...config, idioma: v})}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Zona Horaria</Label>
                <Select value={config.zonaHoraria} onValueChange={(v) => setConfig({...config, zonaHoraria: v})}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Madrid">Europe/Madrid (UTC+1)</SelectItem>
                    <SelectItem value="America/Mexico_City">America/Mexico_City (UTC-6)</SelectItem>
                    <SelectItem value="America/Bogota">America/Bogota (UTC-5)</SelectItem>
                    <SelectItem value="America/Buenos_Aires">America/Buenos_Aires (UTC-3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Seguridad */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Shield className="h-4 w-4" />
              Seguridad
            </h3>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-logout" className="text-muted-foreground">
                  Cerrar sesión automáticamente (30 min)
                </Label>
                <Switch
                  id="auto-logout"
                  checked={config.sesionAutomatica}
                  onCheckedChange={(v) => setConfig({...config, sesionAutomatica: v})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="2fa" className="text-muted-foreground">
                  Autenticación de dos factores
                </Label>
                <Switch
                  id="2fa"
                  checked={config.dobleFactorAuth}
                  onCheckedChange={(v) => setConfig({...config, dobleFactorAuth: v})}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfiguracionDialog;
