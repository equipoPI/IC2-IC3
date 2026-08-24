import { useState, useEffect } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  AlertOctagon, 
  Users, 
  Cpu, 
  Building2,
  RefreshCw,
  Sliders,
  Layers,
  PieChart as PieIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import apiFetch from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface TendenciaAlarma {
  fecha: string;
  abiertas: number;
  cerradas: number;
  total: number;
}

interface AlarmaPlanta {
  planta_id: number;
  planta_nombre: string;
  abiertas: number;
  cerradas: number;
  total: number;
}

interface EmpleadoPlanta {
  planta_id: number;
  planta_nombre: string;
  empleados: number;
}

interface AlarmaSensor {
  sensor_maquina: string;
  total: number;
}

interface DensidadPlanta {
  planta_nombre: string;
  secciones: number;
  dispositivos: number;
  estado: string;
}

interface AlarmaSeveridad {
  severidad: string;
  total: number;
}

interface DispositivoEstado {
  estado: string;
  total: number;
}

interface DispositivoSeccion {
  seccion_nombre: string;
  planta_nombre: string;
  dispositivos: number;
}

interface EmpleadoRango {
  rango: string;
  total: number;
}

interface EstadisticasData {
  tendencia_alarmas: TendenciaAlarma[];
  alarmas_por_planta: AlarmaPlanta[];
  empleados_por_planta: EmpleadoPlanta[];
  alarmas_por_sensor: AlarmaSensor[];
  resumen_densidad: DensidadPlanta[];
  alarmas_por_severidad: AlarmaSeveridad[];
  dispositivos_por_estado: DispositivoEstado[];
  dispositivos_por_seccion: DispositivoSeccion[];
  empleados_por_rango: EmpleadoRango[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const AnalisisEstadisticas = () => {
  const [data, setData] = useState<EstadisticasData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para exploración dinámica
  const [metricaActiva, setMetricaActiva] = useState<"alarmas" | "sensores" | "personal">("alarmas");
  const [varianteActiva, setVarianteActiva] = useState<string>("tendencia");
  const [filtroTiempo, setFiltroTiempo] = useState<"7" | "15" | "30">("30");

  const loadData = async () => {
    try {
      setLoading(true);
      const resp = await apiFetch("/api/v1/analisis/estadisticas/");
      if (resp.ok) {
        const json = await resp.json();
        setData(json);
      } else {
        throw new Error("No se pudo obtener la información de analítica");
      }
    } catch (error) {
      toast({
        title: "Error al cargar estadísticas",
        description: "No se pudieron obtener los datos de análisis del backend.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Al cambiar de métrica principal, preseleccionar la primera variante coherente
  const handleMetricaChange = (metrica: "alarmas" | "sensores" | "personal") => {
    setMetricaActiva(metrica);
    if (metrica === "alarmas") setVarianteActiva("tendencia");
    if (metrica === "sensores") setVarianteActiva("estados");
    if (metrica === "personal") setVarianteActiva("distribucion");
  };

  // Filtrado de tendencia temporal
  const tendenciaFiltrada = data?.tendencia_alarmas.slice(-parseInt(filtroTiempo)) || [];

  // Totales
  const totalAlarmas = data?.alarmas_por_planta.reduce((acc, curr) => acc + curr.total, 0) || 0;
  const totalEmpleados = data?.empleados_por_planta.reduce((acc, curr) => acc + curr.empleados, 0) || 0;
  const totalDispositivos = data?.resumen_densidad.reduce((acc, curr) => acc + curr.dispositivos, 0) || 0;

  const renderCustomizedLabel = ({ name, percent }: any) => {
    return `${name} (${(percent * 100).toFixed(0)}%)`;
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Analítica y Estadísticas SCADA</h1>
            <p className="text-sm text-muted-foreground">Explorador dinámico de métricas operacionales e históricos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="border-border">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin mr-3 text-primary" />
          Compilando y procesando datos históricos del SCADA...
        </div>
      ) : !data ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-lg">
          No hay registros de analítica disponibles en este momento.
        </div>
      ) : (
        <>
          {/* Tarjetas de Resumen Rápido */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleMetricaChange("alarmas")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertOctagon className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Métrica: Alarmas</p>
                    <p className="text-xl font-bold text-foreground">{totalAlarmas}</p>
                  </div>
                </div>
                {metricaActiva === "alarmas" && <Badge>Activo</Badge>}
              </CardContent>
            </Card>

            <Card className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleMetricaChange("personal")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Métrica: Personal</p>
                    <p className="text-xl font-bold text-foreground">{totalEmpleados}</p>
                  </div>
                </div>
                {metricaActiva === "personal" && <Badge>Activo</Badge>}
              </CardContent>
            </Card>

            <Card className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleMetricaChange("sensores")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Cpu className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Métrica: Sensores</p>
                    <p className="text-xl font-bold text-foreground">{totalDispositivos}</p>
                  </div>
                </div>
                {metricaActiva === "sensores" && <Badge>Activo</Badge>}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Plantas</p>
                  <p className="text-xl font-bold text-foreground">{data.resumen_densidad.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel Exploratorio: Selección de Métrica y Variante */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Controles de Selección a la Izquierda */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-card border-border">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    Filtros de Exploración
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  {/* Selector de Métrica */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">1. Seleccione la variable</label>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant={metricaActiva === "alarmas" ? "default" : "outline"}
                        className="justify-start text-xs h-9 w-full"
                        onClick={() => handleMetricaChange("alarmas")}
                      >
                        <AlertOctagon className="h-4 w-4 mr-2" />
                        Incidencias y Alarmas
                      </Button>
                      <Button
                        variant={metricaActiva === "sensores" ? "default" : "outline"}
                        className="justify-start text-xs h-9 w-full"
                        onClick={() => handleMetricaChange("sensores")}
                      >
                        <Cpu className="h-4 w-4 mr-2" />
                        Dispositivos SCADA
                      </Button>
                      <Button
                        variant={metricaActiva === "personal" ? "default" : "outline"}
                        className="justify-start text-xs h-9 w-full"
                        onClick={() => handleMetricaChange("personal")}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Distribución de Personal
                      </Button>
                    </div>
                  </div>

                  {/* Selector de Variante en función de la métrica */}
                  <div className="space-y-1.5 border-t border-border pt-3">
                    <label className="text-xs font-semibold text-muted-foreground">2. Variante / Vista</label>
                    
                    {metricaActiva === "alarmas" && (
                      <div className="flex flex-col gap-1">
                        <Button
                          variant={varianteActiva === "tendencia" ? "secondary" : "ghost"}
                          className="justify-start text-xs h-8 w-full"
                          onClick={() => setVarianteActiva("tendencia")}
                        >
                          <TrendingUp className="h-3.5 w-3.5 mr-2" />
                          Histórico y Tendencias
                        </Button>
                        <Button
                          variant={varianteActiva === "planta" ? "secondary" : "ghost"}
                          className="justify-start text-xs h-8 w-full"
                          onClick={() => setVarianteActiva("planta")}
                        >
                          <Building2 className="h-3.5 w-3.5 mr-2" />
                          Volumen por Planta
                        </Button>
                        <Button
                          variant={varianteActiva === "severidad" ? "secondary" : "ghost"}
                          className="justify-start text-xs h-8 w-full"
                          onClick={() => setVarianteActiva("severidad")}
                        >
                          <PieIcon className="h-3.5 w-3.5 mr-2" />
                          Severidad de Alertas
                        </Button>
                        <Button
                          variant={varianteActiva === "sensores_criticos" ? "secondary" : "ghost"}
                          className="justify-start text-xs h-8 w-full"
                          onClick={() => setVarianteActiva("sensores_criticos")}
                        >
                          <AlertOctagon className="h-3.5 w-3.5 mr-2" />
                          Top Sensores con Falla
                        </Button>
                      </div>
                    )}

                    {metricaActiva === "sensores" && (
                      <div className="flex flex-col gap-1">
                        <Button
                          variant={varianteActiva === "estados" ? "secondary" : "ghost"}
                          className="justify-start text-xs h-8 w-full"
                          onClick={() => setVarianteActiva("estados")}
                        >
                          <PieIcon className="h-3.5 w-3.5 mr-2" />
                          Estado de Sensores
                        </Button>
                        <Button
                          variant={varianteActiva === "secciones" ? "secondary" : "ghost"}
                          className="justify-start text-xs h-8 w-full"
                          onClick={() => setVarianteActiva("secciones")}
                        >
                          <Layers className="h-3.5 w-3.5 mr-2" />
                          Dispositivos por Sección
                        </Button>
                        <Button
                          variant={varianteActiva === "densidad" ? "secondary" : "ghost"}
                          className="justify-start text-xs h-8 w-full"
                          onClick={() => setVarianteActiva("densidad")}
                        >
                          <Building2 className="h-3.5 w-3.5 mr-2" />
                          Densidad Operativa
                        </Button>
                      </div>
                    )}

                    {metricaActiva === "personal" && (
                      <div className="flex flex-col gap-1">
                        <Button
                          variant={varianteActiva === "distribucion" ? "secondary" : "ghost"}
                          className="justify-start text-xs h-8 w-full"
                          onClick={() => setVarianteActiva("distribucion")}
                        >
                          <PieIcon className="h-3.5 w-3.5 mr-2" />
                          Distribución por Planta
                        </Button>
                        <Button
                          variant={varianteActiva === "rangos" ? "secondary" : "ghost"}
                          className="justify-start text-xs h-8 w-full"
                          onClick={() => setVarianteActiva("rangos")}
                        >
                          <Users className="h-3.5 w-3.5 mr-2" />
                          Distribución por Rango/Rol
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Espacio del Gráfico Dinámico a la Derecha */}
            <div className="lg:col-span-3">
              <Card className="bg-card border-border h-full">
                
                {/* 1. Alarmas: Tendencia Histórica */}
                {metricaActiva === "alarmas" && varianteActiva === "tendencia" && (
                  <>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-red-400" />
                          Histórico de Alarmas en el Tiempo
                        </CardTitle>
                        <CardDescription>Volumen diario de alarmas abiertas y resueltas</CardDescription>
                      </div>
                      <div className="flex border border-border rounded bg-background overflow-hidden">
                        {(["7", "15", "30"] as const).map((d) => (
                          <button
                            key={d}
                            onClick={() => setFiltroTiempo(d)}
                            className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                              filtroTiempo === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/10"
                            }`}
                          >
                            {d}D
                          </button>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={tendenciaFiltrada} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorAbiertas2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorCerradas2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                            <XAxis dataKey="fecha" stroke="#888" fontSize={11} tickLine={false} />
                            <YAxis stroke="#888" fontSize={11} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#2a2a2a" }} />
                            <Legend verticalAlign="top" height={36} />
                            <Area name="Alarmas Abiertas" type="monotone" dataKey="abiertas" stroke="#ef4444" fillOpacity={1} fill="url(#colorAbiertas2)" strokeWidth={2} />
                            <Area name="Alarmas Cerradas" type="monotone" dataKey="cerradas" stroke="#10b981" fillOpacity={1} fill="url(#colorCerradas2)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </>
                )}

                {/* 2. Alarmas: Volumen por Planta */}
                {metricaActiva === "alarmas" && varianteActiva === "planta" && (
                  <>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Concentración de Alarmas por Planta
                      </CardTitle>
                      <CardDescription>Comparativa del volumen total acumulado de alertas por fábrica</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.alarmas_por_planta} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                            <XAxis dataKey="planta_nombre" stroke="#888" fontSize={11} tickLine={false} />
                            <YAxis stroke="#888" fontSize={11} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#2a2a2a" }} />
                            <Legend verticalAlign="top" height={36} />
                            <Bar name="Abiertas" dataKey="abiertas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar name="Resueltas" dataKey="cerradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </>
                )}

                {/* 3. Alarmas: Severidad */}
                {metricaActiva === "alarmas" && varianteActiva === "severidad" && (
                  <>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieIcon className="h-5 w-5 text-amber-400" />
                        Alertas por Nivel de Severidad
                      </CardTitle>
                      <CardDescription>Distribución porcentual de severidades (Alta, Media, Baja)</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                      <div className="h-80 w-full max-w-md">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.alarmas_por_severidad}
                              dataKey="total"
                              nameKey="severidad"
                              cx="50%"
                              cy="50%"
                              outerRadius={90}
                              label={renderCustomizedLabel}
                              fontSize={11}
                            >
                              {data.alarmas_por_severidad.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#2a2a2a" }} />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </>
                )}

                {/* 4. Alarmas: Top Sensores Críticos */}
                {metricaActiva === "alarmas" && varianteActiva === "sensores_criticos" && (
                  <>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertOctagon className="h-5 w-5 text-red-500" />
                        Top 10 Sensores y Máquinas Afectadas
                      </CardTitle>
                      <CardDescription>Componentes mecánicos que registran mayor número de fallas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-w-2xl mx-auto py-4">
                        {data.alarmas_por_sensor.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic text-center py-10">No hay fallas de sensores registradas en la base de datos.</p>
                        ) : (
                          data.alarmas_por_sensor.map((sensor, idx) => (
                            <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-2">
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs bg-red-500/10 text-red-400 border-red-500/20">
                                  {idx + 1}
                                </Badge>
                                <span className="font-mono text-sm font-semibold text-foreground">{sensor.sensor_maquina}</span>
                              </div>
                              <span className="font-semibold text-destructive flex items-center gap-1.5 text-sm">
                                <AlertOctagon className="h-4 w-4" />
                                {sensor.total} incidentes
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </>
                )}

                {/* 5. Sensores: Estado de Dispositivos */}
                {metricaActiva === "sensores" && varianteActiva === "estados" && (
                  <>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-amber-400" />
                        Estado Operativo General de Sensores
                      </CardTitle>
                      <CardDescription>Proporción de dispositivos en línea, advertencia o falla</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                      <div className="h-80 w-full max-w-md">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.dispositivos_por_estado}
                              dataKey="total"
                              nameKey="estado"
                              cx="50%"
                              cy="50%"
                              outerRadius={90}
                              label={renderCustomizedLabel}
                              fontSize={11}
                            >
                              {data.dispositivos_por_estado.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#2a2a2a" }} />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </>
                )}

                {/* 6. Sensores: Por Sección */}
                {metricaActiva === "sensores" && varianteActiva === "secciones" && (
                  <>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        Sensores Monitoreados por Sección
                      </CardTitle>
                      <CardDescription>Distribución de instrumentación industrial por sector y fábrica</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.dispositivos_por_seccion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                            <XAxis dataKey="seccion_nombre" stroke="#888" fontSize={11} tickLine={false} />
                            <YAxis stroke="#888" fontSize={11} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#2a2a2a" }} />
                            <Legend verticalAlign="top" height={36} />
                            <Bar name="Sensores Activos" dataKey="dispositivos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </>
                )}

                {/* 7. Sensores: Densidad */}
                {metricaActiva === "sensores" && varianteActiva === "densidad" && (
                  <>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Densidad Operativa e Infraestructura
                      </CardTitle>
                      <CardDescription>Resumen de infraestructura industrial por planta</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border border-border rounded-lg overflow-hidden mt-4 max-w-3xl mx-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border">
                              <th className="p-3 text-xs font-semibold text-muted-foreground uppercase">Planta / Fábrica</th>
                              <th className="p-3 text-xs font-semibold text-muted-foreground uppercase">Secciones</th>
                              <th className="p-3 text-xs font-semibold text-muted-foreground uppercase">Sensores Conectados</th>
                              <th className="p-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.resumen_densidad.map((planta, idx) => (
                              <tr key={idx} className="border-b border-border/40 hover:bg-muted/10">
                                <td className="p-3 font-semibold text-foreground">{planta.planta_nombre}</td>
                                <td className="p-3 font-mono text-xs">{planta.secciones} sectores</td>
                                <td className="p-3 font-mono text-xs">{planta.dispositivos} dispositivos</td>
                                <td className="p-3">
                                  <Badge 
                                    variant="outline"
                                    className={
                                      planta.estado === "OPERATIVO"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    }
                                  >
                                    {planta.estado}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </>
                )}

                {/* 8. Personal: Distribución de Operarios */}
                {metricaActiva === "personal" && varianteActiva === "distribucion" && (
                  <>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-400" />
                        Distribución de Operarios y Personal Activo
                      </CardTitle>
                      <CardDescription>Carga laboral porcentual distribuida por fábrica (con cantidad de empleados por planta)</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center gap-4">
                      <div className="h-72 w-full max-w-md">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.empleados_por_planta.filter(p => p.empleados > 0)}
                              dataKey="empleados"
                              nameKey="planta_nombre"
                              cx="50%"
                              cy="50%"
                              outerRadius={85}
                              label={renderCustomizedLabel}
                              fontSize={11}
                            >
                              {data.empleados_por_planta.filter(p => p.empleados > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#2a2a2a" }} />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Lista detallada de conteo por planta */}
                      <div className="w-full max-w-md border border-border/40 rounded-lg p-3 bg-muted/10 space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Desglose de Personal por Planta:</p>
                        {data.empleados_por_planta.map((pl, idx) => (
                          <div key={idx} className="flex justify-between text-sm text-foreground">
                            <span className="font-medium">{pl.planta_nombre}</span>
                            <span className="font-mono font-bold text-primary">{pl.empleados} operarios</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </>
                )}

                {/* 9. Personal: Distribución de Operarios por Rango */}
                {metricaActiva === "personal" && varianteActiva === "rangos" && (
                  <>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-400" />
                        Distribución de Operarios por Rango/Rol
                      </CardTitle>
                      <CardDescription>Clasificación de personal activo por jerarquía o cargo</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center gap-4">
                      <div className="h-72 w-full max-w-md">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.empleados_por_rango.filter(r => r.total > 0)}
                              dataKey="total"
                              nameKey="rango"
                              cx="50%"
                              cy="50%"
                              outerRadius={85}
                              label={renderCustomizedLabel}
                              fontSize={11}
                            >
                              {data.empleados_por_rango.filter(r => r.total > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#2a2a2a" }} />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Lista detallada de conteo por rango */}
                      <div className="w-full max-w-md border border-border/40 rounded-lg p-3 bg-muted/10 space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Desglose por Cargo / Jerarquía:</p>
                        {data.empleados_por_rango.map((rg, idx) => (
                          <div key={idx} className="flex justify-between text-sm text-foreground">
                            <span className="font-medium capitalize">{rg.rango.toLowerCase()}</span>
                            <span className="font-mono font-bold text-primary">{rg.total} personal</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </>
                )}

              </Card>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default AnalisisEstadisticas;
