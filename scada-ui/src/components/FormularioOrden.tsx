import { useState, useEffect } from "react";
<<<<<<< HEAD
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";
=======
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

import { apiFetch } from "@/lib/api";

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
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385

interface FormularioOrdenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
<<<<<<< HEAD
  orden?: any; // Si viene una orden, es para editar; si no, es nueva
  onSave: (data: any) => void;
}

const FormularioOrden = ({ open, onOpenChange, orden, onSave }: FormularioOrdenProps) => {
  // Estado para guardar las fábricas reales de PostgreSQL
  const [fabricasReales, setFabricasReales] = useState<{ id: number; nombre: string }[]>([]);

  // Estado del formulario (Añadimos "unidad")
  const [formData, setFormData] = useState({
    producto: "",
    cantidad: 0,
    unidad: "UN", // Por defecto arranca en unidades
    fechaInicio: new Date().toISOString().split("T")[0], // Fecha de hoy por defecto
    horaInicio: "08:00",
    fechaFin: new Date().toISOString().split("T")[0],
    horaFin: "17:00",
    planta: "",
    estado: "pendiente",
    progreso: 0,
  });

  // Efecto 1: Cargar datos si estamos editando una orden
  useEffect(() => {
    if (orden) {
      setFormData({
        producto: orden.producto || "",
        cantidad: orden.cantidad || 0,
        unidad: orden.unidad || "UN", // Cargamos la unidad si existe
        fechaInicio: orden.fechaInicio || "",
        horaInicio: orden.horaInicio || "08:00",
        fechaFin: orden.fechaFin || "",
        horaFin: orden.horaFin || "17:00",
        planta: orden.planta || "",
        estado: orden.estado || "pendiente",
        progreso: orden.progreso || 0,
      });
    } else {
      // Limpiar formulario si es una orden nueva
      setFormData({
        producto: "",
        cantidad: 0,
        unidad: "UN",
        fechaInicio: new Date().toISOString().split("T")[0],
        horaInicio: "08:00",
        fechaFin: new Date().toISOString().split("T")[0],
        horaFin: "17:00",
        planta: "",
=======
  orden?: OrdenProduccion | null;
  onSave: (orden: Omit<OrdenProduccion, "id">) => void;
}

const plantasFallback = ["Planta Principal", "Rafaela S.A.", "Planta Norte", "Planta Central"];
const productosFallback = ["Mezcla Estándar A", "Fórmula Premium B", "Receta Industrial C", "Compuesto Especial D"];

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

  const [plantas, setPlantas] = useState<string[]>(plantasFallback);
  const [productos, setProductos] = useState<string[]>(productosFallback);
  const [sistemasPorPlanta, setSistemasPorPlanta] = useState<Record<string, string[]>>({});
  const [maquinasPorSistema, setMaquinasPorSistema] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (open) {
      cargarDatosDelSistema();
    }
  }, [open]);

  const cargarDatosDelSistema = async () => {
    try {
      // 1. Cargar Fábricas (Plantas)
      const resFabricas = await apiFetch("/api/v1/fabricas/");
      let fabList: any[] = [];
      if (resFabricas.ok) {
        const data = await resFabricas.json();
        fabList = data.results || data;
        if (Array.isArray(fabList) && fabList.length > 0) {
          setPlantas(fabList.map((f: any) => f.nombre));
        }
      }

      // 2. Cargar Plantillas / Productos
      const resPlantillas = await apiFetch("/api/v1/plantillas-produccion/");
      if (resPlantillas.ok) {
        const dataP = await resPlantillas.json();
        const itemsP = dataP.results || dataP;
        if (Array.isArray(itemsP) && itemsP.length > 0) {
          setProductos(itemsP.map((p: any) => p.nombre));
        }
      }

      // 3. Cargar Sistemas por Planta
      const resSistemas = await apiFetch("/api/v1/sistemas/");
      let sistList: any[] = [];
      if (resSistemas.ok) {
        const dataS = await resSistemas.json();
        sistList = dataS.results || dataS;
        
        const sistMap: Record<string, string[]> = {};
        if (Array.isArray(sistList)) {
          sistList.forEach((s: any) => {
            const plantaNombre = s.fabrica_nombre || (fabList.find((f: any) => f.id === s.fabrica)?.nombre) || "Planta Principal";
            if (!sistMap[plantaNombre]) sistMap[plantaNombre] = [];
            if (!sistMap[plantaNombre].includes(s.nombre)) {
              sistMap[plantaNombre].push(s.nombre);
            }
          });
          setSistemasPorPlanta(sistMap);
        }
      }

      // 4. Cargar Dispositivos / Máquinas por Sistema
      const resDispositivos = await apiFetch("/api/v1/dispositivos-scada/");
      if (resDispositivos.ok) {
        const dataD = await resDispositivos.json();
        const dispList = dataD.results || dataD;
        const maqMap: Record<string, string[]> = {};
        if (Array.isArray(dispList)) {
          dispList.forEach((d: any) => {
            const sistemaNombre = d.sistema_nombre || (sistList.find((s: any) => s.id === d.sistema)?.nombre) || "Sistema General";
            if (!maqMap[sistemaNombre]) maqMap[sistemaNombre] = [];
            if (!maqMap[sistemaNombre].includes(d.nombre)) {
              maqMap[sistemaNombre].push(d.nombre);
            }
          });
          setMaquinasPorSistema(maqMap);
        }
      }
    } catch (e) {
      console.warn("Error cargando opciones del sistema:", e);
    }
  };

  const sistemasDisponibles = form.planta
    ? (sistemasPorPlanta[form.planta] || ["Sistema de Mezcla A1", "Sistema de Envasado"])
    : [];
  const maquinasDisponibles = form.sistema
    ? (maquinasPorSistema[form.sistema] || ["Mezcladora M-001", "Bomba Principal A"])
    : [];

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
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
        estado: "pendiente",
        progreso: 0,
      });
    }
  }, [orden, open]);

<<<<<<< HEAD
  // Efecto 2: Ir a buscar las plantas a Django cada vez que se abre el modal
  useEffect(() => {
    if (open) {
      fetch('http://localhost:8000/polls/api/fabricas/')
        .then(res => res.json())
        .then(data => {
          setFabricasReales(data);
          // Si es una orden nueva y hay fábricas, seleccionamos la primera por defecto
          if (!orden && data.length > 0 && !formData.planta) {
            setFormData(prev => ({ ...prev, planta: data[0].nombre }));
          }
        })
        .catch(err => console.error("Error al cargar fábricas:", err));
    }
  }, [open, orden]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
=======
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
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
<<<<<<< HEAD
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {orden ? "Editar Orden de Producción" : "Nueva Orden de Producción"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Producto a fabricar</Label>
              <Input 
                required 
                placeholder="Ej: Dulce de Leche Clásico" 
                value={formData.producto}
                onChange={(e) => setFormData({...formData, producto: e.target.value})}
              />
            </div>
            
            {/* --- SECCIÓN DE CANTIDAD MODIFICADA --- */}
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  required 
                  min="1"
                  className="w-2/3"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({...formData, cantidad: parseInt(e.target.value) || 0})}
                />
                <Select 
                  value={formData.unidad} 
                  onValueChange={(value) => setFormData({...formData, unidad: value})}
                >
                  <SelectTrigger className="w-1/3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UN">UN</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="Lts">Litros</SelectItem>
                    <SelectItem value="ton">Ton</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* -------------------------------------- */}

            <div className="space-y-2">
              <Label>Planta de Destino</Label>
              <Select 
                value={formData.planta} 
                onValueChange={(value) => setFormData({...formData, planta: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar Planta" />
                </SelectTrigger>
                <SelectContent>
                  {fabricasReales.length === 0 ? (
                    <SelectItem value="sin_plantas" disabled>No hay plantas en BD</SelectItem>
                  ) : (
                    fabricasReales.map((fab) => (
                      <SelectItem key={fab.id} value={fab.nombre}>{fab.nombre}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input 
                type="date" 
                required 
                value={formData.fechaInicio}
                onChange={(e) => setFormData({...formData, fechaInicio: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Hora Inicio</Label>
              <Input 
                type="time" 
                required 
                value={formData.horaInicio}
                onChange={(e) => setFormData({...formData, horaInicio: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input 
                type="date" 
                required 
                value={formData.fechaFin}
                onChange={(e) => setFormData({...formData, fechaFin: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Hora Fin</Label>
              <Input 
                type="time" 
                required 
                value={formData.horaFin}
                onChange={(e) => setFormData({...formData, horaFin: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Estado Inicial</Label>
              <Select 
                value={formData.estado} 
                onValueChange={(value) => setFormData({...formData, estado: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
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
                value={formData.progreso}
                onChange={(e) => setFormData({...formData, progreso: parseInt(e.target.value) || 0})}
=======
      <DialogContent className="bg-card border-border sm:max-w-md max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>{orden ? "Editar Orden" : "Nueva Orden de Producción"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto pr-1 flex-1">
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
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
              />
            </div>
          </div>

<<<<<<< HEAD
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Guardar Orden
            </Button>
          </DialogFooter>
        </form>
=======
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
                <Select value={form.estado} onValueChange={(v: "pendiente" | "en_proceso" | "completada" | "cancelada") => setForm({...form, estado: v})}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_proceso">En Proceso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
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
        <DialogFooter className="shrink-0 pt-3 border-t border-border/40 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </DialogFooter>
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
      </DialogContent>
    </Dialog>
  );
};

<<<<<<< HEAD
export default FormularioOrden;
=======
export default FormularioOrden;
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
