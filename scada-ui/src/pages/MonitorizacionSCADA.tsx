import { useState, useMemo, useEffect } from "react";
import { 
  Factory, 
  AlertTriangle, 
  Activity, 
  Clock, 
  Zap, 
  Thermometer, 
  Gauge, 
  TrendingUp, 
  Search, 
  MapPin, 
  LayoutGrid, 
  List,
  Droplet,
  Settings,
  Plus,
  Trash2,
  AlertOctagon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import apiFetch from "@/lib/api";

interface Planta {
  id: string;
  nombre: string;
  ubicacion: string;
  estado: "operativo" | "advertencia" | "critico" | "offline";
  produccion: number;
  eficiencia: number;
  temperatura: number;
  consumoEnergia: number;
  alarmasActivas: number;
  variablesVinculadas: any[];
}

const getEstadoConfig = (estado: Planta["estado"]) => {
  switch (estado) {
    case "operativo": return { label: "Operativo", dotClass: "status-dot-operational", badgeClass: "bg-success/20 text-success border-success/30", bgClass: "border-success/30" };
    case "advertencia": return { label: "Advertencia", dotClass: "status-dot-warning", badgeClass: "bg-warning/20 text-warning border-warning/30", bgClass: "border-warning/30" };
    case "critico": return { label: "Crítico", dotClass: "status-dot-critical", badgeClass: "bg-destructive/20 text-destructive border-destructive/30", bgClass: "border-destructive/50 bg-destructive/5" };
    case "offline": return { label: "Offline", dotClass: "status-dot-offline", badgeClass: "bg-muted text-muted-foreground border-muted", bgClass: "border-muted/50 opacity-60" };
  }
};

const renderIconoMetrica = (icono: string) => {
  switch (icono) {
    case "thermometer": return <Thermometer className="h-4 w-4" />;
    case "zap": return <Zap className="h-4 w-4" />;
    case "droplet": return <Droplet className="h-4 w-4" />;
    case "gauge": return <Gauge className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
};

const MonitorizacionSCADA = () => {
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  // Estados de gestión de variables vinculadas
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [plantaParaConfig, setPlantaParaConfig] = useState<Planta | null>(null);
  const [catalogoMetricas, setCatalogoMetricas] = useState<any[]>([]);
  const [catalogoSensores, setCatalogoSensores] = useState<any[]>([]);
  
  // Formulario de nueva vinculación
  const [nuevaMetricaId, setNuevaMetricaId] = useState("");
  const [nuevoSensorId, setNuevoSensorId] = useState("");
  const [umbralWarning, setUmbralWarning] = useState("");
  const [umbralCritical, setUmbralCritical] = useState("");

  const loadPlantas = async () => {
    try {
      const resp = await apiFetch("/api/v1/fabricas/");
      if (!resp.ok) return;
      const data = await resp.json();
      const list = Array.isArray(data) ? data : data.results || [];
      const mapped: Planta[] = list.map((f: any) => ({
        id: String(f.id),
        nombre: f.nombre || '',
        ubicacion: f.ubicacion ? `${f.ubicacion}${f.pais ? `, ${f.pais}` : ''}` : f.pais || 'Sin ubicación',
        estado: (f.estado || 'OPERATIVO').toLowerCase() as Planta["estado"],
        produccion: f.porcentaje_produccion || 0,
        eficiencia: f.porcentaje_eficiencia || 0,
        temperatura: f.temperatura_promedio || 0,
        consumoEnergia: f.consumo_energia || 0,
        alarmasActivas: f.alarmas_activas || 0,
        variablesVinculadas: f.variables_vinculadas || [],
      }));
      setPlantas(mapped);

      // Si el modal está abierto para una planta, refrescar su estado local también
      setPlantaParaConfig((prev) => {
        if (!prev) return null;
        const updated = mapped.find(p => p.id === prev.id);
        return updated || null;
      });
    } catch (err) {
      // silent
    }
  };

  // Cargar catálogos iniciales al abrir el modal
  const loadCatalogos = async () => {
    try {
      // Métricas conceptuales
      const respM = await apiFetch("/api/v1/metricas-config/");
      if (respM.ok) {
        const dataM = await respM.json();
        setCatalogoMetricas(Array.isArray(dataM) ? dataM : dataM.results || []);
      }
      // Sensores/Dispositivos SCADA
      const respS = await apiFetch("/api/v1/dispositivos/");
      if (respS.ok) {
        const dataS = await respS.json();
        setCatalogoSensores(Array.isArray(dataS) ? dataS : dataS.results || []);
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    loadPlantas();
    const interval = setInterval(loadPlantas, 3000);
    return () => clearInterval(interval);
  }, []);

  const abrirGestionVariables = (e: React.MouseEvent, planta: Planta) => {
    e.stopPropagation(); // Evitar seleccionar la planta al pulsar en configuración
    setPlantaParaConfig(planta);
    loadCatalogos();
    // Limpiar formulario
    setNuevaMetricaId("");
    setNuevoSensorId("");
    setUmbralWarning("");
    setUmbralCritical("");
    setIsDialogOpen(true);
  };



  // Vincular nueva variable a la planta
  const handleVincularVariable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plantaParaConfig || !nuevaMetricaId || !nuevoSensorId) {
      toast.error("Por favor, seleccione una métrica y un sensor válido");
      return;
    }

    try {
      const payload = {
        fabrica: plantaParaConfig.id,
        metrica_config: nuevaMetricaId,
        sensor: nuevoSensorId,
        umbral_advertencia: umbralWarning ? parseFloat(umbralWarning) : null,
        umbral_critico: umbralCritical ? parseFloat(umbralCritical) : null,
        activo: true
      };

      const resp = await apiFetch("/api/v1/variables-vinculadas/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        toast.success("Variable vinculada exitosamente");
        // Limpiar campos
        setNuevaMetricaId("");
        setNuevoSensorId("");
        setUmbralWarning("");
        setUmbralCritical("");
        // Refrescar
        loadPlantas();
      } else {
        const errData = await resp.json();
        toast.error(`Error al vincular: ${errData.error || resp.statusText || 'Verifique si esta métrica ya está vinculada'}`);
      }
    } catch (err) {
      toast.error("Error de conexión al guardar la vinculación");
    }
  };

  // Desvincular (eliminar) variable de la planta
  const handleDesvincularVariable = async (vinculoId: number) => {
    try {
      const resp = await apiFetch(`/api/v1/variables-vinculadas/${vinculoId}/`, {
        method: "DELETE"
      });
      if (resp.ok) {
        toast.success("Variable desvinculada correctamente");
        loadPlantas();
      } else {
        toast.error("No se pudo desvincular la variable");
      }
    } catch (err) {
      toast.error("Error de conexión al eliminar la vinculación");
    }
  };

  const plantasFiltradas = useMemo(() => {
    return plantas.filter((planta) => {
      const matchesSearch = planta.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            planta.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            planta.ubicacion.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEstado = filtroEstado === "todos" || planta.estado === filtroEstado;
      return matchesSearch && matchesEstado;
    });
  }, [plantas, searchQuery, filtroEstado]);

  const statsResumen = useMemo(() => ({
    operativas: plantas.filter(p => p.estado === "operativo").length,
    advertencia: plantas.filter(p => p.estado === "advertencia").length,
    criticas: plantas.filter(p => p.estado === "critico").length,
    offline: plantas.filter(p => p.estado === "offline").length,
    totalAlarmas: plantas.reduce((acc, p) => acc + p.alarmasActivas, 0),
  }), [plantas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Monitorización SCADA</h1>
          <p className="text-muted-foreground mt-1">Supervisión en tiempo real de todas las plantas y fábricas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Operativas</span>
            <span className="text-3xl font-bold text-success font-mono mt-1">{statsResumen.operativas}</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Advertencia</span>
            <span className="text-3xl font-bold text-warning font-mono mt-1">{statsResumen.advertencia}</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Críticas</span>
            <span className="text-3xl font-bold text-destructive font-mono mt-1">{statsResumen.criticas}</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Offline</span>
            <span className="text-3xl font-bold text-muted-foreground font-mono mt-1">{statsResumen.offline}</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border col-span-2 md:col-span-1">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Alarmas</span>
            <span className={cn(
              "text-3xl font-bold font-mono mt-1",
              statsResumen.totalAlarmas > 0 ? "text-destructive" : "text-success"
            )}>{statsResumen.totalAlarmas}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar planta por nombre, ID o ubicación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-border"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[180px] bg-background border-border">
              <SelectValue placeholder="Filtrar estado" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="operativo">Operativo</SelectItem>
              <SelectItem value="advertencia">Advertencia</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plants Display */}
      {plantasFiltradas.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Factory className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No se encontraron plantas</h3>
            <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plantasFiltradas.map((planta) => {
            const estadoConfig = getEstadoConfig(planta.estado);

            return (
              <Card
                key={planta.id}
                className={cn(
                  "bg-card border-border transition-all duration-200 hover:shadow-lg",
                  estadoConfig.bgClass
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center",
                        planta.estado === "operativo" ? "bg-success/20" :
                        planta.estado === "advertencia" ? "bg-warning/20" :
                        planta.estado === "critico" ? "bg-destructive/20" : "bg-muted"
                      )}>
                        <Factory className={cn(
                          "h-6 w-6",
                          planta.estado === "operativo" ? "text-success" :
                          planta.estado === "advertencia" ? "text-warning" :
                          planta.estado === "critico" ? "text-destructive" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {planta.nombre}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={(e) => abrirGestionVariables(e, planta)}
                          >
                            <Settings className="h-4.5 w-4.5" />
                          </Button>
                        </CardTitle>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {planta.ubicacion}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={estadoConfig.badgeClass}>
                      <div className={cn("status-dot mr-1.5", estadoConfig.dotClass)} />
                      {estadoConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Dynamic Variables Grid */}
                  {planta.variablesVinculadas.length === 0 ? (
                    <div className="py-4 text-center border border-dashed border-border rounded-lg bg-background/50">
                      <p className="text-xs text-muted-foreground">Sin variables vinculadas</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-xs text-primary h-auto p-0 mt-1"
                        onClick={(e) => abrirGestionVariables(e, planta)}
                      >
                        Vincular variables
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {planta.variablesVinculadas.map((vv) => {
                        const progressVal = vv.valor_lectura !== null 
                          ? Math.min(100, Math.max(0, ((vv.valor_lectura - vv.metrica_config.rango_minimo) / (vv.metrica_config.rango_maximo - vv.metrica_config.rango_minimo)) * 100))
                          : 0;

                        return (
                          <div key={vv.id} className="space-y-1.5 p-2 rounded bg-background/50 border border-border/50">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-between">
                              <span className="flex items-center gap-1">
                                {renderIconoMetrica(vv.metrica_icono)}
                                {vv.metrica_nombre}
                              </span>
                              {vv.estado_alerta !== "normal" && (
                                <AlertTriangle className={cn(
                                  "h-3 w-3",
                                  vv.estado_alerta === "critico" ? "text-destructive" : "text-warning"
                                )} />
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "text-sm font-mono font-bold",
                                vv.estado_alerta === "critico" ? "text-destructive" :
                                vv.estado_alerta === "advertencia" ? "text-warning" : "text-foreground"
                              )}>
                                {vv.valor_lectura !== null ? `${vv.valor_lectura} ${vv.metrica_unidad}` : "N/A"}
                              </span>
                            </div>
                            <Progress value={progressVal} className={cn(
                              "h-1", 
                              vv.estado_alerta === "critico" ? "[&>div]:bg-destructive" :
                              vv.estado_alerta === "advertencia" ? "[&>div]:bg-warning" : ""
                            )} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Alarmas */}
                  {planta.alarmasActivas > 0 && (
                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">{planta.alarmasActivas} alarmas activas</span>
                        </div>
                        <Badge variant="destructive" className="text-xs">Requiere atención</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {plantasFiltradas.map((planta) => {
                const estadoConfig = getEstadoConfig(planta.estado);

                return (
                  <div
                    key={planta.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        planta.estado === "operativo" ? "bg-success/20" :
                        planta.estado === "advertencia" ? "bg-warning/20" :
                        planta.estado === "critico" ? "bg-destructive/20" : "bg-muted"
                      )}>
                        <Factory className={cn(
                          "h-5 w-5",
                          planta.estado === "operativo" ? "text-success" :
                          planta.estado === "advertencia" ? "text-warning" :
                          planta.estado === "critico" ? "text-destructive" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground flex items-center gap-2">
                          {planta.nombre}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={(e) => abrirGestionVariables(e, planta)}
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </Button>
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {planta.ubicacion}
                        </div>
                      </div>
                    </div>

                    {/* Muestreo rápido de variables */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      {planta.variablesVinculadas.slice(0, 3).map((vv) => (
                        <div key={vv.id} className="text-center">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {renderIconoMetrica(vv.metrica_icono)}
                            {vv.metrica_nombre}
                          </p>
                          <p className={cn(
                            "font-mono font-medium text-sm",
                            vv.estado_alerta === "critico" ? "text-destructive" :
                            vv.estado_alerta === "advertencia" ? "text-warning" : "text-foreground"
                          )}>
                            {vv.valor_lectura !== null ? `${vv.valor_lectura} ${vv.metrica_unidad}` : "N/A"}
                          </p>
                        </div>
                      ))}
                      {planta.variablesVinculadas.length > 3 && (
                        <div className="text-center text-xs text-muted-foreground">
                          +{planta.variablesVinculadas.length - 3} más
                        </div>
                      )}
                      {planta.alarmasActivas > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {planta.alarmasActivas}
                        </Badge>
                      )}
                      <Badge variant="outline" className={estadoConfig.badgeClass}>
                        <div className={cn("status-dot mr-1.5", estadoConfig.dotClass)} />
                        {estadoConfig.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variables Configuration Dialog */}
      {plantaParaConfig && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Gestionar Variables - {plantaParaConfig.nombre}
              </DialogTitle>
              <DialogDescription>
                Vincule sensores físicos a métricas visuales para configurar el SCADA en tiempo real.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="listado" className="w-full my-2">
              <TabsList className="grid w-full grid-cols-2 bg-muted/20 border border-border">
                <TabsTrigger value="listado">Métricas Activas ({plantaParaConfig.variablesVinculadas.length})</TabsTrigger>
                <TabsTrigger value="vincular">Vincular Nueva Métrica</TabsTrigger>
              </TabsList>

              <TabsContent value="listado" className="space-y-4 pt-4 outline-none">
                {/* Variables Vinculadas Actualmente */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold border-b border-border pb-1">Métricas Vinculadas Activas</h4>
                  {plantaParaConfig.variablesVinculadas.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 italic text-center">No hay variables configuradas para esta fábrica.</p>
                  ) : (
                    <div className="divide-y divide-border border border-border rounded-lg bg-background/50 overflow-hidden max-h-80 overflow-y-auto">
                      {plantaParaConfig.variablesVinculadas.map((vv) => (
                        <div key={vv.id} className="flex items-center justify-between p-3 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                              {renderIconoMetrica(vv.metrica_icono)}
                            </div>
                            <div>
                              <p className="font-medium">{vv.metrica_nombre} ({vv.metrica_unidad})</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                Sensor: {vv.sensor || 'Ninguno'} | Umbrales: W:{vv.umbral_advertencia || '-'} / C:{vv.umbral_critico || '-'}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDesvincularVariable(vv.id)}
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="vincular" className="space-y-4 pt-4 outline-none">
                {/* Formulario para Vincular Nueva Variable */}
                <form onSubmit={handleVincularVariable} className="space-y-4 border border-border p-4 rounded-lg bg-muted/20">
                  <h4 className="text-sm font-semibold border-b border-border pb-1">Vincular Nueva Métrica</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="metrica">Seleccionar Métrica</Label>
                      <Select value={nuevaMetricaId} onValueChange={setNuevaMetricaId}>
                        <SelectTrigger id="metrica" className="bg-background border-border">
                          <SelectValue placeholder="Métrica" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {catalogoMetricas.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.nombre} ({m.unidad_medida})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sensor">Vincular a Sensor (SCADA)</Label>
                      <Select value={nuevoSensorId} onValueChange={setNuevoSensorId}>
                        <SelectTrigger id="sensor" className="bg-background border-border">
                          <SelectValue placeholder="Sensor" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {catalogoSensores.map((s) => (
                            <SelectItem key={s.numero_serie} value={s.numero_serie}>
                              [{s.categoria}] {s.numero_serie} - {s.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="warning">Umbral de Advertencia</Label>
                      <Input 
                        id="warning"
                        type="number"
                        step="any"
                        placeholder="Ej. 60.0"
                        value={umbralWarning}
                        onChange={(e) => setUmbralWarning(e.target.value)}
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="critical">Umbral Crítico</Label>
                      <Input 
                        id="critical"
                        type="number"
                        step="any"
                        placeholder="Ej. 90.0"
                        value={umbralCritical}
                        onChange={(e) => setUmbralCritical(e.target.value)}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Vincular Métrica
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cerrar Configuración
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MonitorizacionSCADA;
