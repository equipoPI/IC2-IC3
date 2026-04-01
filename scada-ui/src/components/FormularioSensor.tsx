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

interface FormularioSensorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SensorFormData) => void;
  initialData?: SensorFormData;
}

export interface SensorFormData {
  numeroSerie: string;
  nombre: string;
  categoria: string;
  inventarioAsignado: string;
  seccion: string;
}

const categorias = [
  "Sensor de Temperatura",
  "Sensor de Presión",
  "Sensor de Flujo",
  "Sensor de Nivel",
  "Sensor de Humedad",
  "Motor",
  "Bomba",
  "Válvula",
  "PLC",
  "HMI",
];

const inventarios = [
  "Planta Norte - INV001",
  "Planta Central - INV002",
  "Planta Sur - INV003",
  "Fábrica Este - INV004",
  "Fábrica Oeste - INV005",
];

const secciones = [
  "Producción",
  "Almacén",
  "Control de Calidad",
  "Mantenimiento",
  "Empaque",
  "Logística",
];

const FormularioSensor = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: FormularioSensorProps) => {
  const [formData, setFormData] = useState<SensorFormData>(
    initialData || {
      numeroSerie: "",
      nombre: "",
      categoria: "",
      inventarioAsignado: "",
      seccion: "",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      numeroSerie: "",
      nombre: "",
      categoria: "",
      inventarioAsignado: "",
      seccion: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {initialData ? "Editar Sensor/Máquina" : "Nuevo Sensor/Máquina"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroSerie" className="text-foreground">
                Número de Serie
              </Label>
              <Input
                id="numeroSerie"
                value={formData.numeroSerie}
                onChange={(e) =>
                  setFormData({ ...formData, numeroSerie: e.target.value })
                }
                placeholder="SN-XXXX-XXXX"
                className="bg-background border-border font-mono"
                required
              />
            </div>

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
                placeholder="Nombre del equipo"
                className="bg-background border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria" className="text-foreground">
              Categoría
            </Label>
            <Select
              value={formData.categoria}
              onValueChange={(value) =>
                setFormData({ ...formData, categoria: value })
              }
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inventario" className="text-foreground">
              Inventario Asignado
            </Label>
            <Select
              value={formData.inventarioAsignado}
              onValueChange={(value) =>
                setFormData({ ...formData, inventarioAsignado: value })
              }
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Seleccionar inventario" />
              </SelectTrigger>
              <SelectContent>
                {inventarios.map((inv) => (
                  <SelectItem key={inv} value={inv}>
                    {inv}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seccion" className="text-foreground">
              Sección
            </Label>
            <Select
              value={formData.seccion}
              onValueChange={(value) =>
                setFormData({ ...formData, seccion: value })
              }
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Seleccionar sección" />
              </SelectTrigger>
              <SelectContent>
                {secciones.map((sec) => (
                  <SelectItem key={sec} value={sec}>
                    {sec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {initialData ? "Guardar Cambios" : "Crear Sensor/Máquina"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormularioSensor;
