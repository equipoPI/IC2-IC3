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
  onSubmit: (empleado: Omit<Empleado, "id" | "nombreCompleto" | "ultimoFichaje">) => void;
  empleado?: Empleado | null;
}

const rangos = [
  "Operario",
  "Técnico",
  "Supervisor",
  "Ingeniero",
  "Jefe de Planta",
  "Gerente",
  "Director",
];

const roles: RolUsuario[] = ["Operador", "Jefe de Sector", "Administrador"];

const fabricas = [
  "Planta Norte",
  "Planta Sur",
  "Planta Central",
  "Fábrica Este",
  "Fábrica Oeste",
];

const FormularioEmpleado = ({
  open,
  onClose,
  onSubmit,
  empleado,
}: FormularioEmpleadoProps) => {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    rango: "",
    fabricaAsignada: "",
    rol: "Operador" as RolUsuario,
    activo: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (empleado) {
      const [nombre, ...apellidoParts] = empleado.nombreCompleto.split(" ");
      setFormData({
        nombre: nombre || "",
        apellido: apellidoParts.join(" ") || "",
        rango: empleado.rango,
        fabricaAsignada: empleado.fabricaAsignada,
        rol: empleado.rol,
        activo: empleado.activo,
      });
    } else {
      setFormData({
        nombre: "",
        apellido: "",
        rango: "",
        fabricaAsignada: "",
        rol: "Operador",
        activo: true,
      });
    }
    setErrors({});
  }, [empleado, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es obligatorio";
    if (!formData.apellido.trim()) newErrors.apellido = "El apellido es obligatorio";
    if (!formData.rango) newErrors.rango = "Seleccione un rango";
    if (!formData.fabricaAsignada) newErrors.fabricaAsignada = "Seleccione una fábrica";
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
              <Select value={formData.fabricaAsignada} onValueChange={(value) => setFormData({ ...formData, fabricaAsignada: value })}>
                <SelectTrigger id="fabrica" className={errors.fabricaAsignada ? "border-destructive" : ""}>
                  <SelectValue placeholder="Seleccione una fábrica" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {fabricas.map((fabrica) => (
                    <SelectItem key={fabrica} value={fabrica}>{fabrica}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fabricaAsignada && <p className="text-xs text-destructive">{errors.fabricaAsignada}</p>}
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
