import React, { useState, useEffect, useMemo } from "react";
import { 
  Factory, 
  MapPin, 
  ChevronLeft, 
  Cpu, 
  TrendingUp, 
  Bell, 
  ClipboardList, 
  Activity, 
  ShieldAlert,
  Settings,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sliders
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import apiFetch from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line
} from "recharts";

interface Planta {
  id: string | number;
  nombre: string;
  ubicacion: string;
  estado: string;
  alarmasActivas?: number;
}

interface VistaMacroPlantaProps {
  planta: Planta;
  onVolver: () => void;
}

export const VistaMacroPlanta: React.FC<VistaMacroPlantaProps> = ({ planta, onVolver }) => {
  const [activeTab, setActiveTab] = useState<"jerarquia" | "historico" | "alarmas">("jerarquia");
  const [secciones, setSecciones] = useState<any[]>([]);
  const [sistemas, setSistemas] = useState<any[]>([]);
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [alarmas, setAlarmas] = useState<any[]>([]);
  const [lecturas, setLecturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Estado local para filtrar alarmas por estado
  const [filtroAlarmaEstado, setFiltroAlarmaEstado] = useState<"todas" | "abierta" | "cerrada">("todas");

  const extractId = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return String(val.id ?? val.numero_serie ?? val.pk ?? "");
    return String(val);
  };

  const plantId = extractId(planta?.id);

  // Carga inicial de secciones, dispositivos, sistemas y alarmas
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!plantId) return;
      setLoading(true);
      setHasError(false);

      try {
        const [respSec, respDisp, respAl, respSist] = await Promise.all([
          apiFetch("/api/v1/secciones/"),
          apiFetch("/api/v1/dispositivos/"),
          apiFetch(`/api/v1/alarmas/?planta=${encodeURIComponent(plantId)}`),
          apiFetch("/api/v1/sistemas/")
        ]);

        if (!isMounted) return;

        let secList: any[] = [];
        let dispList: any[] = [];
        let alList: any[] = [];
        let sistList: any[] = [];

        if (respSec.ok) {
          const d = await respSec.json();
          secList = Array.isArray(d) ? d : d.results || [];
        }
        if (respDisp.ok) {
          const d = await respDisp.json();
          dispList = Array.isArray(d) ? d : d.results || [];
        }
        if (respAl.ok) {
          const d = await respAl.json();
          alList = Array.isArray(d) ? d : d.results || [];
        }
        if (respSist.ok) {
          const d = await respSist.json();
          sistList = Array.isArray(d) ? d : d.results || [];
        }

        // Filtrar secciones de la planta
        const secFiltradas = secList.filter(s => extractId(s.fabrica || s.fabrica_id) === plantId);
        setSecciones(secFiltradas);

        // Filtrar sistemas de la planta
        const sistFiltrados = sistList.filter(s => extractId(s.fabrica || s.fabrica_id) === plantId);
        setSistemas(sistFiltrados);

        // Filtrar dispositivos SCADA vinculados (por planta, sección o sistema)
        const dispFiltrados = dispList.filter(d => {
          const fId = extractId(d.fabrica || d.fabrica_id);
          if (fId !== "" && fId === plantId) return true;

          const sId = extractId(d.seccion || d.seccion_id);
          if (sId !== "" && secFiltradas.some(sec => extractId(sec.id) === sId)) return true;

          const sistId = extractId(d.sistema || d.sistema_id);
          if (sistId !== "" && sistFiltrados.some(sys => extractId(sys.id) === sistId)) return true;

          return false;
        });

        setDispositivos(dispFiltrados);
        setAlarmas(alList);

      } catch (err) {
        console.error("Error cargando datos macro de la planta:", err);
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [plantId]);

  // Cargar lecturas históricas acumuladas de la planta para el volumen de telemetría (últimos 7 días)
  useEffect(() => {
    let isMounted = true;
    const fetchPlantLecturas = async () => {
      if (dispositivos.length === 0) return;
      setLoading(true);
      try {
        const now = new Date();
        const desdeISO = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Solicita lecturas de la base de datos de los últimos 7 días
        const url = `/api/v1/lecturas/?modo=historico&fecha_desde=${encodeURIComponent(desdeISO)}&limit=1000`;
        const resp = await apiFetch(url);
        if (resp.ok && isMounted) {
          const dL = await resp.json();
          const list = Array.isArray(dL) ? dL : dL.results || [];
          
          // Filtrar lecturas correspondientes a los dispositivos de esta planta
          const plantLecturas = list.filter((l: any) => 
            dispositivos.some(d => String(d.numero_serie) === String(l.dispositivo))
          );
          setLecturas(plantLecturas);
        }
      } catch (e) {
        console.error("Error al cargar telemetría agregada:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (activeTab === "historico") {
      fetchPlantLecturas();
    }
  }, [activeTab, dispositivos]);

  // --- MÉTRICAS MACRO FACTUALES ---

  // 1. Actividad de Telemetría: Cantidad diaria de mensajes MQTT ingeridos
  const telemetryActivityData = useMemo(() => {
    const conteo: Record<string, number> = {};
    const sorted = [...lecturas].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const l of sorted) {
      if (!l.timestamp) continue;
      const dt = new Date(l.timestamp);
      const dateLabel = dt.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
      conteo[dateLabel] = (conteo[dateLabel] || 0) + 1;
    }

    return Object.entries(conteo).map(([fecha, total]) => ({
      fecha,
      "Mensajes Ingeridos": total
    }));
  }, [lecturas]);

  // 2. Composición de Hardware: Dispositivos por categoría
  const composicionHardwareData = useMemo(() => {
    const conteo: Record<string, number> = {};
    for (const d of dispositivos) {
      const cat = d.categoria || "OTRO";
      const formattedCat = cat.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      conteo[formattedCat] = (conteo[formattedCat] || 0) + 1;
    }
    return Object.entries(conteo).map(([categoria, cantidad]) => ({
      name: categoria,
      "Cantidad": cantidad
    }));
  }, [dispositivos]);

  // 3. Conectividad: Dispositivos ONLINE vs OFFLINE por sección
  const conectividadPorSeccionData = useMemo(() => {
    const data: Record<string, { online: number; offline: number }> = {};
    for (const sec of secciones) {
      data[sec.nombre] = { online: 0, offline: 0 };
    }
    for (const d of dispositivos) {
      const secName = d.seccion_nombre || "Sin Sección";
      if (!data[secName]) {
        data[secName] = { online: 0, offline: 0 };
      }
      if (d.estado === "ONLINE") {
        data[secName].online += 1;
      } else {
        data[secName].offline += 1;
      }
    }
    return Object.entries(data).map(([seccion, stats]) => ({
      name: seccion,
      Online: stats.online,
      Offline: stats.offline
    }));
  }, [secciones, dispositivos]);

  // 4. Distribución de Alarmas: Cantidad de alarmas por sección y por sistema
  const alarmasPorSeccionData = useMemo(() => {
    const conteo: Record<string, number> = {};
    for (const al of alarmas) {
      const secName = al.seccion_nombre || "Sin Sección";
      conteo[secName] = (conteo[secName] || 0) + 1;
    }
    return Object.entries(conteo).map(([seccion, cantidad]) => ({
      name: seccion,
      "Alarmas": cantidad
    }));
  }, [alarmas]);

  const alarmasPorSistemaData = useMemo(() => {
    const conteo: Record<string, number> = {};
    for (const al of alarmas) {
      const device = dispositivos.find(d => 
        String(d.numero_serie) === String(al.sensor_maquina) || 
        String(d.nombre).toLowerCase() === String(al.sensor_maquina).toLowerCase()
      );
      const sysName = device?.sistema_nombre || "Sin Sistema";
      conteo[sysName] = (conteo[sysName] || 0) + 1;
    }
    return Object.entries(conteo).map(([sistema, cantidad]) => ({
      name: sistema,
      "Alarmas": cantidad
    }));
  }, [alarmas, dispositivos]);

  // Estadísticas del dashboard de alarmas
  const statsAlarmas = useMemo(() => {
    const total = alarmas.length;
    const abiertas = alarmas.filter(a => a.estado === "abierta").length;
    const cerradas = alarmas.filter(a => a.estado === "cerrada").length;
    const altaSeveridad = alarmas.filter(a => a.severidad === "alta").length;
    return { total, abiertas, cerradas, altaSeveridad };
  }, [alarmas]);

  // Alarma agrupadas por fecha para el gráfico de barras apiladas
  const alarmasAgrupadasPorFecha = useMemo(() => {
    const conteo: Record<string, { alta: number; media: number; baja: number }> = {};
    
    const sortedAlarmas = [...alarmas].sort(
      (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
    );

    for (const al of sortedAlarmas) {
      if (!al.fecha_hora) continue;
      const dt = new Date(al.fecha_hora);
      const fechaLabel = dt.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
      if (!conteo[fechaLabel]) {
        conteo[fechaLabel] = { alta: 0, media: 0, baja: 0 };
      }
      const sev = (al.severidad || "media").toLowerCase();
      if (sev === "alta") conteo[fechaLabel].alta += 1;
      else if (sev === "media") conteo[fechaLabel].media += 1;
      else if (sev === "baja") conteo[fechaLabel].baja += 1;
    }

    return Object.entries(conteo).map(([fecha, counts]) => ({
      fecha,
      alta: counts.alta,
      media: counts.media,
      baja: counts.baja
    }));
  }, [alarmas]);

  // Alarmas filtradas por estado local
  const alarmasFiltradas = useMemo(() => {
    if (filtroAlarmaEstado === "todas") return alarmas;
    return alarmas.filter(a => a.estado === filtroAlarmaEstado);
  }, [alarmas, filtroAlarmaEstado]);

  const estadoLower = (planta?.estado || "").toString().toLowerCase();
  const isOperativa = estadoLower.includes("operat") || estadoLower.includes("activ");

  if (hasError) {
    return (
      <Card className="bg-card border-border p-6 text-center">
        <ShieldAlert className="h-10 w-10 mx-auto text-destructive mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">Ocurrió un inconveniente al cargar la planta</h3>
        <p className="text-xs text-muted-foreground mb-4">No se pudo obtener la información macro en este momento.</p>
        <Button variant="outline" size="sm" onClick={onVolver}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Volver a Lista de Plantas
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Macro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onVolver}
            className="gap-2 border-border hover:bg-muted text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver a Lista de Plantas
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Factory className="h-6 w-6 text-primary" />
              {planta.nombre}
            </h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5" />
              {planta.ubicacion}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn(
          "px-3 py-1 text-xs font-bold w-fit",
          isOperativa ? "bg-success/20 text-success border-success/30" : "bg-warning/20 text-warning border-warning/30"
        )}>
          {(planta.estado || "OPERATIVO").toUpperCase()}
        </Badge>
      </div>

      {/* Tabs Internos */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="jerarquia" className="gap-2 text-xs font-semibold">
            <Cpu className="h-4 w-4" />
            Jerarquía y Componentes
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 text-xs font-semibold">
            <TrendingUp className="h-4 w-4" />
            Gráficos y Evolución Macro
          </TabsTrigger>
          <TabsTrigger value="alarmas" className="gap-2 text-xs font-semibold">
            <Bell className="h-4 w-4" />
            Alarmas ({alarmas.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Jerarquía */}
        <TabsContent value="jerarquia" className="space-y-4 pt-4 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Secciones */}
            <Card className="bg-card border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Secciones y Líneas de Producción
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs max-h-[350px] overflow-y-auto">
                {secciones.length === 0 ? (
                  <p className="text-muted-foreground italic py-4 text-center">No hay secciones registradas para esta planta</p>
                ) : (
                  secciones.map((sec, idx) => (
                    <div key={sec.id || `sec-${idx}`} className="p-3 rounded bg-muted/20 border border-border flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{sec.nombre}</p>
                        <p className="text-[11px] text-muted-foreground">Código: {sec.codigo || sec.id}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {sec.estado || 'OPERATIVO'}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Sistemas */}
            <Card className="bg-card border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  Sistemas y Maquinaria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs max-h-[350px] overflow-y-auto">
                {sistemas.length === 0 ? (
                  <p className="text-muted-foreground italic py-4 text-center">No hay sistemas registrados para esta planta</p>
                ) : (
                  sistemas.map((sys, idx) => (
                    <div key={sys.id || `sys-${idx}`} className="p-3 rounded bg-muted/20 border border-border flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{sys.nombre}</p>
                        <p className="text-[11px] text-muted-foreground">{sys.descripcion || 'Sin descripción'}</p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[10px]",
                        sys.activo ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-muted"
                      )}>
                        {sys.activo ? 'ACTIVO' : 'INACTIVO'}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Sensores SCADA */}
            <Card className="bg-card border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  Sensores y Actuadores SCADA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs max-h-[350px] overflow-y-auto">
                {dispositivos.length === 0 ? (
                  <p className="text-muted-foreground italic py-4 text-center">No hay sensores vinculados a esta planta</p>
                ) : (
                  dispositivos.map((disp, idx) => {
                    const isOnline = disp.estado === "ONLINE";
                    return (
                      <div key={disp.numero_serie || disp.id || `disp-${idx}`} className="p-3 rounded bg-muted/20 border border-border flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">[{disp.categoria || 'SCADA'}] {disp.nombre}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">S/N: {disp.numero_serie}</p>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border",
                            isOnline ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full mr-1", isOnline ? "bg-success animate-pulse" : "bg-destructive")} />
                            {isOnline ? "ONLINE" : "OFFLINE"}
                          </span>
                          <p className="text-[11px] font-mono font-bold mt-1 text-primary">
                            {disp.valor_lectura !== null && disp.valor_lectura !== undefined ? `${disp.valor_lectura} ${disp.unidad_lectura || ''}` : 'Sin datos'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* Tab 2: Gráficos y Evolución Macro */}
        <TabsContent value="historico" className="space-y-6 pt-4 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Volumen de Ingesta (2 cols) */}
            <Card className="lg:col-span-2 bg-card border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Actividad de Telemetría (Mensajes MQTT)
                </CardTitle>
                <CardDescription className="text-xs">
                  Cantidad diaria de lecturas de sensores procesadas e ingeridas en la base de datos (Últimos 7 días)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {loading ? (
                  <div className="py-16 text-center text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
                    <p className="text-xs">Cargando actividad de telemetría macro...</p>
                  </div>
                ) : telemetryActivityData.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium">Sin datos de telemetría registrados en los últimos 7 días</p>
                  </div>
                ) : (
                  <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={telemetryActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="fecha" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem", color: "hsl(var(--foreground))" }} />
                        <Area type="monotone" dataKey="Mensajes Ingeridos" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Composición del Parque Tecnológico (1 col) */}
            <Card className="bg-card border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Cpu className="h-4 w-4 text-primary" />
                  Composición del Parque SCADA
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribución de dispositivos por categoría física instalada
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {composicionHardwareData.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    <p className="text-xs">Sin dispositivos para clasificar</p>
                  </div>
                ) : (
                  <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={composicionHardwareData} layout="vertical" margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={9} width={80} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                        <Bar dataKey="Cantidad" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 3: Estado de Conectividad por Sección */}
            <Card className="bg-card border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Disponibilidad de Dispositivos por Sección
                </CardTitle>
                <CardDescription className="text-xs">
                  Conteo de sensores ONLINE vs OFFLINE en las líneas de producción
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {conectividadPorSeccionData.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <p className="text-xs">Sin datos de conectividad por sección</p>
                  </div>
                ) : (
                  <div className="w-full h-[240px]">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={conectividadPorSeccionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                        <Legend wrapperStyle={{ fontSize: '11px', marginTop: '5px' }} />
                        <Bar dataKey="Online" stackId="a" fill="#22c55e" />
                        <Bar dataKey="Offline" stackId="a" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 4: Frecuencia de Alertas por Sección y Sistema */}
            <Card className="bg-card border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Bell className="h-4 w-4 text-warning" />
                  Puntos de Inestabilidad (Alarmas por Componente)
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribución total de alarmas acumuladas según el área de la planta
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {alarmas.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <p className="text-sm font-medium">No hay alertas registradas para esta planta</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2 text-center font-sans tracking-wide">Por Sección Interna</p>
                      <div className="w-full h-[180px]">
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={alarmasPorSeccionData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={8} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={8} allowDecimals={false} />
                            <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                            <Bar dataKey="Alarmas" fill="#f97316" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2 text-center font-sans tracking-wide">Por Sistema Integrado</p>
                      <div className="w-full h-[180px]">
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={alarmasPorSistemaData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={8} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={8} allowDecimals={false} />
                            <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                            <Bar dataKey="Alarmas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* Tab 3: Alarmas */}
        <TabsContent value="alarmas" className="space-y-4 pt-4 outline-none">
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Total Alarmas</span>
                  <span className="block text-2xl font-bold text-foreground mt-1">{statsAlarmas.total}</span>
                </div>
                <Bell className="h-8 w-8 text-muted-foreground/30" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Abiertas</span>
                  <span className="block text-2xl font-bold text-warning mt-1">{statsAlarmas.abiertas}</span>
                </div>
                <AlertCircle className="h-8 w-8 text-warning/30" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Cerradas</span>
                  <span className="block text-2xl font-bold text-success mt-1">{statsAlarmas.cerradas}</span>
                </div>
                <CheckCircle2 className="h-8 w-8 text-success/30" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Severidad Alta</span>
                  <span className="block text-2xl font-bold text-destructive mt-1">{statsAlarmas.altaSeveridad}</span>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive/30" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gráfico de Evolución de Alarmas */}
            <Card className="lg:col-span-2 bg-card border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Evolución Temporal de Alarmas
                </CardTitle>
                <CardDescription className="text-xs">
                  Cantidad de alarmas por día agrupadas por su severidad
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {alarmasAgrupadasPorFecha.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs">Sin registros de alarmas para graficar</p>
                  </div>
                ) : (
                  <div className="w-full h-[240px]">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={alarmasAgrupadasPorFecha} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="fecha" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem", color: "hsl(var(--foreground))" }} />
                        <Legend wrapperStyle={{ fontSize: '11px', marginTop: '5px' }} />
                        <Bar dataKey="alta" name="Alta" stackId="a" fill="#ef4444" />
                        <Bar dataKey="media" name="Media" stackId="a" fill="#f97316" />
                        <Bar dataKey="baja" name="Baja" stackId="a" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listado de Alarmas y Filtros */}
            <Card className="bg-card border border-border flex flex-col h-[328px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  Listado de Alertas
                </CardTitle>
                
                {/* Controles de Filtro Rápido */}
                <div className="flex gap-1 mt-2">
                  <Button 
                    variant={filtroAlarmaEstado === "todas" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setFiltroAlarmaEstado("todas")}
                    className="text-[10px] px-2.5 py-1 h-7 flex-1"
                  >
                    Todas ({statsAlarmas.total})
                  </Button>
                  <Button 
                    variant={filtroAlarmaEstado === "abierta" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setFiltroAlarmaEstado("abierta")}
                    className="text-[10px] px-2.5 py-1 h-7 flex-1"
                  >
                    Abiertas ({statsAlarmas.abiertas})
                  </Button>
                  <Button 
                    variant={filtroAlarmaEstado === "cerrada" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setFiltroAlarmaEstado("cerrada")}
                    className="text-[10px] px-2.5 py-1 h-7 flex-1"
                  >
                    Cerradas ({statsAlarmas.cerradas})
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2 flex-grow overflow-y-auto pr-1">
                {alarmasFiltradas.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    <ShieldAlert className="h-8 w-8 mx-auto text-success/60 mb-2" />
                    <p className="text-xs">No hay alarmas en esta categoría</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alarmasFiltradas.map((al, idx) => {
                      const sevStr = (al.severidad || "media").toLowerCase();
                      const isAlta = sevStr === "alta";
                      const isMedia = sevStr === "media";
                      const formattedDate = al.fecha_hora ? new Date(al.fecha_hora).toLocaleString() : "Reciente";
                      const isOpen = al.estado === "abierta";

                      return (
                        <div key={al.id || `al-${idx}`} className="p-2.5 rounded-lg bg-muted/20 border border-border flex flex-col gap-1 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={cn(
                                "text-[9px] font-bold px-1.5 py-0",
                                isAlta ? "bg-destructive/20 text-destructive border-destructive/30" : 
                                isMedia ? "bg-warning/20 text-warning border-warning/30" : 
                                "bg-primary/20 text-primary border-primary/30"
                              )}>
                                {sevStr.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className={cn(
                                "text-[9px] px-1.5 py-0 font-bold",
                                isOpen ? "border-warning text-warning bg-warning/5" : "border-success text-success bg-success/5"
                              )}>
                                {isOpen ? "ABIERTA" : "CERRADA"}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground leading-snug">{al.descripcion}</p>
                            {al.sensor_maquina && (
                              <p className="text-[10px] text-muted-foreground font-mono mt-1">
                                <span className="font-sans">Sensor/Máquina:</span> {al.sensor_maquina}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VistaMacroPlanta;
