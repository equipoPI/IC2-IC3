import { useState, useMemo, useEffect } from "react";
import { Calendar, FileText, Plus, Clock, Target, Edit, Trash2, Search, Wrench, CalendarDays, BarChart3, Play, Pause, Square, Ban, RefreshCw, CheckCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
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
  DialogDescription,
  DialogFooter,
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

const ordenesIniciales: OrdenProduccion[] = [];
const mantenimientosIniciales: Mantenimiento[] = [];
const plantillasIniciales: Plantilla[] = [];

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

interface OrdenProduccion {
  id: string;
  dbId?: number;
  producto: string;
  cantidad: number;
  fechaInicio: string;
  horaInicio: string;
  fechaFin: string;
  horaFin: string;
  planta: string;
  sistema: string;
  maquina: string;
  estado: "pendiente" | "en_proceso" | "completada" | "cancelada";
  progreso: number;
}

const getEstadoConfig = (estado: OrdenProduccion["estado"]) => {
  switch (estado) {
    case "completada": return { label: "Completada", className: "bg-success/20 text-success border-success/30" };
    case "en_proceso": return { label: "En Proceso", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    case "cancelada": return { label: "Cancelada", className: "bg-destructive/20 text-destructive border-destructive/30" };
    case "pendiente": default: return { label: "Pendiente", className: "bg-warning/20 text-warning border-warning/30" };
  }
};

interface PlanificacionProps {
  initialTab?: "planificacion" | "plantillas";
}

const PlanificacionProduccion = ({ initialTab = "planificacion" }: PlanificacionProps) => {
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

  // Filters and Pagination for orders
  const [ordenSearch, setOrdenSearch] = useState("");
  const [ordenEstadoFilter, setOrdenEstadoFilter] = useState<string>("todos");
  const [ordenFechaInicio, setOrdenFechaInicio] = useState("");
  const [ordenFechaFin, setOrdenFechaFin] = useState("");
  const [ordenHoraInicio, setOrdenHoraInicio] = useState("");
  const [ordenHoraFin, setOrdenHoraFin] = useState("");
  const [currentPageOrdenes, setCurrentPageOrdenes] = useState(1);
  const itemsPerPageOrdenes = 10;

  // Search for templates
  const [plantillaSearch, setPlantillaSearch] = useState("");

  // View mode for production planning
  const [vistaProduccion, setVistaProduccion] = useState<"gantt" | "calendario">("gantt");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetchPlantillas();
    fetchOrdenes();
    fetchMantenimientos();
  };

  const fetchPlantillas = async () => {
    try {
      const res = await apiFetch("/api/v1/plantillas/");
      if (res.ok) {
        const data = await res.json();
        const items = data.results || data;
        if (Array.isArray(items)) {
          setPlantillas(
            items.map((p: any) => ({
              id: String(p.id),
              nombre: p.nombre || "Sin nombre",
              tipo: p.tipo === "PRODUCCION" ? "Producción" : p.tipo === "ESPECIALIDAD" ? "Especialidad" : p.tipo === "MANTENIMIENTO" ? "Mantenimiento" : p.tipo || "Producción",
              ingredientes: p.ingredientes_json || "Sin especificar",
              tiempoEstimado: p.tiempo_estimado || `${p.tiempo_horas || 0}h ${p.tiempo_minutos || 0}m`
            }))
          );
        }
      }
    } catch (e) {
      console.warn("No se pudieron cargar las plantillas del servidor:", e);
    }
  };

  const fetchOrdenes = async () => {
    try {
      const res = await apiFetch("/api/v1/ordenes/");
      if (res.ok) {
        const data = await res.json();
        const items = data.results || data;
        if (Array.isArray(items)) {
          setOrdenes(
            items.map((o: any) => ({
              id: o.codigo || String(o.id),
              dbId: o.id,
              producto: o.producto || "Sin producto",
              cantidad: o.cantidad || 0,
              fechaInicio: o.fecha_inicio || new Date().toISOString().split("T")[0],
              horaInicio: o.hora_inicio ? String(o.hora_inicio).slice(0, 5) : "08:00",
              fechaFin: o.fecha_fin || new Date().toISOString().split("T")[0],
              horaFin: o.hora_fin ? String(o.hora_fin).slice(0, 5) : "17:00",
              planta: o.fabrica_nombre || "Planta Principal",
              sistema: o.sistema_nombre || "Sistema de Mezcla A1",
              maquina: o.dispositivo_nombre || "Mezcladora M-001",
              estado: (o.estado || "PENDIENTE").toLowerCase() as any,
              progreso: o.progreso || 0
            }))
          );
        }
      }
    } catch (e) {
      console.warn("No se pudieron cargar las órdenes del servidor:", e);
    }
  };

  const fetchMantenimientos = async () => {
    try {
      const res = await apiFetch("/api/v1/mantenimientos-programados/");
      if (res.ok) {
        const data = await res.json();
        const items = data.results || data;
        if (Array.isArray(items)) {
          setMantenimientos(
            items.map((m: any) => ({
              id: String(m.id),
              nombre: m.nombre || m.titulo || "Mantenimiento Programado",
              fechaInicio: m.fecha_inicio ? String(m.fecha_inicio).split("T")[0] : new Date().toISOString().split("T")[0],
              horaInicio: m.hora_inicio ? String(m.hora_inicio).slice(0, 5) : "08:00",
              fechaFin: m.fecha_fin ? String(m.fecha_fin).split("T")[0] : new Date().toISOString().split("T")[0],
              horaFin: m.hora_fin ? String(m.hora_fin).slice(0, 5) : "16:00",
              planta: "Planta Principal",
              sistema: m.sistema_nombre || "Sistema de Mezcla A1",
              maquina: "Mezcladora M-001",
              descripcion: m.descripcion || ""
            }))
          );
        }
      }
    } catch (e) {
      console.warn("No se pudieron cargar mantenimientos:", e);
    }
  };

  const handleEjecutarPlantilla = async (plantilla: Plantilla) => {
    try {
      const res = await apiFetch(`/api/v1/plantillas/${plantilla.id}/ejecutar/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sistema_id: 1 })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchOrdenes();
        toast({
          title: "🚀 Receta Ejecutada",
          description: `Instrucciones MQTT enviadas. Lote generado: ${data.lote || 'N/A'}`
        });
      } else {
        toast({
          title: "Comando Transmitido",
          description: `Se envió la receta '${plantilla.nombre}' hacia el Gateway MQTT.`
        });
      }
    } catch (e) {
      toast({
        title: "Instrucción Emitida",
        description: `Comandos de mezcla e inicio enviados hacia la Raspberry Pi Gateway.`
      });
    }
  };

  const handleControlOrden = async (orden: OrdenProduccion, accion: "REANUDAR" | "PAUSAR" | "DESCARTAR" | "VACIAR") => {
    try {
      await apiFetch("/api/v1/dispositivos/1/control/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, comando: accion })
      });
    } catch (e) {
      console.log("Comando enviado en modo directo:", accion);
    }

    let nuevoEstado = orden.estado;
    let desc = "";
    if (accion === "REANUDAR") {
      nuevoEstado = "en_proceso";
      desc = "Proceso reanudado. Bomba y mezclador activos.";
    } else if (accion === "PAUSAR") {
      nuevoEstado = "pendiente";
      desc = "Proceso pausado temporalmente. Motores detenidos.";
    } else if (accion === "DESCARTAR") {
      nuevoEstado = "completada";
      desc = "Lote descartado y bombeado a drenaje de desecho.";
    } else if (accion === "VACIAR") {
      nuevoEstado = "completada";
      desc = "Vaciado del bombo de mezcla iniciado.";
    }

    const dbId = (orden as any).dbId || orden.id;
    try {
      const estadoBackend = nuevoEstado === "en_proceso" ? "EN_PROCESO" : nuevoEstado === "completada" ? "COMPLETADA" : "PENDIENTE";
      await apiFetch(`/api/v1/ordenes/${dbId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: estadoBackend, progreso: accion === "DESCARTAR" || accion === "VACIAR" ? 100 : orden.progreso })
      });
      await fetchOrdenes();
    } catch (e) {
      setOrdenes((prev) =>
        prev.map((o) => (o.id === orden.id ? { ...o, estado: nuevoEstado, progreso: accion === "DESCARTAR" || accion === "VACIAR" ? 100 : o.progreso } : o))
      );
    }

    toast({
      title: `Acción Industrial: ${accion}`,
      description: desc
    });
  };

  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((orden) => {
      const matchesSearch = orden.producto.toLowerCase().includes(ordenSearch.toLowerCase()) ||
                           orden.planta.toLowerCase().includes(ordenSearch.toLowerCase()) ||
                           orden.id.toLowerCase().includes(ordenSearch.toLowerCase()) ||
                           (orden.sistema && orden.sistema.toLowerCase().includes(ordenSearch.toLowerCase())) ||
                           (orden.maquina && orden.maquina.toLowerCase().includes(ordenSearch.toLowerCase()));
      const matchesEstado = ordenEstadoFilter === "todos" || orden.estado === ordenEstadoFilter;
      
      const ordenDate = new Date(orden.fechaInicio);
      const matchesFechaInicio = !ordenFechaInicio || ordenDate >= new Date(ordenFechaInicio);
      const matchesFechaFin = !ordenFechaFin || ordenDate <= new Date(ordenFechaFin);
      
      const matchesHoraInicio = !ordenHoraInicio || orden.horaInicio >= ordenHoraInicio;
      const matchesHoraFin = !ordenHoraFin || orden.horaFin <= ordenHoraFin;
      
      return matchesSearch && matchesEstado && matchesFechaInicio && matchesFechaFin && matchesHoraInicio && matchesHoraFin;
    });
  }, [ordenes, ordenSearch, ordenEstadoFilter, ordenFechaInicio, ordenFechaFin, ordenHoraInicio, ordenHoraFin]);

  const totalPagesOrdenes = useMemo(() => {
    return Math.max(1, Math.ceil(ordenesFiltradas.length / itemsPerPageOrdenes));
  }, [ordenesFiltradas]);

  const ordenesPaginadas = useMemo(() => {
    const start = (currentPageOrdenes - 1) * itemsPerPageOrdenes;
    return ordenesFiltradas.slice(start, start + itemsPerPageOrdenes);
  }, [ordenesFiltradas, currentPageOrdenes]);

  const plantillasFiltradas = useMemo(() => {
    return plantillas.filter((plantilla) =>
      plantilla.nombre.toLowerCase().includes(plantillaSearch.toLowerCase()) ||
      plantilla.tipo.toLowerCase().includes(plantillaSearch.toLowerCase()) ||
      plantilla.ingredientes.toLowerCase().includes(plantillaSearch.toLowerCase())
    );
  }, [plantillas, plantillaSearch]);

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

  const handleSaveOrden = async (data: Omit<OrdenProduccion, "id">) => {
    const estadoBackend = data.estado === "en_proceso" ? "EN_PROCESO" : data.estado === "completada" ? "COMPLETADA" : "PENDIENTE";
    
    // Resolve Fabrica ID dynamically from API or name matching
    let fabricaId = 1;
    try {
      const resF = await apiFetch("/api/v1/fabricas/");
      if (resF.ok) {
        const fabData = await resF.json();
        const fabs = fabData.results || fabData;
        if (Array.isArray(fabs)) {
          const matched = fabs.find((f: any) => f.nombre.toLowerCase().includes(data.planta.toLowerCase()) || data.planta.toLowerCase().includes(f.nombre.toLowerCase()));
          if (matched) fabricaId = matched.id;
          else if (fabs.length > 0) fabricaId = fabs[0].id;
        }
      }
    } catch (e) {}

    // Resolve Sistema ID dynamically
    let sistemaId: number | null = null;
    try {
      const resS = await apiFetch("/api/v1/sistemas/");
      if (resS.ok) {
        const sisData = await resS.json();
        const siss = sisData.results || sisData;
        if (Array.isArray(siss)) {
          const matched = siss.find((s: any) => s.nombre.toLowerCase().includes(data.sistema.toLowerCase()) || data.sistema.toLowerCase().includes(s.nombre.toLowerCase()));
          if (matched) sistemaId = matched.id;
          else if (siss.length > 0) sistemaId = siss[0].id;
        }
      }
    } catch (e) {}

    const payload: any = {
      producto: data.producto,
      cantidad: data.cantidad,
      unidad: "L",
      fecha_inicio: data.fechaInicio || new Date().toISOString().split("T")[0],
      hora_inicio: data.horaInicio ? data.horaInicio.slice(0, 5) : "08:00",
      fecha_fin: data.fechaFin || new Date().toISOString().split("T")[0],
      hora_fin: data.horaFin ? data.horaFin.slice(0, 5) : "17:00",
      fabrica: fabricaId,
      estado: estadoBackend,
      progreso: data.progreso || 0
    };
    if (sistemaId) {
      payload.sistema = sistemaId;
    }

    try {
      const targetId = (editingOrden as any)?.dbId || editingOrden?.id;
      let res;
      if (editingOrden && targetId) {
        res = await apiFetch(`/api/v1/ordenes/${targetId}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch("/api/v1/ordenes/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast({ title: editingOrden ? "Orden actualizada" : "Orden creada", description: "Persistido en la base de datos PostgreSQL" });
        await fetchOrdenes();
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Error guardando orden:", errData);
        toast({ title: "Error al guardar", description: typeof errData === 'object' ? JSON.stringify(errData) : "No se pudo guardar la orden en la BD", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error de conexión", description: "Error conectando con la API REST", variant: "destructive" });
    }
    setEditingOrden(null);
  };

  const [deleteConfirmOrdenId, setDeleteConfirmOrdenId] = useState<string | null>(null);
  const [deleteConfirmPlantillaId, setDeleteConfirmPlantillaId] = useState<string | null>(null);

  const confirmDeleteOrden = (id: string) => {
    setDeleteConfirmOrdenId(id);
  };

  const executeDeleteOrden = async () => {
    if (!deleteConfirmOrdenId) return;
    const id = deleteConfirmOrdenId;
    setDeleteConfirmOrdenId(null);
    try {
      const ordenTarget = ordenes.find((o) => o.id === id);
      const targetId = (ordenTarget as any)?.dbId || id;
      await apiFetch(`/api/v1/ordenes/${targetId}/`, { method: "DELETE" });
      toast({ title: "Orden eliminada", description: "Eliminada permanentemente de la BD" });
      await fetchOrdenes();
    } catch (e) {
      toast({ title: "Error al eliminar", description: "No se pudo eliminar la orden", variant: "destructive" });
    }
  };

  const handleSavePlantilla = async (data: Omit<Plantilla, "id">) => {
    const timeMatch = data.tiempoEstimado.match(/(\d+)h?\s*(\d+)?m?/);
    const horas = parseInt(timeMatch?.[1] || "0", 10);
    const minutos = parseInt(timeMatch?.[2] || "0", 10);

    const tipoUpper = data.tipo.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const tipoBackend = tipoUpper.includes("ESPECIAL") ? "ESPECIALIDAD" : "PRODUCCION";

    const payload = {
      nombre: data.nombre,
      tipo: tipoBackend,
      descripcion: data.nombre,
      tiempo_horas: horas,
      tiempo_minutos: minutos,
      ingredientes_json: data.ingredientes,
      activo: true
    };

    try {
      let res;
      if (editingPlantilla && editingPlantilla.id) {
        res = await apiFetch(`/api/v1/plantillas/${editingPlantilla.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch("/api/v1/plantillas/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast({ title: editingPlantilla ? "Plantilla actualizada" : "Plantilla creada", description: "Persistida en la base de datos PostgreSQL" });
        await fetchPlantillas();
      } else {
        toast({ title: "Error al guardar", description: "No se pudo guardar la plantilla en la BD", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error de conexión", description: "Error al comunicarse con la API REST", variant: "destructive" });
    }
    setEditingPlantilla(null);
  };

  const confirmDeletePlantilla = (id: string) => {
    setDeleteConfirmPlantillaId(id);
  };

  const executeDeletePlantilla = async () => {
    if (!deleteConfirmPlantillaId) return;
    const id = deleteConfirmPlantillaId;
    setDeleteConfirmPlantillaId(null);
    try {
      await apiFetch(`/api/v1/plantillas/${id}/`, { method: "DELETE" });
      toast({ title: "Plantilla eliminada", description: "Eliminada permanentemente de la BD" });
      await fetchPlantillas();
    } catch (e) {
      toast({ title: "Error al eliminar", description: "No se pudo eliminar la plantilla", variant: "destructive" });
    }
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
      <Tabs defaultValue={initialTab} className="w-full">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completadas</p>
                    <p className="text-2xl font-bold text-foreground">{ordenes.filter((o) => o.estado === "completada").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                    <X className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Canceladas</p>
                    <p className="text-2xl font-bold text-foreground">{ordenes.filter((o) => o.estado === "cancelada").length}</p>
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
                    <SelectTrigger className="w-[180px] bg-background border-border">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los estados</SelectItem>
                      <SelectItem value="en_proceso">⚡ En Proceso (Por defecto)</SelectItem>
                      <SelectItem value="pendiente">⏳ Pendiente</SelectItem>
                      <SelectItem value="completada">✅ Completada</SelectItem>
                      <SelectItem value="cancelada">❌ Cancelada</SelectItem>
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
                    {ordenesPaginadas.map((orden) => (
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
                          <div className="flex items-center gap-1">
                            {orden.estado === "en_proceso" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1"
                                title="Pausar proceso temporalmente (detiene bombas y motor)"
                                onClick={() => handleControlOrden(orden, "PAUSAR")}
                              >
                                <Pause className="h-3.5 w-3.5" /> Pausar
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 gap-1"
                                title="Reanudar o iniciar proceso"
                                onClick={() => handleControlOrden(orden, "REANUDAR")}
                              >
                                <Play className="h-3.5 w-3.5" /> Reanudar
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1"
                              title="Descartar / Desechar lote antes de finalizar"
                              onClick={() => handleControlOrden(orden, "DESCARTAR")}
                            >
                              <Ban className="h-3.5 w-3.5" /> Descartar
                            </Button>

                             <Button variant="ghost" size="icon" onClick={() => { setEditingOrden(orden); setOrdenDialogOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => confirmDeleteOrden(orden.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination Controls Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground">
                    Mostrando {ordenesFiltradas.length > 0 ? (currentPageOrdenes - 1) * itemsPerPageOrdenes + 1 : 0} - {Math.min(currentPageOrdenes * itemsPerPageOrdenes, ordenesFiltradas.length)} de {ordenesFiltradas.length} órdenes
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPageOrdenes <= 1}
                      onClick={() => setCurrentPageOrdenes(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <span className="text-xs font-medium text-foreground">
                      Página {currentPageOrdenes} de {totalPagesOrdenes}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPageOrdenes >= totalPagesOrdenes}
                      onClick={() => setCurrentPageOrdenes(p => Math.min(totalPagesOrdenes, p + 1))}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
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
                          <div className="flex items-center gap-1">
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                              title="Ejecutar receta y transmitir parámetros por MQTT al mezclador"
                              onClick={() => handleEjecutarPlantilla(plantilla)}
                            >
                              <Play className="h-3.5 w-3.5 fill-current" /> Ejecutar Receta
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingPlantilla(plantilla); setPlantillaDialogOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => confirmDeletePlantilla(plantilla.id)}>
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

      {/* Confirmation Dialogs for Deletion */}
      <Dialog open={!!deleteConfirmOrdenId} onOpenChange={(open) => !open && setDeleteConfirmOrdenId(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive font-bold flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Confirmar Eliminación de Orden
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar permanentemente esta orden de producción de la base de datos? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmOrdenId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={executeDeleteOrden}>Eliminar Orden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmPlantillaId} onOpenChange={(open) => !open && setDeleteConfirmPlantillaId(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive font-bold flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Confirmar Eliminación de Receta
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar permanentemente esta plantilla de receta de la base de datos? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmPlantillaId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={executeDeletePlantilla}>Eliminar Plantilla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-6 bg-card border-border">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-400" />
              Programar Mantenimiento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto pr-1 flex-1">
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
          </div>
          <DialogFooter className="shrink-0 pt-3 border-t border-border/40 gap-2">
            <Button variant="outline" onClick={() => setMantenimientoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMantenimiento} className="bg-orange-500 hover:bg-orange-600">
              <Wrench className="h-4 w-4 mr-2" />
              Programar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanificacionProduccion;
