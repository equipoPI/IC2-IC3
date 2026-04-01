import { useState, useMemo } from "react";
import { ClipboardList, Search, Download, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { toast } from "@/hooks/use-toast";

interface RegistroAuditoria {
  id: string;
  fechaHora: string;
  usuario: string;
  accion: string;
  detalle: string;
  modulo: string;
}

const registrosIniciales: RegistroAuditoria[] = [
  { id: "AUD-001", fechaHora: "2024-01-15 14:45:22", usuario: "Juan García", accion: "Creación", detalle: "Nuevo empleado añadido: María López", modulo: "Empleados" },
  { id: "AUD-002", fechaHora: "2024-01-15 14:32:05", usuario: "Ana Martínez", accion: "Modificación", detalle: "Actualización de parámetros de receta REC-001", modulo: "Recetas" },
  { id: "AUD-003", fechaHora: "2024-01-15 13:55:18", usuario: "Sistema", accion: "Alarma", detalle: "Alarma ALM-001 generada automáticamente", modulo: "Alarmas" },
  { id: "AUD-004", fechaHora: "2024-01-15 13:22:00", usuario: "Carlos Ruiz", accion: "Eliminación", detalle: "Sensor SN-2022-0089 dado de baja", modulo: "Sensores" },
  { id: "AUD-005", fechaHora: "2024-01-14 12:15:33", usuario: "Juan García", accion: "Inicio Sesión", detalle: "Acceso al sistema desde IP 192.168.1.45", modulo: "Autenticación" },
  { id: "AUD-006", fechaHora: "2024-01-14 11:48:47", usuario: "Ana Martínez", accion: "Modificación", detalle: "Cambio de estado Planta Norte: Mantenimiento → Operativo", modulo: "Plantas" },
  { id: "AUD-007", fechaHora: "2024-01-13 10:30:12", usuario: "Sistema", accion: "Backup", detalle: "Backup automático completado exitosamente", modulo: "Sistema" },
  { id: "AUD-008", fechaHora: "2024-01-12 09:15:00", usuario: "Carlos Ruiz", accion: "Creación", detalle: "Nueva planta registrada: Fábrica Este", modulo: "Plantas" },
];

type SortField = "id" | "fechaHora" | "usuario" | "accion" | "modulo";
type SortDirection = "asc" | "desc";

const getAccionColor = (accion: string) => {
  const colors: Record<string, string> = {
    Creación: "bg-success/20 text-success border-success/30",
    Modificación: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Eliminación: "bg-destructive/20 text-destructive border-destructive/30",
    Alarma: "bg-warning/20 text-warning border-warning/30",
    "Inicio Sesión": "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Backup: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  };
  return colors[accion] || "bg-muted text-muted-foreground";
};

const Auditoria = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroModulo, setFiltroModulo] = useState<string>("todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [sortField, setSortField] = useState<SortField>("fechaHora");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const modulos = [...new Set(registrosIniciales.map((r) => r.modulo))];

  const registrosFiltrados = useMemo(() => {
    let filtered = registrosIniciales.filter((registro) => {
      const matchesSearch =
        registro.detalle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        registro.usuario.toLowerCase().includes(searchQuery.toLowerCase()) ||
        registro.accion.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesModulo = filtroModulo === "todos" || registro.modulo === filtroModulo;
      
      // Date range filter
      const registroDate = new Date(registro.fechaHora.split(" ")[0]);
      const matchesFechaInicio = !fechaInicio || registroDate >= new Date(fechaInicio);
      const matchesFechaFin = !fechaFin || registroDate <= new Date(fechaFin);
      
      return matchesSearch && matchesModulo && matchesFechaInicio && matchesFechaFin;
    });

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === "fechaHora") {
        comparison = new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
      } else {
        comparison = a[sortField].localeCompare(b[sortField]);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [searchQuery, filtroModulo, fechaInicio, fechaFin, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const exportarRegistros = () => {
    const headers = ["ID", "Fecha/Hora", "Usuario", "Acción", "Detalle", "Módulo"];
    const csvContent = [
      headers.join(","),
      ...registrosFiltrados.map(r => 
        [r.id, r.fechaHora, r.usuario, r.accion, `"${r.detalle}"`, r.modulo].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({
      title: "Exportación completada",
      description: `Se han exportado ${registrosFiltrados.length} registros`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Auditoría y Registro de Actividades</h1>
          <p className="text-muted-foreground mt-1">Historial completo de acciones realizadas en el sistema</p>
        </div>
        <Button variant="outline" onClick={exportarRegistros}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Registros
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Registros</p>
                <p className="text-2xl font-bold text-foreground">{registrosIniciales.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Filtrados</p>
                <p className="text-2xl font-bold text-foreground">{registrosFiltrados.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Search className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usuarios Activos</p>
                <p className="text-2xl font-bold text-foreground">3</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Módulos</p>
                <p className="text-2xl font-bold text-foreground">{modulos.length}</p>
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
                placeholder="Buscar en registros..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sm:max-w-xs bg-background border-border"
              />
              <Select value={filtroModulo} onValueChange={setFiltroModulo}>
                <SelectTrigger className="w-[160px] bg-background border-border">
                  <SelectValue placeholder="Filtrar módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los módulos</SelectItem>
                  {modulos.map((modulo) => (
                    <SelectItem key={modulo} value={modulo}>{modulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("id")}>
                    <div className="flex items-center">ID <SortIcon field="id" /></div>
                  </TableHead>
                  <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("fechaHora")}>
                    <div className="flex items-center">Fecha/Hora <SortIcon field="fechaHora" /></div>
                  </TableHead>
                  <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("usuario")}>
                    <div className="flex items-center">Usuario <SortIcon field="usuario" /></div>
                  </TableHead>
                  <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("accion")}>
                    <div className="flex items-center">Acción <SortIcon field="accion" /></div>
                  </TableHead>
                  <TableHead className="text-muted-foreground">Detalle</TableHead>
                  <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("modulo")}>
                    <div className="flex items-center">Módulo <SortIcon field="modulo" /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell className="font-mono text-foreground">{registro.id}</TableCell>
                    <TableCell className="font-mono text-muted-foreground text-sm">{registro.fechaHora}</TableCell>
                    <TableCell className="text-foreground">{registro.usuario}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getAccionColor(registro.accion)}>{registro.accion}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground max-w-md truncate">{registro.detalle}</TableCell>
                    <TableCell><Badge variant="secondary">{registro.modulo}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auditoria;
