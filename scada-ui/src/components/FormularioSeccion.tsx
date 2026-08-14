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
  capacidad_trabajadores: string; // numeric as string
  tamano_seccion: string; // numeric as string
}

interface FormularioSeccionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SeccionFormData) => void;
  initialData?: SeccionFormData;
}

const FormularioSeccion = ({ open, onOpenChange, onSubmit, initialData }: FormularioSeccionProps) => {
  const [formData, setFormData] = useState<SeccionFormData>(initialData || { nombre: '', fabrica: '', capacidad_trabajadores: '0', tamano_seccion: '0' });
  const [fabricas, setFabricas] = useState<{ id: number; nombre: string }[]>([]);

  useEffect(() => { if (initialData) setFormData(initialData); }, [initialData]);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await apiFetch('/api/v1/fabricas/?page_size=200');
        if (!resp.ok) return;
        const data = await resp.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setFabricas(list.map((f: any) => ({ id: f.id, nombre: f.nombre || f.nombre_fabrica || String(f.id) })));
      } catch (err) {
        // silent
      }
    };
    if (open) load();
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
    setFormData({ nombre: '', fabrica: '', capacidad_trabajadores: '0', tamano_seccion: '0' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{initialData ? 'Editar Sección' : 'Nueva Sección'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-foreground">Nombre</Label>
            <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} placeholder="Nombre de la sección" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fabrica" className="text-foreground">Fábrica</Label>
            <Select value={formData.fabrica} onValueChange={(v) => setFormData({ ...formData, fabrica: v })}>
              <SelectTrigger id="fabrica" className="bg-background border-border">
                <SelectValue placeholder="Seleccione una fábrica" />
              </SelectTrigger>
              <SelectContent>
                {fabricas.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>{f.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacidad" className="text-foreground">Capacidad trabajadores</Label>
              <Input id="capacidad" type="number" value={formData.capacidad_trabajadores} onChange={(e) => setFormData({ ...formData, capacidad_trabajadores: e.target.value })} min={0} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tamano" className="text-foreground">Tamaño (m²)</Label>
              <Input id="tamano" type="number" step="0.1" value={formData.tamano_seccion} onChange={(e) => setFormData({ ...formData, tamano_seccion: e.target.value })} min={0} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{initialData ? 'Guardar Cambios' : 'Crear Sección'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormularioSeccion;
