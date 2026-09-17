<<<<<<< HEAD
import { useState } from "react";
=======
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
import { User, Mail, Phone, Building, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

interface PerfilDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PerfilDialog = ({ open, onOpenChange }: PerfilDialogProps) => {
  const [perfil, setPerfil] = useState({
<<<<<<< HEAD
    nombre: "Juan García",
    email: "juan.garcia@empresa.com",
    telefono: "+34 612 345 678",
    departamento: "Operaciones",
    rol: "Supervisor de Planta",
  });

  const handleSave = () => {
    toast({
      title: "Perfil actualizado",
      description: "Los cambios se han guardado correctamente",
    });
    onOpenChange(false);
=======
    first_name: "",
    last_name: "",
    email: "",
    fabrica: "",
  });
  const [empleadoData, setEmpleadoData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshUser, usuario } = useAuth();

  const RANGO_MAP: Record<string, string> = {
    '1': 'Director',
    '2': 'Gerente',
    '3': 'Jefe de Sección',
    '4': 'Coordinador',
    '5': 'Especialista',
    '6': 'Empleado',
    '7': 'Pasante',
    '8': 'Administrador',
  };
  const formatDateTime = (iso: string | null | undefined) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(iso);
    }
  };
  
  useEffect(() => {
    const load = async () => {
      if (!open) return;
      setLoading(true);
      setEmpleadoData(null);
      try {
        // Obtener usuario de sesión desde contexto o desde la API
        let usernameToCheck: string | null = usuario?.username || null;
        let emailToCheck: string | null = usuario?.email || null;

        if (usuario) {
          setPerfil({ first_name: usuario.first_name || usuario.nombre || '', last_name: usuario.last_name || usuario.apellido || '', email: usuario.email || '', fabrica: '' });
        } else {
          const resp = await fetch('/api/v1/auth/user/', { credentials: 'include' });
          if (resp.ok) {
            const u = await resp.json();
            const first_name = u.first_name || '';
            const last_name = u.last_name || '';
            const fabrica = u.profile?.fabrica_nombre || u.profile?.departamento || '';
            setPerfil({ first_name, last_name, email: u.email || '', fabrica });
            usernameToCheck = u.username || usernameToCheck;
            emailToCheck = u.email || emailToCheck;
          }
        }

        // Guardar en locales para evitar usar estado stale en búsquedas
        const usernameLocal = usernameToCheck;
        const emailLocal = emailToCheck;

        // intentar cargar Empleado por username (detalle)
        try {
          if (usernameLocal) {
            const uname = encodeURIComponent(usernameLocal);
            const detailResp = await fetch(`/api/v1/empleados/${uname}/`, { credentials: 'include' });
            if (detailResp.ok) {
              const emp = await detailResp.json();
              setEmpleadoData(emp || null);
              // mezclar fábrica/rol si vienen del empleado
              setPerfil((p) => ({ ...p, fabrica: emp.fabrica_nombre || p.fabrica }));
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          // Silencioso; fallback al listado
        }

        // intentar cargar datos de Empleado asociado por lista (fallback)
        try {
          const empResp = await fetch(`/api/v1/empleados/?include_users=1`, { credentials: 'include' });
          if (empResp.ok) {
            const list = await empResp.json();
            const match = list.find((e: any) => String(e.documento) === String(usernameLocal || '') || e.email === (emailLocal || ''));
            if (match) {
              setPerfil((p) => ({ ...p, fabrica: match.fabrica_nombre || p.fabrica }));
              setEmpleadoData(match || null);
            }
          }
        } catch (e) {
          // silencioso
        }
      } catch (e) {
        // silencioso
      } finally {
        setLoading(false);
      }
    };
    load();

    const onUpdated = (ev: any) => {
      try {
        load();
      } catch (e) {}
    };
    window.addEventListener('empleado:updated', onUpdated as EventListener);
    return () => {
      window.removeEventListener('empleado:updated', onUpdated as EventListener);
    };
  }, [open, usuario]);

  const handleSave = () => {
    (async () => {
      try {
        const first_name = perfil.first_name || '';
        const last_name = perfil.last_name || '';
        const body = { first_name, last_name, email: perfil.email };
        const resp = await fetch('/api/v1/auth/user/', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (resp.ok) {
          toast({ title: 'Perfil actualizado', description: 'Los cambios se han guardado correctamente' });
          // refrescar contexto global para que otros componentes tomen los cambios
          try { await refreshUser(); } catch (e) {}
          onOpenChange(false);
        } else {
          toast({ title: 'Error', description: 'No se pudo actualizar el perfil' });
        }
      } catch (e) {
        toast({ title: 'Error', description: 'No se pudo actualizar el perfil' });
      }
    })();
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
<<<<<<< HEAD
      <DialogContent className="bg-card border-border sm:max-w-md">
=======
      <DialogContent className="bg-card border-border sm:max-w-md max-h-[80vh] overflow-auto">
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex justify-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
<<<<<<< HEAD
                {perfil.nombre.split(" ").map(n => n[0]).join("")}
=======
                {((perfil.first_name || '').charAt(0) + (perfil.last_name || '').charAt(0)).toUpperCase() || 'U'}
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="space-y-4">
<<<<<<< HEAD
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nombre Completo
              </Label>
              <Input 
                value={perfil.nombre} 
                onChange={(e) => setPerfil({...perfil, nombre: e.target.value})}
                className="bg-background border-border"
              />
=======
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre
                </Label>
                <Input 
                  value={perfil.first_name} 
                  disabled
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Apellido
                  </Label>
                  <Input 
                    value={perfil.last_name} 
                    disabled
                    className="bg-background border-border"
                  />
                </div>
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Correo Electrónico
              </Label>
              <Input 
                type="email"
                value={perfil.email} 
<<<<<<< HEAD
                onChange={(e) => setPerfil({...perfil, email: e.target.value})}
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Teléfono
              </Label>
              <Input 
                value={perfil.telefono} 
                onChange={(e) => setPerfil({...perfil, telefono: e.target.value})}
=======
                disabled
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building className="h-4 w-4" />
<<<<<<< HEAD
                Departamento
              </Label>
              <Input 
                value={perfil.departamento} 
                onChange={(e) => setPerfil({...perfil, departamento: e.target.value})}
=======
                Fábrica asignada
              </Label>
              <Input 
                value={perfil.fabrica} 
                disabled
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
                className="bg-background border-border"
              />
            </div>
            
<<<<<<< HEAD
            <div className="space-y-2">
              <Label>Rol</Label>
              <Input 
                value={perfil.rol} 
                disabled
                className="bg-muted border-border"
              />
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
=======
            {/* Rol del sistema derivado desde `Empleado.rango` — no exponer campo redundante */}

            {/* Campos informativos provenientes de la entidad Empleado */}
            {empleadoData && (
              <>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rango</Label>
                      <Input value={RANGO_MAP[String(empleadoData.rango)] || empleadoData.rango_nombre || empleadoData.rango || ''} disabled className="bg-muted border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Sección</Label>
                      <Input value={empleadoData.seccion_nombre || ''} disabled className="bg-muted border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Fábrica</Label>
                      <Input value={empleadoData.fabrica_nombre || perfil.fabrica || ''} disabled className="bg-muted border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha de contratación</Label>
                      <Input value={empleadoData.fecha_contratacion || empleadoData.fechaContratacion || ''} disabled className="bg-muted border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Correo asociado</Label>
                      <Input value={empleadoData.email || perfil.email || ''} disabled className="bg-muted border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Último inicio de sesión</Label>
                      <Input value={formatDateTime(empleadoData.ultimo_inicio_sesion || empleadoData.ultimo_fichaje)} disabled className="bg-muted border-border" />
                    </div>
                  </div>
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PerfilDialog;
