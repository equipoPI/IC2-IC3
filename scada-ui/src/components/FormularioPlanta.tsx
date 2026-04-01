import { useState } from "react";
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

interface FormularioPlantaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PlantaFormData) => void;
  initialData?: PlantaFormData;
}

export interface PlantaFormData {
  nombre: string;
  ubicacion: string;
  pais: string;
  estado: string;
}

const paises = [
  "España",
  "México",
  "Argentina",
  "Colombia",
  "Chile",
  "Perú",
  "Estados Unidos",
  "Alemania",
  "Francia",
];

const estados = ["Operativo", "En Mantenimiento", "Inactivo"];

const FormularioPlanta = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: FormularioPlantaProps) => {
  const [formData, setFormData] = useState<PlantaFormData>(
    initialData || {
      nombre: "",
      ubicacion: "",
      pais: "",
      estado: "Operativo",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ nombre: "", ubicacion: "", pais: "", estado: "Operativo" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {initialData ? "Editar Planta" : "Nueva Planta"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-foreground">
              Nombre
            </Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              placeholder="Nombre de la planta"
              className="bg-background border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ubicacion" className="text-foreground">
              Ubicación
            </Label>
            <Input
              id="ubicacion"
              value={formData.ubicacion}
              onChange={(e) =>
                setFormData({ ...formData, ubicacion: e.target.value })
              }
              placeholder="Dirección o ubicación"
              className="bg-background border-border"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pais" className="text-foreground">
                País
              </Label>
              <Select
                value={formData.pais}
                onValueChange={(value) =>
                  setFormData({ ...formData, pais: value })
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Seleccionar país" />
                </SelectTrigger>
                <SelectContent>
                  {paises.map((pais) => (
                    <SelectItem key={pais} value={pais}>
                      {pais}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado" className="text-foreground">
                Estado
              </Label>
              <Select
                value={formData.estado}
                onValueChange={(value) =>
                  setFormData({ ...formData, estado: value })
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {estados.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? "Guardar Cambios" : "Crear Planta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormularioPlanta;
