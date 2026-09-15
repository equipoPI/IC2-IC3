import { useState, useEffect, useMemo } from "react";
import { 
  Bell, 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  AlertOctagon, 
  AlertCircle, 
  Trash2, 
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import apiFetch from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface Alarma {
  id: number;
  planta: number;
  planta_nombre?: string;
  seccion?: number | null;
  seccion_nombre?: string;
  sensor_maquina: string;
  descripcion: string;
  severidad: "alta" | "media" | "baja";
  fecha_hora: string;
  estado: "abierta" | "cerrada";
}

interface Planta {
  id: number;
  nombre: string;
}

interface Seccion {
  id: number;
  nombre: string;
  fabrica: number;
}

type SortField = "fecha_hora" | "severidad" | "estado" | "planta_nombre";
type SortDirection = "asc" | "desc";

const GestionAlarmas = () => {
  const [alarmas, setAlarmas] = useState<Alarma[]>([]);
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroSeveridad, setFiltroSeveridad] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<string>("abierta");
  const [filtroPlanta, setFiltroPlanta] = useState<string>("todas");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroHoraDesde, setFiltroHoraDesde] = useState("");
  const [filtroHoraHasta, setFiltroHoraHasta] = useState("");

  // Ordenamiento
  const [sortField, setSortField] = useState<SortField>("fecha_hora");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Modales
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Formulario
  const [formPlanta, setFormPlanta] = useState("");
  const [formSeccion, setFormSeccion] = useState("");
  const [formSensor, setFormSensor] = useState("");
  const [formCustomSensor, setFormCustomSensor] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formSeveridad, setFormSeveridad] = useState<"alta" | "media" | "baja">("media");
  
  const extractId = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return String(val.id ?? val.numero_serie ?? val.pk ?? "");
    return String(val);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [respAlarmas, respPlantas, respSecciones, respDispositivos] = await Promise.all([
        apiFetch("/api/v1/alarmas/").catch(() => null),
        apiFetch("/api/v1/fabricas/").catch(() => null),
        apiFetch("/api/v1/secciones/").catch(() => null),
        apiFetch("/api/v1/dispositivos/").catch(() => null)
      ]);
      
      if (respAlarmas && respAlarmas.ok) {
        const d = await respAlarmas.json();
        setAlarmas(Array.isArray(d) ? d : d.results || []);
      }
      if (respPlantas && respPlantas.ok) {
        const d = await respPlantas.json();
        setPlantas(Array.isArray(d) ? d : d.results || []);
      }
      if (respSecciones && respSecciones.ok) {
        const d = await respSecciones.json();
        setSecciones(Array.isArray(d) ? d : d.results || []);
      }
      if (respDispositivos && respDispositivos.ok) {
        const d = await respDispositivos.json();
        setDispositivos(Array.isArray(d) ? d : d.results || []);
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudieron cargar las alarmas o datos del SCADA.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePlantaChange = (plantaId: string) => {
    setFormPlanta(plantaId);
    setFormSeccion("");
    setFormSensor("");
    setFormCustomSensor("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const sensorFinal = formSensor === "OTRO_EQUIPO" ? formCustomSensor.trim() : formSensor;

    if (!formPlanta || !sensorFinal || !formDescripcion) {
      toast({
        title: "Campos incompletos",
        description: "Por favor seleccione la planta, sensor/equipo y la descripción.",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = {
        planta: parseInt(formPlanta),
        seccion: (formSeccion && formSeccion !== "GENERAL_PLANTA") ? parseInt(formSeccion) : null,
        sensor_maquina: sensorFinal,
        descripcion: formDescripcion,
        severidad: formSeveridad,
        estado: "abierta"
      };

      const resp = await apiFetch("/api/v1/alarmas/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) throw new Error("Error al guardar");

      toast({
        title: "Alarma registrada",
        description: "Se dio de alta la alarma exitosamente."
      });

      // Reset
      setFormPlanta("");
      setFormSeccion("");
      setFormSensor("");
      setFormCustomSensor("");
      setFormDescripcion("");
      setFormSeveridad("media");
      setIsNewDialogOpen(false);

      fetchData();
    } catch (error) {
      toast({
        title: "Error al registrar",
        description: "No se pudo registrar la alarma.",
        variant: "destructive"
      });
    }
  };

  const handleToggleEstado = async (alarma: Alarma) => {
    const nuevoEstado = alarma.estado === "abierta" ? "cerrada" : "abierta";
    try {
      const resp = await apiFetch(`/api/v1/alarmas/${alarma.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (!resp.ok) throw new Error("Error al actualizar");

      toast({
        title: nuevoEstado === "cerrada" ? "Alarma resuelta" : "Alarma reabierta",
        description: `Se actualizó el estado de la alarma exitosamente.`
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: "No se pudo cambiar el estado de la alarma.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const resp = await apiFetch(`/api/v1/alarmas/${id}/`, {
        method: "DELETE"
      });

      if (!resp.ok) throw new Error("Error al eliminar");

      toast({
        title: "Alarma eliminada",
        description: "El registro de alarma fue removido."
      });
      setIsDeleting(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el registro.",
        variant: "destructive"
      });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground/50" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Filtrado
  const registrosFiltrados = useMemo(() => {
    let list = [...alarmas];

    // Búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.descripcion.toLowerCase().includes(q) ||
          a.sensor_maquina.toLowerCase().includes(q) ||
          (a.planta_nombre && a.planta_nombre.toLowerCase().includes(q))
      );
    }

    // Severidad
    if (filtroSeveridad !== "todas") {
      list = list.filter((a) => a.severidad === filtroSeveridad);
    }

    // Estado
    if (filtroEstado !== "todas") {
      list = list.filter((a) => a.estado === filtroEstado);
    }

    // Planta
    if (filtroPlanta !== "todas") {
      list = list.filter((a) => String(a.planta) === filtroPlanta);
    }

    // Fecha
    if (filtroFecha) {
      list = list.filter((a) => a.fecha_hora && a.fecha_hora.startsWith(filtroFecha));
    }

    // Rango de Hora (HH:MM)
    if (filtroHoraDesde || filtroHoraHasta) {
      list = list.filter((a) => {
        if (!a.fecha_hora) return false;
        // Formato original: "2026-08-21 18:32:05" -> extraemos "18:32:05"
        const partes = a.fecha_hora.split(" ");
        if (partes.length < 2) return true;
        const horaStr = partes[1]; // "18:32:05"
        
        if (filtroHoraDesde && horaStr < filtroHoraDesde) return false;
        if (filtroHoraHasta && horaStr > filtroHoraHasta) return false;
        return true;
      });
    }

    // Ordenamiento
    list.sort((a, b) => {
      let valA = "";
      let valB = "";

      if (sortField === "planta_nombre") {
        valA = a.planta_nombre || "";
        valB = b.planta_nombre || "";
      } else {
        valA = String(a[sortField] || "");
        valB = String(b[sortField] || "");
      }

      // La severidad tiene jerarquía
      if (sortField === "severidad") {
        const priority = { alta: 3, media: 2, baja: 1 };
        const pA = priority[a.severidad] || 0;
        const pB = priority[b.severidad] || 0;
        return sortDirection === "asc" ? pA - pB : pB - pA;
      }

      const comp = valA.localeCompare(valB);
      return sortDirection === "asc" ? comp : -comp;
    });

    return list;
  }, [alarmas, searchQuery, filtroSeveridad, filtroEstado, filtroPlanta, filtroFecha, filtroHoraDesde, filtroHoraHasta, sortField, sortDirection]);

  // Colores e Iconos de Severidad
  const getSeveridadBadge = (severidad: string) => {
    switch (severidad) {
      case "alta":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 flex items-center gap-1.5 w-fit">
            <AlertOctagon className="h-3.5 w-3.5" />
            Crítica
          </Badge>
        );
      case "media":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 flex items-center gap-1.5 w-fit">
            <AlertTriangle className="h-3.5 w-3.5" />
            Media
          </Badge>
        );
      case "baja":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 flex items-center gap-1.5 w-fit">
            <AlertCircle className="h-3.5 w-3.5" />
            Baja
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground w-fit">
            {severidad}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Alarmas y Notificaciones</h1>
            <p className="text-sm text-muted-foreground">Monitoreo activo y alta de eventos para operadores</p>
          </div>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Alarma
        </Button>
      </div>

      {/* Tarjetas Informativas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertOctagon className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alarmas Críticas</p>
              <p className="text-2xl font-bold text-foreground">
                {alarmas.filter((a) => a.severidad === "alta" && a.estado === "abierta").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alarmas Abiertas</p>
              <p className="text-2xl font-bold text-foreground">
                {alarmas.filter((a) => a.estado === "abierta").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resueltas Hoy</p>
              <p className="text-2xl font-bold text-foreground">
                {alarmas.filter((a) => a.estado === "cerrada").length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenedor Principal */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar alarma por descripción o sensor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background border-border w-full"
                />
              </div>

              {/* Filtros Básicos */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Select value={filtroPlanta} onValueChange={setFiltroPlanta}>
                  <SelectTrigger className="w-[150px] bg-background border-border">
                    <SelectValue placeholder="Planta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las plantas</SelectItem>
                    {plantas.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filtroSeveridad} onValueChange={setFiltroSeveridad}>
                  <SelectTrigger className="w-[140px] bg-background border-border">
                    <SelectValue placeholder="Severidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="alta">Crítica</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="w-[140px] bg-background border-border">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todos</SelectItem>
                    <SelectItem value="abierta">Abiertas</SelectItem>
                    <SelectItem value="cerrada">Cerradas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filtros de Fecha y Rango de Horas */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-muted/10 p-3 rounded-lg border border-border/50">
              <div className="space-y-1.5">
                <Label htmlFor="fecha" className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Fecha
                </Label>
                <Input
                  id="fecha"
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="bg-background border-border text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hora-desde" className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Desde Hora
                </Label>
                <Input
                  id="hora-desde"
                  type="time"
                  step="1"
                  value={filtroHoraDesde}
                  onChange={(e) => setFiltroHoraDesde(e.target.value)}
                  className="bg-background border-border text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hora-hasta" className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Hasta Hora
                </Label>
                <Input
                  id="hora-hasta"
                  type="time"
                  step="1"
                  value={filtroHoraHasta}
                  onChange={(e) => setFiltroHoraHasta(e.target.value)}
                  className="bg-background border-border text-xs h-9"
                />
              </div>

              <div className="flex items-end">
                {(filtroFecha || filtroHoraDesde || filtroHoraHasta) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFiltroFecha("");
                      setFiltroHoraDesde("");
                      setFiltroHoraHasta("");
                    }}
                    className="text-xs w-full text-destructive hover:text-destructive/90 hover:bg-destructive/10 h-9"
                  >
                    Limpiar Filtros de Tiempo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[120px] text-muted-foreground cursor-pointer" onClick={() => handleSort("fecha_hora")}>
                    <div className="flex items-center">Fecha/Hora <SortIcon field="fecha_hora" /></div>
                  </TableHead>
                  <TableHead className="w-[180px] text-muted-foreground cursor-pointer" onClick={() => handleSort("planta_nombre")}>
                    <div className="flex items-center">Planta <SortIcon field="planta_nombre" /></div>
                  </TableHead>
                  <TableHead className="w-[150px] text-muted-foreground">Sección</TableHead>
                  <TableHead className="w-[150px] text-muted-foreground">Sensor/Máquina</TableHead>
                  <TableHead className="text-muted-foreground">Descripción</TableHead>
                  <TableHead className="w-[120px] text-muted-foreground cursor-pointer" onClick={() => handleSort("severidad")}>
                    <div className="flex items-center">Severidad <SortIcon field="severidad" /></div>
                  </TableHead>
                  <TableHead className="w-[120px] text-muted-foreground cursor-pointer" onClick={() => handleSort("estado")}>
                    <div className="flex items-center">Estado <SortIcon field="estado" /></div>
                  </TableHead>
                  <TableHead className="w-[140px] text-right text-muted-foreground">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Cargando alarmas del sistema...
                    </TableCell>
                  </TableRow>
                ) : registrosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron alarmas activas o registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  registrosFiltrados.map((a) => (
                    <TableRow key={a.id} className="hover:bg-muted/20 border-border">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {a.fecha_hora}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {a.planta_nombre || `Planta ID: ${a.planta}`}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground text-sm">
                        {a.seccion_nombre || 'General / Planta Completa'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground">{a.sensor_maquina}</TableCell>
                      <TableCell className="text-foreground max-w-sm truncate">{a.descripcion}</TableCell>
                      <TableCell>{getSeveridadBadge(a.severidad)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            a.estado === "abierta"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }
                        >
                          {a.estado === "abierta" ? "Abierta" : "Cerrada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleEstado(a)}
                            className={
                              a.estado === "abierta"
                                ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            }
                          >
                            {a.estado === "abierta" ? "Resolver" : "Reabrir"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsDeleting(a.id)}
                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Nueva Alarma */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border text-foreground">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Registrar Nueva Alarma
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Dé de alta una alarma manual para alertar a mantenimiento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <Label htmlFor="formPlanta" className="text-sm font-semibold">Planta / Fábrica</Label>
                <Select value={formPlanta} onValueChange={handlePlantaChange}>
                  <SelectTrigger id="formPlanta" className="bg-background border-border">
                    <SelectValue placeholder="Seleccionar planta" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantas.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formSeccion" className="text-sm font-semibold">Sección Afectada (Opcional)</Label>
                {!formPlanta ? (
                  <Select disabled>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Seleccione una planta..." />
                    </SelectTrigger>
                  </Select>
                ) : secciones.filter(s => String(s.fabrica) === formPlanta).length === 0 ? (
                  <Select disabled>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Sin secciones en esta planta" />
                    </SelectTrigger>
                  </Select>
                ) : (
                  <Select value={formSeccion} onValueChange={setFormSeccion}>
                    <SelectTrigger id="formSeccion" className="bg-background border-border">
                      <SelectValue placeholder="General / Planta Completa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL_PLANTA">General / Planta Completa</SelectItem>
                      {secciones
                        .filter(s => String(s.fabrica) === formPlanta)
                        .map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Sensor, Sistema o Máquina Afectada</Label>
                
                {!formPlanta ? (
                  <Select disabled>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Seleccione una planta primero..." />
                    </SelectTrigger>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <Select value={formSensor} onValueChange={(val) => { setFormSensor(val); if (val !== "OTRO_EQUIPO") setFormCustomSensor(""); }}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Seleccionar sensor o máquina..." />
                      </SelectTrigger>
                      <SelectContent>
                        {/* 1. Secciones / Sectores de la Planta */}
                        {secciones.filter(s => String(s.fabrica) === formPlanta).length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase bg-muted/30">
                              Secciones / Sectores de la Planta
                            </div>
                            {secciones
                              .filter(s => String(s.fabrica) === formPlanta)
                              .map(s => (
                                <SelectItem key={`sec-${s.id}`} value={`Sección: ${s.nombre}`}>
                                  Sección: {s.nombre}
                                </SelectItem>
                              ))
                            }
                          </>
                        )}

                        {/* 2. Sensores SCADA pertenecientes a la Planta */}
                        {(() => {
                          const idsSeccionesPlanta = secciones.filter(s => String(s.fabrica) === formPlanta).map(s => s.id);
                          const sensoresDePlanta = dispositivos.filter(d => d.seccion && idsSeccionesPlanta.includes(d.seccion));
                          if (sensoresDePlanta.length === 0) return null;
                          return (
                            <>
                              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase bg-muted/30">
                                Sensores de la Planta
                              </div>
                              {sensoresDePlanta.map(d => (
                                <SelectItem key={d.numero_serie} value={`${d.nombre} (${d.numero_serie})`}>
                                  {d.nombre} ({d.numero_serie})
                                </SelectItem>
                              ))}
                            </>
                          );
                        })()}

                        {/* 3. Todos los Sensores SCADA del Sistema */}
                        {dispositivos.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase bg-muted/30">
                              Sensores SCADA Generales del Sistema
                            </div>
                            {dispositivos.map(d => (
                              <SelectItem key={`gen-${d.numero_serie}`} value={`${d.nombre} (${d.numero_serie})`}>
                                {d.nombre} ({d.numero_serie})
                              </SelectItem>
                            ))}
                          </>
                        )}

                        {/* 4. Opción para ingresar otro equipo no listado */}
                        <SelectItem value="OTRO_EQUIPO" className="font-semibold text-primary">
                          + Especificar otro equipo / máquina...
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {formSensor === "OTRO_EQUIPO" && (
                      <Input
                        placeholder="Nombre o código del equipo (ej: Compresor Auxiliar)"
                        value={formCustomSensor}
                        onChange={(e) => setFormCustomSensor(e.target.value)}
                        className="bg-background border-border text-sm"
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="formSeveridad" className="text-sm font-semibold">Nivel de Severidad</Label>
                <Select value={formSeveridad} onValueChange={(val: any) => setFormSeveridad(val)}>
                  <SelectTrigger id="formSeveridad" className="bg-background border-border">
                    <SelectValue placeholder="Seleccionar severidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta / Crítica</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formDescripcion" className="text-sm font-semibold">Descripción del Problema</Label>
                <Textarea
                  id="formDescripcion"
                  placeholder="Describa la anomalía o falla detectada..."
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  className="bg-background border-border"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Registro</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmación de Eliminación */}
      <Dialog open={isDeleting !== null} onOpenChange={(open) => !open && setIsDeleting(null)}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>¿Está seguro de eliminar esta alarma?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Esta acción no se puede deshacer. Se eliminará permanentemente de los registros del sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleting(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => isDeleting && handleDelete(isDeleting)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestionAlarmas;
