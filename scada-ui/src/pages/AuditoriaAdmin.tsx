import { useState, useMemo } from "react";
import { ShieldCheck, Search, Download, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type SortField = "fechaHora" | "usuario" | "accion" | "modulo";
type SortDirection = "asc" | "desc";

const getAccionColor = (accion: string) => {
  if (accion.includes("Alta") || accion.includes("Creación") || accion.includes("Inicio")) {
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  }
  if (accion.includes("Modificación") || accion.includes("Edición") || accion.includes("Cambio")) {
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  }
  if (accion.includes("Eliminación") || accion.includes("Bloqueo") || accion.includes("Cierre")) {
    return "bg-red-500/20 text-red-400 border-red-500/30";
  }
  if (accion.includes("Desbloqueo")) {
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  }
  return "bg-muted text-muted-foreground";
};

const AuditoriaAdmin = () => {
  const { auditLogs } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroModulo, setFiltroModulo] = useState<string>("todos");
  const [sortField, setSortField] = useState<SortField>("fechaHora");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const modulos = useMemo(
    () => [...new Set(auditLogs.map((r) => r.modulo))],
    [auditLogs]
  );

  const registrosFiltrados = useMemo(() => {
    let filtered = auditLogs.filter((log) => {
      const matchesSearch =
        log.objetoAfectado.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.usuario.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.accion.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesModulo = filtroModulo === "todos" || log.modulo === filtroModulo;
      return matchesSearch && matchesModulo;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === "fechaHora") {
        comparison = a.id.localeCompare(b.id);
      } else {
        comparison = a[sortField].localeCompare(b[sortField]);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [auditLogs, searchQuery, filtroModulo, sortField, sortDirection]);

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
    const headers = ["ID", "Fecha/Hora", "Usuario", "Acción", "Objeto Afectado", "Módulo"];
    const csvContent = [
      headers.join(","),
      ...registrosFiltrados.map((r) =>
        [r.id, r.fechaHora, r.usuario, r.accion, `"${r.objetoAfectado}"`, r.modulo].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_admin_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({
      title: "Exportación completada",
      description: `Se han exportado ${registrosFiltrados.length} registros`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Panel de Control de Admin</h1>
            <p className="text-muted-foreground mt-1">Registro de todas las acciones del sistema</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportarRegistros}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold text-foreground">{auditLogs.length}</p>
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
                <p className="text-sm text-muted-foreground">Filtrados</p>
                <p className="text-2xl font-bold text-foreground">{registrosFiltrados.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Módulos</p>
                <p className="text-2xl font-bold text-foreground">{modulos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Buscar en logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm:max-w-xs bg-background border-border"
            />
            <Select value={filtroModulo} onValueChange={setFiltroModulo}>
              <SelectTrigger className="w-[180px] bg-background border-border">
                <SelectValue placeholder="Filtrar módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los módulos</SelectItem>
                {modulos.map((modulo) => (
                  <SelectItem key={modulo} value={modulo}>
                    {modulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("fechaHora")}>
                    <div className="flex items-center">Fecha/Hora <SortIcon field="fechaHora" /></div>
                  </TableHead>
                  <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("usuario")}>
                    <div className="flex items-center">Usuario <SortIcon field="usuario" /></div>
                  </TableHead>
                  <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("accion")}>
                    <div className="flex items-center">Acción <SortIcon field="accion" /></div>
                  </TableHead>
                  <TableHead className="text-muted-foreground">Objeto Afectado</TableHead>
                  <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("modulo")}>
                    <div className="flex items-center">Módulo <SortIcon field="modulo" /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay registros de auditoría aún. Las acciones del sistema se registrarán aquí automáticamente.
                    </TableCell>
                  </TableRow>
                ) : (
                  registrosFiltrados.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-muted-foreground text-sm">{log.fechaHora}</TableCell>
                      <TableCell className="text-foreground">{log.usuario}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getAccionColor(log.accion)}>
                          {log.accion}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground max-w-md truncate">{log.objetoAfectado}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.modulo}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditoriaAdmin;
