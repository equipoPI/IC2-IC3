import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RolUsuario } from "@/contexts/AuthContext";

export interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  rango: string;
  fabricaAsignada: string;
  ultimoFichaje: string;
  rol: RolUsuario;
  activo: boolean;
}

interface FormularioEmpleadoProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (empleado: {
    documento?: string;
    nombre: string;
    apellido: string;
    rango: string;
    fabrica: string; // id
    seccion?: string; // id
    rol: RolUsuario;
    activo: boolean;
    email?: string;
    contacto?: string;
    fecha_contratacion?: string;
  }) => void;
  empleado?: Empleado | null;
}

const rangos = ["Empleado", "Jefe", "Administrador"];

const roles: RolUsuario[] = ["Operador", "Jefe de Sector", "Administrador"];

// Se cargan desde API

interface FabricaOption { id: number; nombre: string }
interface SeccionOption { id: number; nombre: string; fabrica: number }

const FormularioEmpleado = ({
  open,
  onClose,
  onSubmit,
  empleado,
}: FormularioEmpleadoProps) => {
  const [formData, setFormData] = useState({
    documento: '',
    nombre: "",
    apellido: "",
    rango: "",
    fabrica: "",
    seccion: "",
    rol: "Operador" as RolUsuario,
    activo: true,
    email: "",
    contacto: "",
    fecha_contratacion: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (empleado) {
      const [nombre, ...apellidoParts] = empleado.nombreCompleto.split(" ");
      setFormData((prev) => ({
        ...prev,
        documento: empleado.id || '',
        nombre: nombre || "",
        apellido: apellidoParts.join(" ") || "",
        rango: empleado.rango,
        fabrica: empleado.fabricaAsignada || '',
        rol: empleado.rol,
        activo: empleado.activo,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        documento: '',
        nombre: "",
        apellido: "",
        rango: "",
        fabrica: "",
        seccion: "",
        rol: "Operador",
        activo: true,
        email: "",
        contacto: "",
        fecha_contratacion: "",
      }));
    }
    setErrors({});
  }, [empleado, open]);

  const [fabricas, setFabricas] = useState<FabricaOption[]>([]);
  const [secciones, setSecciones] = useState<SeccionOption[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const resp1 = await (await import('@/lib/api')).default('/api/v1/fabricas/');
        if (resp1.ok) {
          const data = await resp1.json();
          setFabricas(data.map((f:any) => ({ id: f.id, nombre: f.nombre })));
        }
        const resp2 = await (await import('@/lib/api')).default('/api/v1/secciones/');
        if (resp2.ok) {
          const sdata = await resp2.json();
          setSecciones(sdata.map((s:any) => ({ id: s.id, nombre: s.nombre, fabrica: s.fabrica })));
        }
      } catch (err) {
        // ignore for now
      }
    };
    load();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.documento.trim()) newErrors.documento = "El documento es obligatorio";
    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es obligatorio";
    if (!formData.apellido.trim()) newErrors.apellido = "El apellido es obligatorio";
    if (!formData.rango) newErrors.rango = "Seleccione un rango";
    if (!formData.fabrica) newErrors.fabrica = "Seleccione una fábrica";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {empleado ? "Editar Empleado" : "Añadir Nuevo Empleado"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="documento" className="text-foreground">Documento</Label>
              <Input id="documento" placeholder="DNI / CUIT" value={formData.documento} onChange={(e) => setFormData({ ...formData, documento: e.target.value })} className={errors.documento ? 'border-destructive' : ''} />
              {errors.documento && <p className="text-xs text-destructive">{errors.documento}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-foreground">Nombre</Label>
              <Input
                id="nombre"
                placeholder="Ingrese el nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className={errors.nombre ? "border-destructive" : ""}
              />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apellido" className="text-foreground">Apellido</Label>
              <Input
                id="apellido"
                placeholder="Ingrese el apellido"
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                className={errors.apellido ? "border-destructive" : ""}
              />
              {errors.apellido && <p className="text-xs text-destructive">{errors.apellido}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rango" className="text-foreground">Rango</Label>
              <Select value={formData.rango} onValueChange={(value) => setFormData({ ...formData, rango: value })}>
                <SelectTrigger id="rango" className={errors.rango ? "border-destructive" : ""}>
                  <SelectValue placeholder="Seleccione un rango" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {rangos.map((rango) => (
                    <SelectItem key={rango} value={rango}>{rango}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.rango && <p className="text-xs text-destructive">{errors.rango}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fabrica" className="text-foreground">Fábrica Asignada</Label>
              <Select value={String(formData.fabrica)} onValueChange={(value) => setFormData({ ...formData, fabrica: value })}>
                <SelectTrigger id="fabrica" className={errors.fabrica ? "border-destructive" : ""}>
                  <SelectValue placeholder="Seleccione una fábrica" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {fabricas.map((fabrica) => (
                    <SelectItem key={fabrica.id} value={String(fabrica.id)}>{fabrica.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fabrica && <p className="text-xs text-destructive">{errors.fabrica}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="seccion" className="text-foreground">Sección</Label>
              <Select value={String(formData.seccion)} onValueChange={(value) => setFormData({ ...formData, seccion: value })}>
                <SelectTrigger id="seccion">
                  <SelectValue placeholder="Seleccione una sección (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {secciones.filter(s => String(s.fabrica) === String(formData.fabrica)).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input id="email" placeholder="correo@ejemplo.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contacto" className="text-foreground">Contacto</Label>
              <Input id="contacto" placeholder="+54 9 11 1234 5678" value={formData.contacto} onChange={(e) => setFormData({ ...formData, contacto: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_contratacion" className="text-foreground">Fecha de contratación</Label>
              <Input id="fecha_contratacion" type="date" value={formData.fecha_contratacion} onChange={(e) => setFormData({ ...formData, fecha_contratacion: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rol" className="text-foreground">Rol del Sistema</Label>
              <Select value={formData.rol} onValueChange={(value) => setFormData({ ...formData, rol: value as RolUsuario })}>
                <SelectTrigger id="rol">
                  <SelectValue placeholder="Seleccione un rol" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {roles.map((rol) => (
                    <SelectItem key={rol} value={rol}>{rol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {empleado ? "Guardar Cambios" : "Añadir Empleado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormularioEmpleado;
