import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";

interface FormularioOrdenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
        estado: "pendiente",
        progreso: 0,
      });
    }
  }, [orden, open]);

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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Guardar Orden
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormularioOrden;