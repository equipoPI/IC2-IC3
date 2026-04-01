import { useState, useMemo } from "react";
import { Calendar, FileText, Plus, Clock, Target, Edit, Trash2, Search, Wrench, CalendarDays, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import FormularioOrden from "@/components/FormularioOrden";
import FormularioPlantilla from "@/components/FormularioPlantilla";
import GanttChart, { GanttItem } from "@/components/GanttChart";
import CalendarioMensual, { CalendarEvent } from "@/components/CalendarioMensual";

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

interface Mantenimiento {
  id: string;
  nombre: string;
  fechaInicio: string;
  horaInicio: string;
  fechaFin: string;
  horaFin: string;
  planta: string;
  sistema: string;
  maquina: string;
  descripcion: string;
}

interface Plantilla {
  id: string;
  nombre: string;
  tipo: string;
  ingredientes: string;
  tiempoEstimado: string;
}

const ordenesIniciales: OrdenProduccion[] = [
  { id: "ORD-001", producto: "Producto A-100", cantidad: 5000, fechaInicio: "2024-01-15", horaInicio: "08:00", fechaFin: "2024-01-15", horaFin: "14:00", planta: "Planta Norte", sistema: "Sistema de Mezcla A", maquina: "Mezcladora M-001", estado: "en_proceso", progreso: 65 },
  { id: "ORD-002", producto: "Producto B-200", cantidad: 3000, fechaInicio: "2024-01-16", horaInicio: "09:30", fechaFin: "2024-01-16", horaFin: "15:30", planta: "Planta Central", sistema: "Línea de Producción 1", maquina: "Robot R-01", estado: "pendiente", progreso: 0 },
  { id: "ORD-003", producto: "Producto C-300", cantidad: 8000, fechaInicio: "2024-01-14", horaInicio: "07:00", fechaFin: "2024-01-14", horaFin: "19:00", planta: "Planta Sur", sistema: "Sistema Automatizado", maquina: "Brazo Robótico BR-01", estado: "completada", progreso: 100 },
  { id: "ORD-004", producto: "Producto D-400", cantidad: 2500, fechaInicio: "2024-01-17", horaInicio: "10:00", fechaFin: "2024-01-17", horaFin: "13:00", planta: "Fábrica Este", sistema: "Módulo de Procesamiento", maquina: "Procesador PROC-01", estado: "pendiente", progreso: 0 },
];

const mantenimientosIniciales: Mantenimiento[] = [
  { id: "MNT-001", nombre: "Mantenimiento preventivo M-001", fechaInicio: "2024-01-15", horaInicio: "14:30", fechaFin: "2024-01-15", horaFin: "16:00", planta: "Planta Norte", sistema: "Sistema de Mezcla A", maquina: "Mezcladora M-001", descripcion: "Revisión programada de componentes" },
  { id: "MNT-002", nombre: "Calibración sensores", fechaInicio: "2024-01-16", horaInicio: "07:00", fechaFin: "2024-01-16", horaFin: "09:00", planta: "Planta Central", sistema: "Línea de Producción 1", maquina: "Robot R-01", descripcion: "Calibración de sensores de posición" },
];

const plantillasIniciales: Plantilla[] = [
  { id: "REC-001", nombre: "Mezcla Estándar A", tipo: "Producción", ingredientes: "Componente A (45%), Componente B (30%), Aditivo X (25%)", tiempoEstimado: "2h 30m" },
  { id: "REC-002", nombre: "Fórmula Premium B", tipo: "Especialidad", ingredientes: "Base Premium (60%), Catalizador Y (20%), Estabilizador Z (20%)", tiempoEstimado: "3h 45m" },
  { id: "REC-003", nombre: "Receta Industrial C", tipo: "Producción", ingredientes: "Material Base (70%), Refuerzo R (15%), Aditivo Final (15%)", tiempoEstimado: "1h 15m" },
  { id: "REC-004", nombre: "Compuesto Especial D", tipo: "Especialidad", ingredientes: "Polímero P (50%), Agente A (25%), Modificador M (25%)", tiempoEstimado: "4h 00m" },
];

const sistemasPorPlanta: Record<string, string[]> = {
  "Planta Norte": ["Sistema de Mezcla A", "Sistema de Mezcla B", "Control de Calidad"],
  "Planta Central": ["Línea de Producción 1", "Línea de Producción 2", "Almacenamiento"],
  "Planta Sur": ["Sistema Automatizado", "Procesamiento", "Empaquetado"],
  "Fábrica Este": ["Módulo de Procesamiento", "Sistema de Control", "Distribución"],
};

const maquinasPorSistema: Record<string, string[]> = {
  "Sistema de Mezcla A": ["Mezcladora M-001", "Mezcladora M-002"],
  "Sistema de Mezcla B": ["Mezcladora M-003", "Mezcladora M-004"],
  "Control de Calidad": ["Analizador A-01", "Espectrómetro E-01"],
  "Línea de Producción 1": ["Robot R-01", "Robot R-02", "Transportador T-01"],
  "Línea de Producción 2": ["Robot R-03", "Robot R-04", "Transportador T-02"],
  "Almacenamiento": ["Grúa G-01", "Elevador E-01"],
  "Sistema Automatizado": ["Brazo Robótico BR-01", "Brazo Robótico BR-02"],
  "Procesamiento": ["Procesador P-01", "Procesador P-02"],
  "Empaquetado": ["Empaquetadora E-01", "Selladora S-01"],
  "Módulo de Procesamiento": ["Procesador PROC-01", "Procesador PROC-02"],
  "Sistema de Control": ["Controlador C-01", "Monitor M-01"],
  "Distribución": ["Cinta D-01", "Clasificador CL-01"],
};

const getEstadoConfig = (estado: OrdenProduccion["estado"]) => {
  switch (estado) {
    case "completada": return { label: "Completada", className: "bg-success/20 text-success border-success/30" };
    case "en_proceso": return { label: "En Proceso", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    case "pendiente": return { label: "Pendiente", className: "bg-warning/20 text-warning border-warning/30" };
  }
};

const PlanificacionProduccion = () => {
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>(ordenesIniciales);
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>(mantenimientosIniciales);
  const [plantillas, setPlantillas] = useState<Plantilla[]>(plantillasIniciales);
  const [ordenDialogOpen, setOrdenDialogOpen] = useState(false);
  const [plantillaDialogOpen, setPlantillaDialogOpen] = useState(false);
  const [mantenimientoDialogOpen, setMantenimientoDialogOpen] = useState(false);
  const [editingOrden, setEditingOrden] = useState<OrdenProduccion | null>(null);
  const [editingPlantilla, setEditingPlantilla] = useState<Plantilla | null>(null);

  // Mantenimiento form state
  const [mantenimientoForm, setMantenimientoForm] = useState({
    nombre: "",
    fechaInicio: "",
    horaInicio: "",
    fechaFin: "",
    horaFin: "",
    planta: "",
    sistema: "",
    maquina: "",
    descripcion: "",
  });

  // Filters for orders
  const [ordenSearch, setOrdenSearch] = useState("");
  const [ordenEstadoFilter, setOrdenEstadoFilter] = useState<string>("todos");
  const [ordenFechaInicio, setOrdenFechaInicio] = useState("");
  const [ordenFechaFin, setOrdenFechaFin] = useState("");
  const [ordenHoraInicio, setOrdenHoraInicio] = useState("");
  const [ordenHoraFin, setOrdenHoraFin] = useState("");

  // Search for templates
  const [plantillaSearch, setPlantillaSearch] = useState("");

  // View mode for production planning
  const [vistaProduccion, setVistaProduccion] = useState<"gantt" | "calendario">("gantt");

  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((orden) => {
      const matchesSearch = orden.producto.toLowerCase().includes(ordenSearch.toLowerCase()) ||
                           orden.planta.toLowerCase().includes(ordenSearch.toLowerCase()) ||
                           orden.id.toLowerCase().includes(ordenSearch.toLowerCase()) ||
                           (orden.sistema && orden.sistema.toLowerCase().includes(ordenSearch.toLowerCase())) ||
                           (orden.maquina && orden.maquina.toLowerCase().includes(ordenSearch.toLowerCase()));
      const matchesEstado = ordenEstadoFilter === "todos" || orden.estado === ordenEstadoFilter;
      
      // Date range filter
      const ordenDate = new Date(orden.fechaInicio);
      const matchesFechaInicio = !ordenFechaInicio || ordenDate >= new Date(ordenFechaInicio);
      const matchesFechaFin = !ordenFechaFin || ordenDate <= new Date(ordenFechaFin);
      
      // Time range filter
      const matchesHoraInicio = !ordenHoraInicio || orden.horaInicio >= ordenHoraInicio;
      const matchesHoraFin = !ordenHoraFin || orden.horaFin <= ordenHoraFin;
      
      return matchesSearch && matchesEstado && matchesFechaInicio && matchesFechaFin && matchesHoraInicio && matchesHoraFin;
    });
  }, [ordenes, ordenSearch, ordenEstadoFilter, ordenFechaInicio, ordenFechaFin, ordenHoraInicio, ordenHoraFin]);

  const plantillasFiltradas = useMemo(() => {
    return plantillas.filter((plantilla) =>
      plantilla.nombre.toLowerCase().includes(plantillaSearch.toLowerCase()) ||
      plantilla.tipo.toLowerCase().includes(plantillaSearch.toLowerCase()) ||
      plantilla.ingredientes.toLowerCase().includes(plantillaSearch.toLowerCase())
    );
  }, [plantillas, plantillaSearch]);

  // Convert to Gantt items
  const ganttItems: GanttItem[] = useMemo(() => {
    const orderItems: GanttItem[] = ordenes.map((orden) => ({
      id: orden.id,
      nombre: orden.producto,
      fechaInicio: orden.fechaInicio,
      horaInicio: orden.horaInicio,
      fechaFin: orden.fechaFin,
      horaFin: orden.horaFin,
      planta: orden.planta,
      sistema: orden.sistema,
      maquina: orden.maquina,
      tipo: "produccion" as const,
      estado: orden.estado,
    }));

    const mantItems: GanttItem[] = mantenimientos.map((mant) => ({
      id: mant.id,
      nombre: mant.nombre,
      fechaInicio: mant.fechaInicio,
      horaInicio: mant.horaInicio,
      fechaFin: mant.fechaFin,
      horaFin: mant.horaFin,
      planta: mant.planta,
      sistema: mant.sistema,
      maquina: mant.maquina,
      tipo: "mantenimiento" as const,
    }));

    return [...orderItems, ...mantItems];
  }, [ordenes, mantenimientos]);

  // Convert to calendar events
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const orderEvents: CalendarEvent[] = ordenes.map((orden) => ({
      id: orden.id,
      nombre: orden.producto,
      fechaInicio: orden.fechaInicio,
      horaInicio: orden.horaInicio,
      fechaFin: orden.fechaFin,
      horaFin: orden.horaFin,
      planta: orden.planta,
      sistema: orden.sistema,
      maquina: orden.maquina,
      tipo: "produccion" as const,
      estado: orden.estado,
    }));

    const mantEvents: CalendarEvent[] = mantenimientos.map((mant) => ({
      id: mant.id,
      nombre: mant.nombre,
      fechaInicio: mant.fechaInicio,
      horaInicio: mant.horaInicio,
      fechaFin: mant.fechaFin,
      horaFin: mant.horaFin,
      planta: mant.planta,
      sistema: mant.sistema,
      maquina: mant.maquina,
      tipo: "mantenimiento" as const,
    }));

    return [...orderEvents, ...mantEvents];
  }, [ordenes, mantenimientos]);

  const handleSaveOrden = (data: Omit<OrdenProduccion, "id">) => {
    if (editingOrden) {
      setOrdenes(ordenes.map((o) => o.id === editingOrden.id ? { ...o, ...data } : o));
      toast({ title: "Orden actualizada", description: "Los cambios se han guardado correctamente" });
    } else {
      const newOrden: OrdenProduccion = {
        id: `ORD-${String(ordenes.length + 1).padStart(3, "0")}`,
        ...data,
      };
      setOrdenes([...ordenes, newOrden]);
      toast({ title: "Orden creada", description: "La orden se ha registrado correctamente" });
    }
    setEditingOrden(null);
  };

  const handleDeleteOrden = (id: string) => {
    setOrdenes(ordenes.filter((o) => o.id !== id));
    toast({ title: "Orden eliminada", description: "La orden ha sido eliminada del sistema" });
  };

  const handleSavePlantilla = (data: Omit<Plantilla, "id">) => {
    if (editingPlantilla) {
      setPlantillas(plantillas.map((p) => p.id === editingPlantilla.id ? { ...p, ...data } : p));
      toast({ title: "Plantilla actualizada", description: "Los cambios se han guardado correctamente" });
    } else {
      const newPlantilla: Plantilla = {
        id: `REC-${String(plantillas.length + 1).padStart(3, "0")}`,
        ...data,
      };
      setPlantillas([...plantillas, newPlantilla]);
      toast({ title: "Plantilla creada", description: "La plantilla se ha registrado correctamente" });
    }
    setEditingPlantilla(null);
  };

  const handleDeletePlantilla = (id: string) => {
    setPlantillas(plantillas.filter((p) => p.id !== id));
    toast({ title: "Plantilla eliminada", description: "La plantilla ha sido eliminada del sistema" });
  };

  const handleSaveMantenimiento = () => {
    if (!mantenimientoForm.nombre || !mantenimientoForm.fechaInicio || !mantenimientoForm.horaInicio) {
      toast({ title: "Error", description: "Complete los campos obligatorios", variant: "destructive" });
      return;
    }

    const newMant: Mantenimiento = {
      id: `MNT-${String(mantenimientos.length + 1).padStart(3, "0")}`,
      ...mantenimientoForm,
    };
    setMantenimientos([...mantenimientos, newMant]);
    setMantenimientoDialogOpen(false);
    setMantenimientoForm({
      nombre: "",
      fechaInicio: "",
      horaInicio: "",
      fechaFin: "",
      horaFin: "",
      planta: "",
      sistema: "",
      maquina: "",
      descripcion: "",
    });
    toast({ title: "Mantenimiento programado", description: "El mantenimiento se ha añadido al calendario" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Planificación y Recetas</h1>
        <p className="text-muted-foreground mt-1">Gestiona la planificación de producción y las plantillas de recetas</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="planificacion" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="planificacion" className="gap-2">
            <Calendar className="h-4 w-4" />
            Planificación de la Producción
          </TabsTrigger>
          <TabsTrigger value="plantillas" className="gap-2">
            <FileText className="h-4 w-4" />
            Gestión de Plantillas
          </TabsTrigger>
        </TabsList>

        {/* Planificación Tab */}
        <TabsContent value="planificacion" className="space-y-6 mt-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Órdenes</p>
                    <p className="text-2xl font-bold text-foreground">{ordenes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">En Proceso</p>
                    <p className="text-2xl font-bold text-foreground">{ordenes.filter((o) => o.estado === "en_proceso").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendientes</p>
                    <p className="text-2xl font-bold text-foreground">{ordenes.filter((o) => o.estado === "pendiente").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <Target className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completadas</p>
                    <p className="text-2xl font-bold text-foreground">{ordenes.filter((o) => o.estado === "completada").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders Table */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">Órdenes de Producción</CardTitle>
              <Button size="sm" onClick={() => { setEditingOrden(null); setOrdenDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Orden
              </Button>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar órdenes..."
                      value={ordenSearch}
                      onChange={(e) => setOrdenSearch(e.target.value)}
                      className="pl-9 bg-background border-border"
                    />
                  </div>
                  <Select value={ordenEstadoFilter} onValueChange={setOrdenEstadoFilter}>
                    <SelectTrigger className="w-[160px] bg-background border-border">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_proceso">En Proceso</SelectItem>
                      <SelectItem value="completada">Completada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-4 items-start sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Desde:</span>
                    <Input
                      type="date"
                      value={ordenFechaInicio}
                      onChange={(e) => setOrdenFechaInicio(e.target.value)}
                      className="w-auto bg-background border-border"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Hasta:</span>
                    <Input
                      type="date"
                      value={ordenFechaFin}
                      onChange={(e) => setOrdenFechaFin(e.target.value)}
                      className="w-auto bg-background border-border"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-start sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Hora desde:</span>
                    <Input
                      type="time"
                      value={ordenHoraInicio}
                      onChange={(e) => setOrdenHoraInicio(e.target.value)}
                      className="w-auto bg-background border-border"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Hora hasta:</span>
                    <Input
                      type="time"
                      value={ordenHoraFin}
                      onChange={(e) => setOrdenHoraFin(e.target.value)}
                      className="w-auto bg-background border-border"
                    />
                  </div>
                  {(ordenFechaInicio || ordenFechaFin || ordenHoraInicio || ordenHoraFin) && (
                    <Button variant="ghost" size="sm" onClick={() => { setOrdenFechaInicio(""); setOrdenFechaFin(""); setOrdenHoraInicio(""); setOrdenHoraFin(""); }}>
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-muted-foreground">ID</TableHead>
                      <TableHead className="text-muted-foreground">Producto</TableHead>
                      <TableHead className="text-muted-foreground">Cantidad</TableHead>
                      <TableHead className="text-muted-foreground">Ubicación</TableHead>
                      <TableHead className="text-muted-foreground">Inicio</TableHead>
                      <TableHead className="text-muted-foreground">Fin</TableHead>
                      <TableHead className="text-muted-foreground">Estado</TableHead>
                      <TableHead className="text-muted-foreground">Progreso</TableHead>
                      <TableHead className="text-muted-foreground">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenesFiltradas.map((orden) => (
                      <TableRow key={orden.id}>
                        <TableCell className="font-mono text-foreground">{orden.id}</TableCell>
                        <TableCell className="text-foreground font-medium">{orden.producto}</TableCell>
                        <TableCell className="text-foreground">{orden.cantidad.toLocaleString()} uds</TableCell>
                        <TableCell className="text-foreground">
                          <div className="text-sm">
                            <div>{orden.planta}</div>
                            {orden.sistema && <div className="text-xs text-muted-foreground">{orden.sistema}</div>}
                            {orden.maquina && <div className="text-xs text-muted-foreground">{orden.maquina}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="text-sm">
                            <div>{new Date(orden.fechaInicio).toLocaleDateString("es-ES")}</div>
                            <div className="text-xs">{orden.horaInicio}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="text-sm">
                            <div>{new Date(orden.fechaFin).toLocaleDateString("es-ES")}</div>
                            <div className="text-xs">{orden.horaFin}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getEstadoConfig(orden.estado).className}>
                            {getEstadoConfig(orden.estado).label}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-32">
                          <div className="flex items-center gap-2">
                            <Progress value={orden.progreso} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground font-mono w-10">{orden.progreso}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingOrden(orden); setOrdenDialogOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteOrden(orden.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* View Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Vista:</span>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant={vistaProduccion === "gantt" ? "default" : "ghost"}
                size="sm"
                className="rounded-none gap-2"
                onClick={() => setVistaProduccion("gantt")}
              >
                <BarChart3 className="h-4 w-4" />
                Gantt
              </Button>
              <Button
                variant={vistaProduccion === "calendario" ? "default" : "ghost"}
                size="sm"
                className="rounded-none gap-2"
                onClick={() => setVistaProduccion("calendario")}
              >
                <CalendarDays className="h-4 w-4" />
                Calendario
              </Button>
            </div>
          </div>

          {/* Gantt Chart or Calendar */}
          {vistaProduccion === "gantt" ? (
            <GanttChart 
              items={ganttItems} 
              onAddMantenimiento={() => setMantenimientoDialogOpen(true)}
              onItemUpdate={(updatedItem) => {
                if (updatedItem.tipo === "produccion") {
                  setOrdenes(ordenes.map((o) => 
                    o.id === updatedItem.id 
                      ? { 
                          ...o, 
                          fechaInicio: updatedItem.fechaInicio,
                          horaInicio: updatedItem.horaInicio,
                          fechaFin: updatedItem.fechaFin,
                          horaFin: updatedItem.horaFin,
                        } 
                      : o
                  ));
                } else {
                  setMantenimientos(mantenimientos.map((m) => 
                    m.id === updatedItem.id 
                      ? { 
                          ...m, 
                          fechaInicio: updatedItem.fechaInicio,
                          horaInicio: updatedItem.horaInicio,
                          fechaFin: updatedItem.fechaFin,
                          horaFin: updatedItem.horaFin,
                        } 
                      : m
                  ));
                }
              }}
            />
          ) : (
            <CalendarioMensual 
              eventos={calendarEvents}
              onEventClick={(evento) => {
                if (evento.tipo === "produccion") {
                  const orden = ordenes.find((o) => o.id === evento.id);
                  if (orden) {
                    setEditingOrden(orden);
                    setOrdenDialogOpen(true);
                  }
                }
              }}
            />
          )}
        </TabsContent>

        {/* Plantillas Tab */}
        <TabsContent value="plantillas" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">Gestión de Plantillas (Recetas)</CardTitle>
              <Button size="sm" onClick={() => { setEditingPlantilla(null); setPlantillaDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Plantilla
              </Button>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative max-w-xs mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar plantillas..."
                  value={plantillaSearch}
                  onChange={(e) => setPlantillaSearch(e.target.value)}
                  className="pl-9 bg-background border-border"
                />
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-muted-foreground">ID</TableHead>
                      <TableHead className="text-muted-foreground">Nombre</TableHead>
                      <TableHead className="text-muted-foreground">Tipo</TableHead>
                      <TableHead className="text-muted-foreground">Ingredientes</TableHead>
                      <TableHead className="text-muted-foreground">Tiempo Estimado</TableHead>
                      <TableHead className="text-muted-foreground">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plantillasFiltradas.map((plantilla) => (
                      <TableRow key={plantilla.id}>
                        <TableCell className="font-mono text-foreground">{plantilla.id}</TableCell>
                        <TableCell className="text-foreground font-medium">{plantilla.nombre}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={plantilla.tipo === "Producción" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-purple-500/20 text-purple-400 border-purple-500/30"}
                          >
                            {plantilla.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-md truncate">{plantilla.ingredientes}</TableCell>
                        <TableCell className="font-mono text-foreground">{plantilla.tiempoEstimado}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingPlantilla(plantilla); setPlantillaDialogOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeletePlantilla(plantilla.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormularioOrden
        open={ordenDialogOpen}
        onOpenChange={setOrdenDialogOpen}
        orden={editingOrden}
        onSave={handleSaveOrden}
      />

      <FormularioPlantilla
        open={plantillaDialogOpen}
        onOpenChange={setPlantillaDialogOpen}
        plantilla={editingPlantilla}
        onSave={handleSavePlantilla}
      />

      {/* Mantenimiento Dialog */}
      <Dialog open={mantenimientoDialogOpen} onOpenChange={setMantenimientoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-400" />
              Programar Mantenimiento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Mantenimiento *</Label>
              <Input
                value={mantenimientoForm.nombre}
                onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, nombre: e.target.value })}
                placeholder="Ej: Mantenimiento preventivo bomba"
                className="bg-background border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={mantenimientoForm.fechaInicio}
                  onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, fechaInicio: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Inicio *</Label>
                <Input
                  type="time"
                  value={mantenimientoForm.horaInicio}
                  onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, horaInicio: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={mantenimientoForm.fechaFin}
                  onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, fechaFin: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Fin</Label>
                <Input
                  type="time"
                  value={mantenimientoForm.horaFin}
                  onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, horaFin: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Planta</Label>
              <Select
                value={mantenimientoForm.planta}
                onValueChange={(v) => setMantenimientoForm({ ...mantenimientoForm, planta: v, sistema: "", maquina: "" })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Seleccionar planta" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(sistemasPorPlanta).map((planta) => (
                    <SelectItem key={planta} value={planta}>{planta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mantenimientoForm.planta && (
              <div className="space-y-2">
                <Label>Sistema</Label>
                <Select
                  value={mantenimientoForm.sistema}
                  onValueChange={(v) => setMantenimientoForm({ ...mantenimientoForm, sistema: v, maquina: "" })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Seleccionar sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    {sistemasPorPlanta[mantenimientoForm.planta]?.map((sistema) => (
                      <SelectItem key={sistema} value={sistema}>{sistema}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {mantenimientoForm.sistema && (
              <div className="space-y-2">
                <Label>Máquina</Label>
                <Select
                  value={mantenimientoForm.maquina}
                  onValueChange={(v) => setMantenimientoForm({ ...mantenimientoForm, maquina: v })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Seleccionar máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    {maquinasPorSistema[mantenimientoForm.sistema]?.map((maquina) => (
                      <SelectItem key={maquina} value={maquina}>{maquina}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={mantenimientoForm.descripcion}
                onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, descripcion: e.target.value })}
                placeholder="Descripción del mantenimiento..."
                className="bg-background border-border"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setMantenimientoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveMantenimiento} className="bg-orange-500 hover:bg-orange-600">
                <Wrench className="h-4 w-4 mr-2" />
                Programar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanificacionProduccion;
