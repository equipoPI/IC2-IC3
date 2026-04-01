import { useState, useEffect } from "react";
import { Save, X, Plus, Trash2 } from "lucide-react";
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
import { useStorage } from "@/contexts/StorageContext";

interface IngredienteSeleccionado {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

interface Plantilla {
  id: string;
  nombre: string;
  tipo: string;
  ingredientes: string;
  tiempoEstimado: string;
}

interface FormularioPlantillaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantilla?: Plantilla | null;
  onSave: (plantilla: Omit<Plantilla, "id">) => void;
}

const tipos = ["Producción", "Especialidad", "Mantenimiento", "Calibración"];
const unidades = ["L", "kg", "g", "ml", "unidades"];

const FormularioPlantilla = ({ open, onOpenChange, plantilla, onSave }: FormularioPlantillaProps) => {
  const { ingredients, storageUnits } = useStorage();
  
  const [form, setForm] = useState({
    nombre: "",
    tipo: "",
    tiempoHoras: "",
    tiempoMinutos: "",
  });
  
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState<IngredienteSeleccionado[]>([]);
  const [nuevoIngrediente, setNuevoIngrediente] = useState({ id: "", cantidad: "", unidad: "L" });

  // Combine system ingredients with storage unit contents
  const ingredientesDisponibles = [
    ...ingredients.map(i => ({ id: i.id, nombre: i.name, categoria: "Ingrediente" })),
    ...storageUnits.filter(u => u.content).map(u => ({ 
      id: `storage-${u.id}`, 
      nombre: `${u.content} (${u.name})`, 
      categoria: "Almacenamiento" 
    }))
  ];

  useEffect(() => {
    if (plantilla) {
      // Parse existing time format (e.g., "2h 30m")
      const timeMatch = plantilla.tiempoEstimado.match(/(\d+)h?\s*(\d+)?m?/);
      const horas = timeMatch?.[1] || "";
      const minutos = timeMatch?.[2] || "";
      
      // Parse existing ingredients
      const parsedIngredientes: IngredienteSeleccionado[] = [];
      if (plantilla.ingredientes) {
        const parts = plantilla.ingredientes.split(", ");
        parts.forEach((part, idx) => {
          const match = part.match(/(.+?)\s*\((\d+(?:\.\d+)?)\s*(\w+)\)/);
          if (match) {
            parsedIngredientes.push({
              id: `existing-${idx}`,
              nombre: match[1].trim(),
              cantidad: parseFloat(match[2]),
              unidad: match[3]
            });
          }
        });
      }
      
      setForm({
        nombre: plantilla.nombre,
        tipo: plantilla.tipo,
        tiempoHoras: horas,
        tiempoMinutos: minutos,
      });
      setIngredientesSeleccionados(parsedIngredientes);
    } else {
      setForm({ nombre: "", tipo: "", tiempoHoras: "", tiempoMinutos: "" });
      setIngredientesSeleccionados([]);
    }
  }, [plantilla, open]);

  const handleAddIngrediente = () => {
    if (!nuevoIngrediente.id || !nuevoIngrediente.cantidad) return;
    
    const ingrediente = ingredientesDisponibles.find(i => i.id === nuevoIngrediente.id);
    if (!ingrediente) return;
    
    setIngredientesSeleccionados([
      ...ingredientesSeleccionados,
      {
        id: nuevoIngrediente.id,
        nombre: ingrediente.nombre,
        cantidad: parseFloat(nuevoIngrediente.cantidad),
        unidad: nuevoIngrediente.unidad
      }
    ]);
    setNuevoIngrediente({ id: "", cantidad: "", unidad: "L" });
  };

  const handleRemoveIngrediente = (index: number) => {
    setIngredientesSeleccionados(ingredientesSeleccionados.filter((_, i) => i !== index));
  };

  const handleNumericInput = (value: string, field: "tiempoHoras" | "tiempoMinutos" | "cantidad") => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (field === "cantidad") {
      setNuevoIngrediente({ ...nuevoIngrediente, cantidad: numericValue });
    } else {
      setForm({ ...form, [field]: numericValue });
    }
  };

  const handleSubmit = () => {
    if (!form.nombre || !form.tipo || ingredientesSeleccionados.length === 0) {
      return;
    }
    
    const tiempoEstimado = `${form.tiempoHoras || "0"}h ${form.tiempoMinutos || "0"}m`;
    const ingredientesStr = ingredientesSeleccionados
      .map(i => `${i.nombre} (${i.cantidad} ${i.unidad})`)
      .join(", ");
    
    onSave({
      nombre: form.nombre,
      tipo: form.tipo,
      ingredientes: ingredientesStr,
      tiempoEstimado
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plantilla ? "Editar Plantilla" : "Nueva Plantilla"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input 
              value={form.nombre}
              onChange={(e) => setForm({...form, nombre: e.target.value})}
              placeholder="Nombre de la plantilla"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({...form, tipo: v})}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tiempo Estimado</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input 
                  value={form.tiempoHoras}
                  onChange={(e) => handleNumericInput(e.target.value, "tiempoHoras")}
                  placeholder="0"
                  className="bg-background border-border"
                  inputMode="numeric"
                />
                <span className="text-xs text-muted-foreground mt-1">Horas</span>
              </div>
              <div className="flex-1">
                <Input 
                  value={form.tiempoMinutos}
                  onChange={(e) => handleNumericInput(e.target.value, "tiempoMinutos")}
                  placeholder="0"
                  className="bg-background border-border"
                  inputMode="numeric"
                />
                <span className="text-xs text-muted-foreground mt-1">Minutos</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ingredientes / Componentes</Label>
            <div className="flex gap-2">
              <Select 
                value={nuevoIngrediente.id} 
                onValueChange={(v) => setNuevoIngrediente({...nuevoIngrediente, id: v})}
              >
                <SelectTrigger className="flex-1 bg-background border-border">
                  <SelectValue placeholder="Seleccionar ingrediente" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-48">
                  {ingredientesDisponibles.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      <span className="text-xs text-muted-foreground mr-1">[{i.categoria}]</span>
                      {i.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input 
                value={nuevoIngrediente.cantidad}
                onChange={(e) => handleNumericInput(e.target.value, "cantidad")}
                placeholder="Cant."
                className="w-20 bg-background border-border"
                inputMode="numeric"
              />
              <Select 
                value={nuevoIngrediente.unidad} 
                onValueChange={(v) => setNuevoIngrediente({...nuevoIngrediente, unidad: v})}
              >
                <SelectTrigger className="w-20 bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" size="icon" onClick={handleAddIngrediente} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {ingredientesSeleccionados.length > 0 && (
              <div className="mt-3 space-y-2">
                {ingredientesSeleccionados.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2 text-sm">
                    <span>{ing.nombre} - {ing.cantidad} {ing.unidad}</span>
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={() => handleRemoveIngrediente(idx)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!form.nombre || !form.tipo || ingredientesSeleccionados.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormularioPlantilla;
