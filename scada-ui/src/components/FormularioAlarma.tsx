import { useState, useEffect } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface Alarma {
  id: string;
  planta: string;
  sensorMaquina: string;
  descripcion: string;
  severidad: "alta" | "media" | "baja";
  fechaHora: string;
  estado: "abierta" | "cerrada";
}

interface FormularioAlarmaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alarma?: Alarma | null;
  onSave: (alarma: Omit<Alarma, "id" | "fechaHora">) => void;
}

const plantas = ["Planta Norte", "Planta Central", "Planta Sur", "Fábrica Este", "Fábrica Oeste"];
const sensores = [
  "Sensor Temp. Horno 1",
  "Bomba Principal P1",
  "PLC Control Central",
  "Sensor Presión Tanque A",
  "Motor Línea 2",
  "Válvula Reguladora V3",
];

const FormularioAlarma = ({ open, onOpenChange, alarma, onSave }: FormularioAlarmaProps) => {
  const [form, setForm] = useState({
    planta: "",
    sensorMaquina: "",
    descripcion: "",
    severidad: "media" as "alta" | "media" | "baja",
    estado: "abierta" as "abierta" | "cerrada",
  });

  useEffect(() => {
    if (alarma) {
      setForm({
        planta: alarma.planta,
        sensorMaquina: alarma.sensorMaquina,
        descripcion: alarma.descripcion,
        severidad: alarma.severidad,
        estado: alarma.estado,
      });
    } else {
      setForm({
        planta: "",
        sensorMaquina: "",
        descripcion: "",
        severidad: "media",
        estado: "abierta",
      });
    }
  }, [alarma, open]);

  const handleSubmit = () => {
    if (!form.planta || !form.sensorMaquina || !form.descripcion) {
      return;
    }
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{alarma ? "Editar Alarma" : "Nueva Alarma"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Planta</Label>
            <Select value={form.planta} onValueChange={(v) => setForm({...form, planta: v})}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Seleccionar planta" />
              </SelectTrigger>
              <SelectContent>
                {plantas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sensor/Máquina</Label>
            <Select value={form.sensorMaquina} onValueChange={(v) => setForm({...form, sensorMaquina: v})}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Seleccionar sensor" />
              </SelectTrigger>
              <SelectContent>
                {sensores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea 
              value={form.descripcion}
              onChange={(e) => setForm({...form, descripcion: e.target.value})}
              placeholder="Describe la alarma..."
              className="bg-background border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Severidad</Label>
              <Select value={form.severidad} onValueChange={(v: "alta" | "media" | "baja") => setForm({...form, severidad: v})}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v: "abierta" | "cerrada") => setForm({...form, estado: v})}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abierta">Abierta</SelectItem>
                  <SelectItem value="cerrada">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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

export default FormularioAlarma;
