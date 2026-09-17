<<<<<<< HEAD
import { useState } from "react";
=======
import { useState, useEffect } from "react";
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
<<<<<<< HEAD
=======
import { Textarea } from "@/components/ui/textarea";
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
<<<<<<< HEAD
=======
import apiFetch from "@/lib/api";
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385

interface FormularioSensorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SensorFormData) => void;
  initialData?: SensorFormData;
}

export interface SensorFormData {
<<<<<<< HEAD
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
=======
  numero_serie: string;
  nombre: string;
  categoria: string;
  seccion: string; // ID de sección
  sistema?: string; // ID de sistema (opcional)
  inventario?: string; // ID de inventario (opcional)
  gateway_id?: string; // ID de la Raspberry física (opcional)
  descripcion?: string; // Descripción del dispositivo (opcional)
}

const categorias = [
  { value: "SENSOR_TEMPERATURA", label: "Sensor de Temperatura" },
  { value: "SENSOR_PRESION", label: "Sensor de Presión" },
  { value: "SENSOR_FLUJO", label: "Sensor de Flujo" },
  { value: "SENSOR_NIVEL", label: "Sensor de Nivel" },
  { value: "SENSOR_HUMEDAD", label: "Sensor de Humedad" },
  { value: "MOTOR", label: "Motor" },
  { value: "BOMBA", label: "Bomba" },
  { value: "VALVULA", label: "Válvula" },
  { value: "PLC", label: "PLC" },
  { value: "HMI", label: "HMI" },
  { value: "MEZCLADORA", label: "Mezcladora" },
  { value: "ENVASADORA", label: "Envasadora" },
  { value: "TRANSPORTADOR", label: "Transportador" },
  { value: "ROBOT", label: "Robot" },
  { value: "OTRO", label: "Otro" },
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
];

const FormularioSensor = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: FormularioSensorProps) => {
<<<<<<< HEAD
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
=======
  const [formData, setFormData] = useState<SensorFormData>({
    numero_serie: "",
    nombre: "",
    categoria: "",
    seccion: "",
    sistema: "",
    inventario: "",
    gateway_id: "",
    descripcion: "",
  });

  const [secciones, setSecciones] = useState<{ id: number; nombre: string; fabrica_nombre?: string }[]>([]);
  const [sistemas, setSistemas] = useState<{ id: number; nombre: string; fabrica_nombre?: string }[]>([]);
  const [inventarios, setInventarios] = useState<{ id: number; nombre: string; fabrica_nombre?: string }[]>([]);

  // Sincronizar initialData al editar
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          numero_serie: initialData.numero_serie || "",
          nombre: initialData.nombre || "",
          categoria: initialData.categoria || "",
          seccion: initialData.seccion ? String(initialData.seccion) : "",
          sistema: initialData.sistema ? String(initialData.sistema) : "",
          inventario: initialData.inventario ? String(initialData.inventario) : "",
          gateway_id: initialData.gateway_id || "",
          descripcion: initialData.descripcion || "",
        });
      } else {
        setFormData({
          numero_serie: "",
          nombre: "",
          categoria: "",
          seccion: "",
          sistema: "",
          inventario: "",
          gateway_id: "",
          descripcion: "",
        });
      }
    }
  }, [initialData, open]);

  // Cargar datos relacionales desde la API
  useEffect(() => {
    if (open) {
      const loadRelations = async () => {
        try {
          const [seccionesResp, sistemasResp, inventariosResp] = await Promise.all([
            apiFetch("/api/v1/secciones/?page_size=200"),
            apiFetch("/api/v1/sistemas/?page_size=200"),
            apiFetch("/api/v1/inventarios/?page_size=200"),
          ]);

          if (seccionesResp.ok) {
            const data = await seccionesResp.json();
            setSecciones(Array.isArray(data) ? data : data.results || []);
          }
          if (sistemasResp.ok) {
            const data = await sistemasResp.json();
            setSistemas(Array.isArray(data) ? data : data.results || []);
          }
          if (inventariosResp.ok) {
            const data = await inventariosResp.json();
            setInventarios(Array.isArray(data) ? data : data.results || []);
          }
        } catch (err) {
          console.error("Error cargando relaciones en formulario de sensores", err);
        }
      };
      loadRelations();
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      sistema: formData.sistema && formData.sistema !== "none_system" ? formData.sistema : undefined,
      inventario: formData.inventario && formData.inventario !== "none_inventory" ? formData.inventario : undefined,
      gateway_id: formData.gateway_id || undefined,
      descripcion: formData.descripcion || undefined,
    });
    setFormData({
      numero_serie: "",
      nombre: "",
      categoria: "",
      seccion: "",
      sistema: "",
      inventario: "",
      gateway_id: "",
      descripcion: "",
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
<<<<<<< HEAD
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
=======
      <DialogContent className="sm:max-w-[550px] bg-card border-border">
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {initialData ? "Editar Sensor/Máquina" : "Nuevo Sensor/Máquina"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
<<<<<<< HEAD
              <Label htmlFor="numeroSerie" className="text-foreground">
                Número de Serie
              </Label>
              <Input
                id="numeroSerie"
                value={formData.numeroSerie}
                onChange={(e) =>
                  setFormData({ ...formData, numeroSerie: e.target.value })
=======
              <Label htmlFor="numero_serie" className="text-foreground">
                Número de Serie (ID)
              </Label>
              <Input
                id="numero_serie"
                value={formData.numero_serie}
                onChange={(e) =>
                  setFormData({ ...formData, numero_serie: e.target.value })
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
                }
                placeholder="SN-XXXX-XXXX"
                className="bg-background border-border font-mono"
                required
<<<<<<< HEAD
=======
                disabled={!!initialData} // No se puede editar el número de serie pk
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
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

<<<<<<< HEAD
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
=======
          <div className="grid grid-cols-2 gap-4">
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
                <SelectContent className="bg-popover border-border">
                  {categorias.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gateway_id" className="text-foreground">
                Gateway ID (MAC Raspberry)
              </Label>
              <Input
                id="gateway_id"
                value={formData.gateway_id}
                onChange={(e) =>
                  setFormData({ ...formData, gateway_id: e.target.value })
                }
                placeholder="001122334455"
                className="bg-background border-border font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
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
                  <SelectValue placeholder="Sección..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {secciones.map((sec) => (
                    <SelectItem key={sec.id} value={String(sec.id)}>
                      {sec.nombre} {sec.fabrica_nombre ? `(${sec.fabrica_nombre})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sistema" className="text-foreground">
                Máquina/Sistema
              </Label>
              <Select
                value={formData.sistema}
                onValueChange={(value) =>
                  setFormData({ ...formData, sistema: value })
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Ninguna" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none_system">Ninguna</SelectItem>
                  {sistemas.map((sis) => (
                    <SelectItem key={sis.id} value={String(sis.id)}>
                      {sis.nombre} {sis.fabrica_nombre ? `(${sis.fabrica_nombre})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventario" className="text-foreground">
                Almacén/Inventario
              </Label>
              <Select
                value={formData.inventario}
                onValueChange={(value) =>
                  setFormData({ ...formData, inventario: value })
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none_inventory">Ninguno</SelectItem>
                  {inventarios.map((inv) => (
                    <SelectItem key={inv.id} value={String(inv.id)}>
                      {inv.nombre} {inv.fabrica_nombre ? `(${inv.fabrica_nombre})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion" className="text-foreground">
              Descripción
            </Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              placeholder="Notas, detalles o especificaciones técnicas del sensor"
              className="bg-background border-border h-20 resize-none"
            />
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
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
