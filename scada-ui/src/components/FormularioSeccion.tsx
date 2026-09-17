import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import apiFetch from "@/lib/api";

export interface SeccionFormData {
  nombre: string;
  fabrica: string; // id as string
  capacidad_trabajadores?: string; // opcional
  tamano_seccion?: string; // opcional
}

interface FormularioSeccionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SeccionFormData) => void;
  initialData?: SeccionFormData;
}

const FormularioSeccion = ({ open, onOpenChange, onSubmit, initialData }: FormularioSeccionProps) => {
  const [formData, setFormData] = useState<SeccionFormData>({ nombre: '', fabrica: '', capacidad_trabajadores: '0', tamano_seccion: '0' });
  const [fabricas, setFabricas] = useState<{ id: number; nombre: string }[]>([]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          nombre: initialData.nombre || "",
          fabrica: initialData.fabrica || "",
          capacidad_trabajadores: initialData.capacidad_trabajadores || "0",
          tamano_seccion: initialData.tamano_seccion || "0",
        });
      } else {
        setFormData({ nombre: '', fabrica: '', capacidad_trabajadores: '0', tamano_seccion: '0' });
      }
    }
  }, [initialData, open]);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await apiFetch('/api/v1/fabricas/?page_size=200');
        if (!resp.ok) return;
        const data = await resp.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setFabricas(list.map((f: any) => ({ id: f.id, nombre: f.nombre || String(f.id) })));
      } catch (err) {
        // silent
      }
    };
    if (open) load();
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      capacidad_trabajadores: formData.capacidad_trabajadores || "0",
      tamano_seccion: formData.tamano_seccion || "0",
    });
    onOpenChange(false);
    setFormData({ nombre: '', fabrica: '', capacidad_trabajadores: '0', tamano_seccion: '0' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {initialData ? 'Editar Ubicación Interna (Sección)' : 'Nueva Ubicación Interna (Sección)'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-foreground">Nombre de la Ubicación Interna</Label>
            <Input 
              id="nombre" 
              value={formData.nombre} 
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
              placeholder="Ej: Sector de Mezclado, Depósito A" 
              className="bg-background border-border"
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fabrica" className="text-foreground">Planta / Fábrica Asignada</Label>
            <Select value={formData.fabrica} onValueChange={(v) => setFormData({ ...formData, fabrica: v })}>
              <SelectTrigger id="fabrica" className="bg-background border-border">
                <SelectValue placeholder="Seleccione una fábrica" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {fabricas.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>{f.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{initialData ? 'Guardar Cambios' : 'Crear Ubicación'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormularioSeccion;
