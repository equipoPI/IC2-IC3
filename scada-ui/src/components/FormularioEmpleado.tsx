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
import apiFetch from '@/lib/api';
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
  email?: string;
  contacto?: string;
  fecha_contratacion?: string;
  ultimo_inicio_sesion?: string;
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
      ultimo_fichaje: "",
    rol: "Operador" as RolUsuario,
    activo: true,
    email: "",
    fecha_contratacion: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const blank = {
      documento: '',
      nombre: '',
      apellido: '',
      rango: '',
      fabrica: '',
      seccion: '',
      ultimo_fichaje: '',
      rol: 'Operador' as RolUsuario,
      activo: true,
      email: '',
      fecha_contratacion: '',
    };

    if (!empleado) {
      setFormData(blank);
      setErrors({});
      return;
    }

    // empleado exists - normalize multiple possible shapes
    const e: any = empleado;
    try { console.debug('FormularioEmpleado: poblando desde empleado', e); } catch (ex) {}

    const documento = e.documento || e.id || e.username || '';
    const nombre = e.nombre || e.first_name || (e.nombreCompleto ? String(e.nombreCompleto).split(' ')[0] : '');
    const apellido = e.apellido || e.last_name || (e.nombreCompleto ? String(e.nombreCompleto).split(' ').slice(1).join(' ') : '');
    const rango = e.rango || e.rango_codigo || '';
    const rol = e.rol_actual || e.rol || 'Operador';
    const email = e.email || (e.profile && e.profile.email) || '';
    const contacto = '';
    const fabricaVal = (e.fabrica !== undefined && e.fabrica !== null) ? String(e.fabrica) : (e.fabrica_nombre || e.fabricaAsignada || '');
    const seccionVal = (e.seccion !== undefined && e.seccion !== null) ? String(e.seccion) : (e.seccion_nombre || '');
    const ultimo = e.ultimo_fichaje || e.ultimoFichaje || '';
    const activoVal = typeof e.activo === 'boolean' ? e.activo : (String(e.estado || '').toLowerCase() === 'activo');

    setFormData({
      documento: documento || '',
      nombre: nombre || '',
      apellido: apellido || '',
      rango: rango || '',
      fabrica: fabricaVal || '',
      seccion: seccionVal || '',
      ultimo_fichaje: ultimo || '',
      rol: rol as RolUsuario,
      activo: activoVal !== undefined ? activoVal : true,
      email: email || '',
      fecha_contratacion: e.fecha_contratacion || e.fechaContratacion || '',
    });

    setErrors({});
  }, [empleado, open]);

  const [fabricas, setFabricas] = useState<FabricaOption[]>([]);
  const [secciones, setSecciones] = useState<SeccionOption[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const resp1 = await apiFetch('/api/v1/fabricas/?page_size=200');
        if (resp1.ok) {
          const data = await resp1.json();
          const items = data.results || data || [];
          setFabricas(items.map((f: any) => ({ id: f.id, nombre: f.nombre || f.nombre_fabrica || String(f.id) })));
        }

        const resp2 = await apiFetch('/api/v1/secciones/?page_size=500');
        if (resp2.ok) {
          const sdata = await resp2.json();
          const sitems = sdata.results || sdata || [];
          setSecciones(sitems.map((s: any) => ({ id: s.id, nombre: s.nombre || String(s.id), fabrica: s.fabrica })));
        }
      } catch (err) {
        console.warn('FormularioEmpleado: fallo cargando fabricas/secciones', err);
      }
    };
    // Cargar cada vez que se abra el formulario para reflejar cambios recientes
    if (open) load();
  }, [open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.documento.trim()) newErrors.documento = "El documento es obligatorio";
    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es obligatorio";
    if (!formData.apellido.trim()) newErrors.apellido = "El apellido es obligatorio";
    if (!formData.rango) newErrors.rango = "Seleccione un rango";
    if (!formData.fabrica) newErrors.fabrica = "Seleccione una fábrica";
    // No se valida teléfono: no se captura en el sistema
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
      <DialogContent className="w-full max-w-full sm:max-w-md bg-card border-border max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {empleado ? "Editar Empleado" : "Añadir Nuevo Empleado"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="overflow-auto max-h-[70vh] pr-2">
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
              <Label className="text-foreground">Último fichaje</Label>
              <Input readOnly value={formData.ultimo_fichaje || ''} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input id="email" placeholder="correo@ejemplo.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>

            {/* Eliminado campo de teléfono por política: no se captura ni expone */}

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
