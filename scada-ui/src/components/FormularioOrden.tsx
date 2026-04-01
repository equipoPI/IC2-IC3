import { useState, useEffect } from "react";
import { Save, X } from "lucide-react";
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

interface OrdenProduccion {
  id: string;
  producto: string;
  cantidad: number;
  fechaInicio: string;
  horaInicio: string;
  fechaFin: string;
  horaFin: string;
  planta: string;
  sistema: string;
  maquina: string;
  estado: "pendiente" | "en_proceso" | "completada";
  progreso: number;
}

interface FormularioOrdenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden?: OrdenProduccion | null;
  onSave: (orden: Omit<OrdenProduccion, "id">) => void;
}

const plantas = ["Planta Norte", "Planta Central", "Planta Sur", "Fábrica Este", "Fábrica Oeste"];
const productos = ["Producto A-100", "Producto B-200", "Producto C-300", "Producto D-400", "Producto E-500"];

const sistemasPorPlanta: Record<string, string[]> = {
  "Planta Norte": ["Sistema de Mezcla A", "Sistema de Envasado", "Sistema de Control"],
  "Planta Central": ["Línea de Producción 1", "Línea de Producción 2", "Sistema de Almacenamiento"],
  "Planta Sur": ["Sistema Automatizado", "Sistema Manual", "Sistema de Calidad"],
  "Fábrica Este": ["Módulo de Procesamiento", "Módulo de Empaque"],
  "Fábrica Oeste": ["Unidad de Fabricación A", "Unidad de Fabricación B", "Unidad de Testing"],
};

const maquinasPorSistema: Record<string, string[]> = {
  "Sistema de Mezcla A": ["Mezcladora M-001", "Mezcladora M-002", "Agitador AG-01"],
  "Sistema de Envasado": ["Envasadora ENV-01", "Selladora SEL-01"],
  "Sistema de Control": ["PLC Principal", "HMI Control"],
  "Línea de Producción 1": ["Transportador T-01", "Robot R-01", "Prensa P-01"],
  "Línea de Producción 2": ["Transportador T-02", "Robot R-02", "Prensa P-02"],
  "Sistema de Almacenamiento": ["Grúa G-01", "Estantería Automática"],
  "Sistema Automatizado": ["Brazo Robótico BR-01", "Sensor Array SA-01"],
  "Sistema Manual": ["Estación de Trabajo ET-01", "Estación de Trabajo ET-02"],
  "Sistema de Calidad": ["Analizador AN-01", "Medidor MED-01"],
  "Módulo de Procesamiento": ["Procesador PROC-01", "Filtro F-01"],
  "Módulo de Empaque": ["Empacadora EMP-01", "Etiquetadora ETQ-01"],
  "Unidad de Fabricación A": ["CNC-01", "Torno T-01"],
  "Unidad de Fabricación B": ["CNC-02", "Fresadora FR-01"],
  "Unidad de Testing": ["Banco de Pruebas BP-01", "Cámara Climática CC-01"],
};

const FormularioOrden = ({ open, onOpenChange, orden, onSave }: FormularioOrdenProps) => {
  const [form, setForm] = useState({
    producto: "",
    cantidad: "",
    fechaInicio: "",
    horaInicio: "08:00",
    fechaFin: "",
    horaFin: "17:00",
    planta: "",
    sistema: "",
    maquina: "",
    estado: "pendiente" as "pendiente" | "en_proceso" | "completada",
    progreso: 0,
  });

  const sistemasDisponibles = form.planta ? sistemasPorPlanta[form.planta] || [] : [];
  const maquinasDisponibles = form.sistema ? maquinasPorSistema[form.sistema] || [] : [];

  useEffect(() => {
    if (orden) {
      setForm({
        producto: orden.producto,
        cantidad: String(orden.cantidad),
        fechaInicio: orden.fechaInicio,
        horaInicio: orden.horaInicio || "08:00",
        fechaFin: orden.fechaFin,
        horaFin: orden.horaFin || "17:00",
        planta: orden.planta,
        sistema: orden.sistema || "",
        maquina: orden.maquina || "",
        estado: orden.estado,
        progreso: orden.progreso,
      });
    } else {
      setForm({
        producto: "",
        cantidad: "",
        fechaInicio: "",
        horaInicio: "08:00",
        fechaFin: "",
        horaFin: "17:00",
        planta: "",
        sistema: "",
        maquina: "",
        estado: "pendiente",
        progreso: 0,
      });
    }
  }, [orden, open]);

  const handlePlantaChange = (planta: string) => {
    setForm({ ...form, planta, sistema: "", maquina: "" });
  };

  const handleSistemaChange = (sistema: string) => {
    setForm({ ...form, sistema, maquina: "" });
  };

  const handleSubmit = () => {
    if (!form.producto || !form.cantidad || !form.fechaInicio || !form.fechaFin || !form.planta) {
      return;
    }
    onSave({
      producto: form.producto,
      cantidad: parseInt(form.cantidad),
      fechaInicio: form.fechaInicio,
      horaInicio: form.horaInicio,
      fechaFin: form.fechaFin,
      horaFin: form.horaFin,
      planta: form.planta,
      sistema: form.sistema,
      maquina: form.maquina,
      estado: form.estado,
      progreso: form.progreso,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{orden ? "Editar Orden" : "Nueva Orden de Producción"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Producto</Label>
            <Select value={form.producto} onValueChange={(v) => setForm({...form, producto: v})}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {productos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cantidad (unidades)</Label>
            <Input 
              type="number"
              value={form.cantidad}
              onChange={(e) => setForm({...form, cantidad: e.target.value})}
              placeholder="5000"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>Planta</Label>
            <Select value={form.planta} onValueChange={handlePlantaChange}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Seleccionar planta" />
              </SelectTrigger>
              <SelectContent>
                {plantas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sistema</Label>
              <Select 
                value={form.sistema} 
                onValueChange={handleSistemaChange}
                disabled={!form.planta}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={form.planta ? "Seleccionar sistema" : "Primero selecciona planta"} />
                </SelectTrigger>
                <SelectContent>
                  {sistemasDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Máquina</Label>
              <Select 
                value={form.maquina} 
                onValueChange={(v) => setForm({...form, maquina: v})}
                disabled={!form.sistema}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={form.sistema ? "Seleccionar máquina" : "Primero selecciona sistema"} />
                </SelectTrigger>
                <SelectContent>
                  {maquinasDisponibles.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input 
                type="date"
                value={form.fechaInicio}
                onChange={(e) => setForm({...form, fechaInicio: e.target.value})}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Hora Inicio</Label>
              <Input 
                type="time"
                value={form.horaInicio}
                onChange={(e) => setForm({...form, horaInicio: e.target.value})}
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input 
                type="date"
                value={form.fechaFin}
                onChange={(e) => setForm({...form, fechaFin: e.target.value})}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Hora Fin</Label>
              <Input 
                type="time"
                value={form.horaFin}
                onChange={(e) => setForm({...form, horaFin: e.target.value})}
                className="bg-background border-border"
              />
            </div>
          </div>

          {orden && (
            <>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v: "pendiente" | "en_proceso" | "completada") => setForm({...form, estado: v})}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_proceso">En Proceso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Progreso (%)</Label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  value={form.progreso}
                  onChange={(e) => setForm({...form, progreso: parseInt(e.target.value) || 0})}
                  className="bg-background border-border"
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormularioOrden;
