import { useState, useMemo } from "react";
import { Factory, AlertTriangle, Activity, Clock, Zap, Thermometer, Gauge, TrendingUp, Search, MapPin, LayoutGrid, List } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
}

const plantas: Planta[] = [
  { id: "PLT-001", nombre: "Planta Norte", ubicacion: "Madrid, España", estado: "operativo", produccion: 87, eficiencia: 94, temperatura: 42, consumoEnergia: 2450, alarmasActivas: 0 },
  { id: "PLT-002", nombre: "Planta Central", ubicacion: "Barcelona, España", estado: "advertencia", produccion: 65, eficiencia: 78, temperatura: 58, consumoEnergia: 3120, alarmasActivas: 2 },
  { id: "PLT-003", nombre: "Planta Sur", ubicacion: "Sevilla, España", estado: "operativo", produccion: 92, eficiencia: 96, temperatura: 38, consumoEnergia: 2100, alarmasActivas: 0 },
  { id: "PLT-004", nombre: "Fábrica Este", ubicacion: "Valencia, España", estado: "critico", produccion: 23, eficiencia: 45, temperatura: 72, consumoEnergia: 1800, alarmasActivas: 5 },
  { id: "PLT-005", nombre: "Fábrica Oeste", ubicacion: "Bilbao, España", estado: "offline", produccion: 0, eficiencia: 0, temperatura: 22, consumoEnergia: 150, alarmasActivas: 1 },
];

const getEstadoConfig = (estado: Planta["estado"]) => {
  switch (estado) {
    case "operativo": return { label: "Operativo", dotClass: "status-dot-operational", badgeClass: "bg-success/20 text-success border-success/30", bgClass: "border-success/30" };
    case "advertencia": return { label: "Advertencia", dotClass: "status-dot-warning", badgeClass: "bg-warning/20 text-warning border-warning/30", bgClass: "border-warning/30" };
    case "critico": return { label: "Crítico", dotClass: "status-dot-critical", badgeClass: "bg-destructive/20 text-destructive border-destructive/30", bgClass: "border-destructive/50 bg-destructive/5" };
    case "offline": return { label: "Offline", dotClass: "status-dot-offline", badgeClass: "bg-muted text-muted-foreground border-muted", bgClass: "border-muted/50 opacity-60" };
  }
};

const MonitorizacionSCADA = () => {
  const [selectedPlanta, setSelectedPlanta] = useState<Planta | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  const plantasFiltradas = useMemo(() => {
    return plantas.filter((planta) => {
      const matchesSearch = planta.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           planta.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           planta.ubicacion.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEstado = filtroEstado === "todos" || planta.estado === filtroEstado;
      return matchesSearch && matchesEstado;
    });
  }, [searchQuery, filtroEstado]);

  const statsResumen = useMemo(() => ({
    operativas: plantas.filter(p => p.estado === "operativo").length,
    advertencia: plantas.filter(p => p.estado === "advertencia").length,
    criticas: plantas.filter(p => p.estado === "critico").length,
    offline: plantas.filter(p => p.estado === "offline").length,
    totalAlarmas: plantas.reduce((acc, p) => acc + p.alarmasActivas, 0),
  }), []);

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

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Factory className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Operativas</p>
                <p className="text-xl font-bold text-success">{statsResumen.operativas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Factory className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Advertencia</p>
                <p className="text-xl font-bold text-warning">{statsResumen.advertencia}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <Factory className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Críticas</p>
                <p className="text-xl font-bold text-destructive">{statsResumen.criticas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Factory className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Offline</p>
                <p className="text-xl font-bold text-muted-foreground">{statsResumen.offline}</p>
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
                <p className="text-xs text-muted-foreground">Alarmas</p>
                <p className="text-xl font-bold text-destructive">{statsResumen.totalAlarmas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar planta por nombre, ID o ubicación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-border"
          />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[180px] bg-background border-border">
            <SelectValue placeholder="Filtrar estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="operativo">Operativo</SelectItem>
            <SelectItem value="advertencia">Advertencia</SelectItem>
            <SelectItem value="critico">Crítico</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
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
            const isSelected = selectedPlanta?.id === planta.id;

            return (
              <Card
                key={planta.id}
                className={cn(
                  "bg-card border-border cursor-pointer transition-all duration-200 hover:shadow-lg",
                  estadoConfig.bgClass,
                  isSelected && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedPlanta(isSelected ? null : planta)}
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
                        <CardTitle className="text-base">{planta.nombre}</CardTitle>
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
                  <div className="grid grid-cols-2 gap-4">
                    {/* Producción */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Activity className="h-3.5 w-3.5" />
                        Producción
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={planta.produccion} className="h-1.5 flex-1" />
                        <span className="text-sm font-mono font-medium text-foreground">{planta.produccion}%</span>
                      </div>
                    </div>

                    {/* Eficiencia */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Gauge className="h-3.5 w-3.5" />
                        Eficiencia
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={planta.eficiencia} className="h-1.5 flex-1" />
                        <span className="text-sm font-mono font-medium text-foreground">{planta.eficiencia}%</span>
                      </div>
                    </div>

                    {/* Temperatura */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Thermometer className="h-3.5 w-3.5" />
                        Temperatura
                      </div>
                      <span className={cn(
                        "text-sm font-mono font-medium",
                        planta.temperatura > 60 ? "text-destructive" :
                        planta.temperatura > 50 ? "text-warning" : "text-foreground"
                      )}>
                        {planta.temperatura}°C
                      </span>
                    </div>

                    {/* Consumo */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Zap className="h-3.5 w-3.5" />
                        Consumo
                      </div>
                      <span className="text-sm font-mono font-medium text-foreground">
                        {planta.consumoEnergia.toLocaleString()} kWh
                      </span>
                    </div>
                  </div>

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
        /* List View */
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {plantasFiltradas.map((planta) => {
                const estadoConfig = getEstadoConfig(planta.estado);

                return (
                  <div
                    key={planta.id}
                    className={cn(
                      "p-4 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedPlanta?.id === planta.id && "bg-primary/5"
                    )}
                    onClick={() => setSelectedPlanta(selectedPlanta?.id === planta.id ? null : planta)}
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
                        <p className="font-medium text-foreground">{planta.nombre}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {planta.ubicacion}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Producción</p>
                        <p className="font-mono font-medium text-foreground">{planta.produccion}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Eficiencia</p>
                        <p className="font-mono font-medium text-foreground">{planta.eficiencia}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Temp.</p>
                        <p className={cn(
                          "font-mono font-medium",
                          planta.temperatura > 60 ? "text-destructive" :
                          planta.temperatura > 50 ? "text-warning" : "text-foreground"
                        )}>{planta.temperatura}°C</p>
                      </div>
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

      {/* Selected Plant Details */}
      {selectedPlanta && (
        <Card className="bg-card border-border border-t-4 border-t-primary">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Factory className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{selectedPlanta.nombre}</CardTitle>
                  <p className="text-sm text-muted-foreground font-mono">ID: {selectedPlanta.id}</p>
                </div>
              </div>
              <Badge variant="outline" className={getEstadoConfig(selectedPlanta.estado).badgeClass}>
                <div className={cn("status-dot mr-2", getEstadoConfig(selectedPlanta.estado).dotClass)} />
                {getEstadoConfig(selectedPlanta.estado).label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Estado de Producción */}
              <Card className="bg-muted/30 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4" />Estado de Producción
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-bold text-foreground font-mono">{selectedPlanta.produccion}%</span>
                      <span className="text-sm text-muted-foreground">de capacidad</span>
                    </div>
                    <Progress value={selectedPlanta.produccion} className="h-2" />
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-success">+2.5% vs ayer</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Eficiencia */}
              <Card className="bg-muted/30 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Gauge className="h-4 w-4" />Eficiencia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-bold text-foreground font-mono">{selectedPlanta.eficiencia}%</span>
                      <span className="text-sm text-muted-foreground">OEE</span>
                    </div>
                    <Progress value={selectedPlanta.eficiencia} className="h-2" />
                    <p className="text-sm text-muted-foreground">Objetivo: 95%</p>
                  </div>
                </CardContent>
              </Card>

              {/* Temperatura */}
              <Card className="bg-muted/30 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />Temperatura Media
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <span className={cn("text-3xl font-bold font-mono", selectedPlanta.temperatura > 60 ? "text-destructive" : selectedPlanta.temperatura > 50 ? "text-warning" : "text-foreground")}>
                        {selectedPlanta.temperatura}°C
                      </span>
                      <span className="text-sm text-muted-foreground">Máx: 65°C</span>
                    </div>
                    <Progress value={(selectedPlanta.temperatura / 80) * 100} className={cn("h-2", selectedPlanta.temperatura > 60 && "[&>div]:bg-destructive")} />
                  </div>
                </CardContent>
              </Card>

              {/* Consumo Energético */}
              <Card className="bg-muted/30 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4" />Consumo Energético
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-bold text-foreground font-mono">{selectedPlanta.consumoEnergia.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">kWh</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Consumo actual en tiempo real</p>
                  </div>
                </CardContent>
              </Card>

              {/* Cronograma */}
              <Card className="bg-muted/30 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />Cronograma
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Turno actual</span>
                      <span className="text-foreground font-medium">Mañana</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Próximo cambio</span>
                      <span className="text-foreground font-mono">14:00</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mantenimiento</span>
                      <span className="text-foreground">En 3 días</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alarmas Activas */}
              <Card className={cn("bg-muted/30 border-border", selectedPlanta.alarmasActivas > 0 && "border-destructive/50 bg-destructive/5")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className={cn("h-4 w-4", selectedPlanta.alarmasActivas > 0 && "text-destructive")} />
                    Alarmas Activas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <span className={cn("text-3xl font-bold font-mono", selectedPlanta.alarmasActivas > 0 ? "text-destructive" : "text-success")}>
                        {selectedPlanta.alarmasActivas}
                      </span>
                      <span className="text-sm text-muted-foreground">alertas</span>
                    </div>
                    {selectedPlanta.alarmasActivas > 0 ? (
                      <p className="text-sm text-destructive">Requiere atención inmediata</p>
                    ) : (
                      <p className="text-sm text-success">Todo funcionando correctamente</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MonitorizacionSCADA;
