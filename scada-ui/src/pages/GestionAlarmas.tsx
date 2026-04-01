import { useState } from "react";
import { AlertTriangle, Bell, CheckCircle, XCircle, Filter, Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import FormularioAlarma from "@/components/FormularioAlarma";

interface Alarma {
  id: string;
  planta: string;
  sensorMaquina: string;
  descripcion: string;
  severidad: "alta" | "media" | "baja";
  fechaHora: string;
  estado: "abierta" | "cerrada";
}

const alarmasIniciales: Alarma[] = [
  { id: "ALM-001", planta: "Planta Norte", sensorMaquina: "Sensor Temp. Horno 1", descripcion: "Temperatura excede límite superior (75°C)", severidad: "alta", fechaHora: "2024-01-15 14:32:05", estado: "abierta" },
  { id: "ALM-002", planta: "Planta Central", sensorMaquina: "Bomba Principal P1", descripcion: "Vibración anormal detectada", severidad: "media", fechaHora: "2024-01-15 13:45:22", estado: "abierta" },
  { id: "ALM-003", planta: "Fábrica Este", sensorMaquina: "PLC Control Central", descripcion: "Pérdida de comunicación intermitente", severidad: "alta", fechaHora: "2024-01-15 12:18:00", estado: "cerrada" },
  { id: "ALM-004", planta: "Planta Sur", sensorMaquina: "Sensor Presión Tanque A", descripcion: "Presión por debajo del umbral mínimo", severidad: "baja", fechaHora: "2024-01-15 11:55:33", estado: "abierta" },
  { id: "ALM-005", planta: "Planta Norte", sensorMaquina: "Motor Línea 2", descripcion: "Consumo eléctrico elevado", severidad: "media", fechaHora: "2024-01-15 10:22:15", estado: "cerrada" },
  { id: "ALM-006", planta: "Fábrica Oeste", sensorMaquina: "Válvula Reguladora V3", descripcion: "Fallo en actuador de válvula", severidad: "alta", fechaHora: "2024-01-15 09:08:47", estado: "abierta" },
];

const getSeveridadConfig = (severidad: Alarma["severidad"]) => {
  switch (severidad) {
    case "alta": return { label: "Alta", className: "bg-destructive/20 text-destructive border-destructive/30" };
    case "media": return { label: "Media", className: "bg-warning/20 text-warning border-warning/30" };
    case "baja": return { label: "Baja", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
  }
};

const GestionAlarmas = () => {
  const [alarmas, setAlarmas] = useState<Alarma[]>(alarmasIniciales);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroSeveridad, setFiltroSeveridad] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<string>("todas");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlarma, setEditingAlarma] = useState<Alarma | null>(null);

  const alarmasFiltradas = alarmas.filter((alarma) => {
    const matchesSearch =
      alarma.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alarma.planta.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alarma.sensorMaquina.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeveridad = filtroSeveridad === "todas" || alarma.severidad === filtroSeveridad;
    const matchesEstado = filtroEstado === "todas" || alarma.estado === filtroEstado;
    
    // Date range filter
    const alarmaDate = new Date(alarma.fechaHora.split(" ")[0]);
    const matchesFechaInicio = !fechaInicio || alarmaDate >= new Date(fechaInicio);
    const matchesFechaFin = !fechaFin || alarmaDate <= new Date(fechaFin);
    
    return matchesSearch && matchesSeveridad && matchesEstado && matchesFechaInicio && matchesFechaFin;
  });

  const toggleEstado = (id: string) => {
    setAlarmas(alarmas.map((a) =>
      a.id === id ? { ...a, estado: a.estado === "abierta" ? "cerrada" : "abierta" } : a
    ));
    toast({ title: "Estado actualizado", description: "El estado de la alarma ha sido cambiado" });
  };

  const handleSave = (data: Omit<Alarma, "id" | "fechaHora">) => {
    if (editingAlarma) {
      setAlarmas(alarmas.map((a) =>
        a.id === editingAlarma.id ? { ...a, ...data } : a
      ));
      toast({ title: "Alarma actualizada", description: "Los cambios se han guardado correctamente" });
    } else {
      const newAlarma: Alarma = {
        id: `ALM-${String(alarmas.length + 1).padStart(3, "0")}`,
        fechaHora: new Date().toISOString().replace("T", " ").substring(0, 19),
        ...data,
      };
      setAlarmas([newAlarma, ...alarmas]);
      toast({ title: "Alarma creada", description: "La alarma se ha registrado correctamente" });
    }
    setEditingAlarma(null);
  };

  const handleEdit = (alarma: Alarma) => {
    setEditingAlarma(alarma);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setAlarmas(alarmas.filter((a) => a.id !== id));
    toast({ title: "Alarma eliminada", description: "La alarma ha sido eliminada del sistema" });
  };

  const alarmasAbiertas = alarmas.filter((a) => a.estado === "abierta").length;
  const alarmasAltas = alarmas.filter((a) => a.severidad === "alta" && a.estado === "abierta").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Gestión de Alarmas y Notificaciones</h1>
          <p className="text-muted-foreground mt-1">Monitorea y gestiona las alarmas del sistema</p>
        </div>
        <Button onClick={() => { setEditingAlarma(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Alarma
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alarmas Abiertas</p>
                <p className="text-2xl font-bold text-foreground">{alarmasAbiertas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Severidad Alta</p>
                <p className="text-2xl font-bold text-foreground">{alarmasAltas}</p>
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
                <p className="text-sm text-muted-foreground">Resueltas</p>
                <p className="text-2xl font-bold text-foreground">{alarmas.filter((a) => a.estado === "cerrada").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Buscar alarmas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sm:max-w-xs bg-background border-border"
              />
              <div className="flex gap-2 flex-wrap">
                <Select value={filtroSeveridad} onValueChange={setFiltroSeveridad}>
                  <SelectTrigger className="w-[140px] bg-background border-border">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Severidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="w-[140px] bg-background border-border">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="abierta">Abiertas</SelectItem>
                    <SelectItem value="cerrada">Cerradas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Desde:</span>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-auto bg-background border-border"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Hasta:</span>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-auto bg-background border-border"
                />
              </div>
              {(fechaInicio || fechaFin) && (
                <Button variant="ghost" size="sm" onClick={() => { setFechaInicio(""); setFechaFin(""); }}>
                  Limpiar fechas
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-muted-foreground">ID</TableHead>
                  <TableHead className="text-muted-foreground">Planta</TableHead>
                  <TableHead className="text-muted-foreground">Sensor/Máquina</TableHead>
                  <TableHead className="text-muted-foreground">Descripción</TableHead>
                  <TableHead className="text-muted-foreground">Severidad</TableHead>
                  <TableHead className="text-muted-foreground">Fecha/Hora</TableHead>
                  <TableHead className="text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-muted-foreground">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alarmasFiltradas.map((alarma) => (
                  <TableRow
                    key={alarma.id}
                    className={cn(
                      "transition-colors",
                      alarma.estado === "abierta" && alarma.severidad === "alta" && "bg-destructive/5"
                    )}
                  >
                    <TableCell className="font-mono text-foreground">{alarma.id}</TableCell>
                    <TableCell className="text-foreground">{alarma.planta}</TableCell>
                    <TableCell className="text-foreground">{alarma.sensorMaquina}</TableCell>
                    <TableCell className="text-foreground max-w-xs truncate">{alarma.descripcion}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getSeveridadConfig(alarma.severidad).className}>
                        {getSeveridadConfig(alarma.severidad).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-sm">{alarma.fechaHora}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={alarma.estado === "abierta" ? "bg-warning/20 text-warning border-warning/30" : "bg-success/20 text-success border-success/30"}
                      >
                        {alarma.estado === "abierta" ? "Abierta" : "Cerrada"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleEstado(alarma.id)} title={alarma.estado === "abierta" ? "Cerrar" : "Reabrir"}>
                          {alarma.estado === "abierta" ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(alarma)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(alarma.id)}>
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

      <FormularioAlarma
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        alarma={editingAlarma}
        onSave={handleSave}
      />
    </div>
  );
};

export default GestionAlarmas;
