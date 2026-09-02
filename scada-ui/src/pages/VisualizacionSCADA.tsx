import { Activity, Settings, Play, Pause, RotateCcw, Maximize2, Filter, Layers, Check, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import apiFetch from "@/lib/api";
import ScadaFlowDiagram from "@/components/scada/ScadaFlowDiagram";
import { ControlReposicionModal } from "@/components/scada/ControlReposicionModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const VisualizacionSCADA = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReposicionOpen, setIsReposicionOpen] = useState(false);
  const [dispositivos, setDispositivos] = useState<any[]>([]);

  // Filter lists fetched from database
  const [plantas, setPlantas] = useState<any[]>([]);
  const [secciones, setSecciones] = useState<any[]>([]);
  const [sistemas, setSistemas] = useState<any[]>([]);

  // Active filter selections
  const [selectedPlanta, setSelectedPlanta] = useState<string>('todas');
  const [selectedSeccion, setSelectedSeccion] = useState<string>('todas');
  const [selectedSistema, setSelectedSistema] = useState<string>('todas');

  // MQTT Config modal states
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeConfig, setActiveConfig] = useState<any | null>(null);
  const [nombreConfig, setNombreConfig] = useState('');
  const [brokerUrl, setBrokerUrl] = useState('');
  const [puerto, setPuerto] = useState(1883);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [usarTls, setUsarTls] = useState(false);
  const [keepAlive, setKeepAlive] = useState(60);
  const [topicBase, setTopicBase] = useState('scada/');

  // Cargar dispositivos reales
  const loadDispositivos = async () => {
    try {
      const resp = await apiFetch("/api/v1/dispositivos/");
      if (resp.ok) {
        const data = await resp.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setDispositivos(list);
      }
    } catch (e) {
      // silent
    }
  };

  // Cargar Planta / Sección / Sistema desde DB
  const loadFiltros = async () => {
    try {
      const [rPlantas, rSecciones, rSistemas] = await Promise.all([
        apiFetch("/api/v1/fabricas/"),
        apiFetch("/api/v1/secciones/"),
        apiFetch("/api/v1/sistemas/"),
      ]);

      if (rPlantas.ok) {
        const data = await rPlantas.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setPlantas(list);
      }
      if (rSecciones.ok) {
        const data = await rSecciones.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setSecciones(list);
      }
      if (rSistemas.ok) {
        const data = await rSistemas.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setSistemas(list);
      }
    } catch (e) {
      // silent
    }
  };

  // Cargar configuración de MQTT activa
  const loadMqttConfig = async () => {
    try {
      const resp = await apiFetch("/api/v1/configuraciones-mqtt/");
      if (resp.ok) {
        const data = await resp.json();
        const list = Array.isArray(data) ? data : data.results || [];
        const active = list.find((c: any) => c.activo) || list[0] || null;
        setActiveConfig(active);
        
        if (active) {
          setNombreConfig(active.nombre || '');
          setBrokerUrl(active.broker_url || '');
          setPuerto(active.puerto || 1883);
          setUsuario(active.usuario || '');
          setPassword(active.password || '');
          setUsarTls(active.usar_tls || false);
          setKeepAlive(active.keep_alive || 60);
          setTopicBase(active.topic_base || 'scada/');
        }
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    loadDispositivos();
    loadFiltros();
    loadMqttConfig();
    const interval = setInterval(loadDispositivos, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen event listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Enviar comando manual al backend vía MQTT
  const handleControlClick = async (deviceId: string, actionLabel: string) => {
    let comando = "";
    const actUpper = actionLabel.toUpperCase();
    if (actUpper.includes("ABRIR")) comando = "ABRIR";
    else if (actUpper.includes("CERRAR")) comando = "CERRAR";
    else if (actUpper.includes("INICIAR") || actUpper.includes("REANUDAR")) comando = "INICIAR";
    else if (actUpper.includes("PAUSAR") || actUpper.includes("DETENER") || actUpper.includes("PARAR")) comando = "PAUSAR";
    else if (actUpper.includes("VACIAR")) comando = "VACIAR";
    else if (actUpper.includes("DESCARTAR") || actUpper.includes("DESECHAR")) comando = "DESCARTAR";
    else comando = actionLabel.toLowerCase();

    if (!comando) return;

    try {
      toast.info(`Enviando comando '${actionLabel}'...`);
      let resp;
      if (deviceId === 'proceso' && selectedSistema !== 'todas') {
        resp = await apiFetch(`/api/v1/sistemas/${selectedSistema}/control/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comando }),
        });
      } else {
        resp = await apiFetch(`/api/v1/dispositivos/${deviceId}/control/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comando }),
        });
      }

      if (resp.ok) {
        toast.success(`Comando '${actionLabel}' publicado exitosamente en el bus MQTT`);
        loadDispositivos();
      } else {
        const errData = await resp.json().catch(() => ({}));
        toast.error(`Error al enviar comando: ${errData.error || resp.statusText}`);
      }
    } catch (e) {
      toast.error("Error de conexión al comunicarse con la API SCADA");
    }
  };

  // Guardar cambios del broker MQTT
  const handleSaveMqttConfig = async () => {
    try {
      toast.info("Guardando configuración MQTT...");
      const body = {
        nombre: nombreConfig || "Configuración SCADA Activa",
        broker_url: brokerUrl,
        puerto: Number(puerto),
        usuario: usuario || null,
        password: password || null,
        usar_tls: usarTls,
        keep_alive: Number(keepAlive),
        topic_base: topicBase,
        activo: true,
      };

      let resp;
      if (activeConfig?.id) {
        resp = await apiFetch(`/api/v1/configuraciones-mqtt/${activeConfig.id}/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        resp = await apiFetch(`/api/v1/configuraciones-mqtt/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (resp.ok) {
        toast.success("Configuración MQTT guardada y activada con éxito");
        setIsConfigOpen(false);
        loadMqttConfig();
      } else {
        const errData = await resp.json();
        toast.error(`Error al guardar: ${JSON.stringify(errData)}`);
      }
    } catch (e) {
      toast.error("Error al conectar con la API de configuración");
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Obtener datos del dispositivo de proceso
  const procesoDev = dispositivos.find(d => d.numero_serie === 'proceso');
  const totalMin = procesoDev?.valor_lectura !== null ? Number(procesoDev?.valor_lectura) : null;
  const tiempoEst = totalMin !== null && !isNaN(totalMin)
    ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`
    : "0h 0m";
  
  const isRunning = totalMin !== null && totalMin > 0;
  const faseProceso = isRunning ? "Mezclado" : "Detenido";
  const progresoProceso = procesoDev && totalMin && totalMin > 0 
    ? `${Math.max(0, Math.min(100, Math.round(100 - (totalMin / 150) * 100)))}%` 
    : "0%";

  // Filtros dinámicos basados en la selección de Planta
  const filteredSecciones = useMemo(() => {
    if (selectedPlanta === 'todas') return secciones;
    return secciones.filter(s => String(s.fabrica) === selectedPlanta);
  }, [secciones, selectedPlanta]);

  const filteredSistemas = useMemo(() => {
    if (selectedPlanta === 'todas') return sistemas;
    return sistemas.filter(sys => String(sys.fabrica) === selectedPlanta);
  }, [sistemas, selectedPlanta]);

  // Get relevant controls based on selected filters
  const relevantControls = useMemo(() => {
    const fallbacks = [
      { id: 'bomba_reposicion', label: 'Bomba Reposición', status: 'Detenida', statusColor: 'outline', actions: ['Iniciar'] },
      { id: 'electrovalvula-1', label: 'Válvula Rep. A', status: 'Cerrada', statusColor: 'outline', actions: ['Abrir'] },
      { id: 'electrovalvula-2', label: 'Válvula Rep. B', status: 'Cerrada', statusColor: 'outline', actions: ['Abrir'] },
      { id: 'pump-1', label: 'Bomba A', status: 'Detenida', statusColor: 'outline', actions: ['Iniciar'] },
      { id: 'pump-2', label: 'Bomba B', status: 'Detenida', statusColor: 'outline', actions: ['Iniciar'] },
      { id: 'mixer-1', label: 'Mezclador M1', status: 'Detenido', statusColor: 'outline', actions: ['Iniciar'] },
      { id: 'bomba_mezcla', label: 'Bomba de Mezcla', status: 'Detenida', statusColor: 'outline', actions: ['Iniciar'] },
    ];

    const mappedControls = fallbacks.map(fb => {
      const dev = dispositivos.find(d => d.numero_serie === fb.id);
      if (!dev) return fb;

      const isActivo = dev.valor_lectura === 1 || dev.valor_lectura === "open" || dev.valor_lectura === "running" || String(dev.valor_lectura) === "1.0" || String(dev.valor_lectura) === "true";
      
      if (dev.categoria === 'VALVULA') {
        return {
          id: dev.numero_serie,
          label: dev.nombre || fb.label,
          status: isActivo ? 'Abierta' : 'Cerrada',
          statusColor: isActivo ? 'success' : 'outline',
          actions: isActivo ? ['Cerrar'] : ['Abrir']
        };
      } else {
        return {
          id: dev.numero_serie,
          label: dev.nombre || fb.label,
          status: isActivo ? 'Activo' : 'Detenido',
          statusColor: isActivo ? 'success' : 'outline',
          actions: isActivo ? ['Detener'] : ['Iniciar']
        };
      }
    });

    // Filtrar controles por la sección/sistema seleccionados o mantener controles generales si no hay restricción estricta
    return mappedControls.filter(control => {
      if (selectedSeccion === 'todas' && selectedSistema === 'todas') return true;
      const dev = dispositivos.find(d => d.numero_serie === control.id);
      if (!dev) return true; // mantener fallbacks de control
      if (selectedSeccion !== 'todas' && dev.seccion && String(dev.seccion) !== selectedSeccion) return false;
      if (selectedSistema !== 'todas' && dev.sistema && String(dev.sistema) !== selectedSistema) return false;
      return true;
    });
  }, [selectedSeccion, selectedSistema, dispositivos]);

  const currentViewLabel = useMemo(() => {
    if (selectedSistema !== 'todas') {
      const sys = sistemas.find(s => String(s.id) === selectedSistema);
      return sys ? `Sistema: ${sys.nombre}` : 'Todos los Sistemas';
    }
    if (selectedSeccion !== 'todas') {
      const sec = secciones.find(s => String(s.id) === selectedSeccion);
      return sec ? `Sección: ${sec.nombre}` : 'Todas las Secciones';
    }
    if (selectedPlanta !== 'todas') {
      const pl = plantas.find(p => String(p.id) === selectedPlanta);
      return pl ? `Planta: ${pl.nombre}` : 'Todas las Plantas';
    }
    return 'Planta Completa';
  }, [selectedPlanta, selectedSeccion, selectedSistema, plantas, secciones, sistemas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
            Visualización SCADA
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitoreo en tiempo real de variables físicas y control de actuadores
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main SCADA Diagram & Process Controls */}
        <div className="xl:col-span-3 space-y-4">
          <Card className="bg-card border-border shadow-md" ref={containerRef}>
            <CardHeader className="pb-3 bg-card border-b border-border/50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Diagrama de Proceso en Tiempo Real
                </CardTitle>
                
                {/* Real Database Dropdown Selectors */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Select Planta */}
                  <Select value={selectedPlanta} onValueChange={(val) => {
                    setSelectedPlanta(val);
                    setSelectedSeccion('todas');
                    setSelectedSistema('todas');
                  }}>
                    <SelectTrigger className="w-[170px] bg-background border-border h-9 text-xs">
                      <SelectValue placeholder="Planta: Todas" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="todas">🏭 Todas las Plantas</SelectItem>
                      {plantas.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>🏭 {p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Select Sección */}
                  <Select value={selectedSeccion} onValueChange={(val) => {
                    setSelectedSeccion(val);
                    setSelectedSistema('todas');
                  }} disabled={selectedPlanta === 'todas'}>
                    <SelectTrigger className="w-[170px] bg-background border-border h-9 text-xs">
                      <SelectValue placeholder="Sección: Todas" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="todas">📂 Todas las Secciones</SelectItem>
                      {filteredSecciones.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>📂 {s.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Select Sistema */}
                  <Select value={selectedSistema} onValueChange={setSelectedSistema} disabled={selectedSeccion === 'todas'}>
                    <SelectTrigger className="w-[170px] bg-background border-border h-9 text-xs">
                      <SelectValue placeholder="Sistema: Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="todas">⚙️ Todos los Sistemas</SelectItem>
                      {filteredSistemas.map(sys => (
                        <SelectItem key={sys.id} value={String(sys.id)}>⚙️ {sys.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setIsReposicionOpen(true)}
                      className="h-9 px-3 gap-1.5 bg-primary text-primary-foreground font-medium"
                      title="Abrir panel de control de reposición de materia prima (Bombos 1/2)"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Control de Reposición
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadDispositivos()} className="h-9 px-3">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={toggleFullscreen} className="h-9 px-3">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsConfigOpen(true)} className="h-9 px-3">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Current View Badge */}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs bg-muted/50 border border-border">
                  <Filter className="h-3 w-3 mr-1 text-primary" />
                  Ubicación: {currentViewLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className={isFullscreen ? "p-6 h-[85vh] bg-card" : "p-6"}>
              {/* Dynamic SCADA Flow Diagram */}
              <ScadaFlowDiagram 
                selectedView="planta-completa" 
                selectedPlanta={selectedPlanta} 
                selectedSeccion={selectedSeccion} 
                selectedSistema={selectedSistema} 
                secciones={secciones}
                sistemas={sistemas}
                plantas={plantas}
              />
              
              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span>Tanques</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-success" />
                  <span>Bombas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-warning" />
                  <span>Válvulas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-info" />
                  <span>Mezcladores</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                  <span>Sensores</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process Controls */}
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Estado del Proceso:
                  </span>
                  <Badge className={isRunning ? "bg-success/20 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                    {isRunning ? "En Ejecución" : "Detenido"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleControlClick('proceso', 'Detener')}
                    disabled={!isRunning}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleControlClick('proceso', 'Iniciar')}
                    disabled={isRunning}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side Panel */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="bg-card border-border shadow-md">
            <CardContent className="p-0">
              <Tabs defaultValue="receta" className="w-full">
                <TabsList className="w-full grid grid-cols-2 rounded-none border-b border-border bg-transparent h-auto p-0">
                  <TabsTrigger
                    value="receta"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
                  >
                    Receta Activa
                  </TabsTrigger>
                  <TabsTrigger
                    value="controles"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
                  >
                    Controles
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="receta" className="p-4 mt-0">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-foreground">
                        Producto Actual
                      </h4>
                      <p className="text-lg font-semibold text-primary mt-1">
                        Lote A-2024-0156
                      </p>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Receta</span>
                        <span className="text-foreground">{procesoDev && totalMin && totalMin > 0 ? "REC-001" : "Ninguna"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fase</span>
                        <span className="text-foreground">{faseProceso}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="text-foreground font-mono">{progresoProceso}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tiempo Est.</span>
                        <span className="text-foreground font-mono">{tiempoEst}</span>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Ingredientes
                      </h5>
                      <ul className="space-y-1 text-sm">
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">Componente A</span>
                          <span className="text-foreground">45kg</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">Componente B</span>
                          <span className="text-foreground">28kg</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">Aditivo X</span>
                          <span className="text-foreground">2.5kg</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="controles" className="p-4 mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-foreground">
                        Controles Manuales
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {relevantControls.length} disponibles
                      </Badge>
                    </div>
                    
                    {relevantControls.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No hay controles disponibles para esta ubicación/sección
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {relevantControls.map((control) => (
                          <div key={control.id} className="p-3 rounded-lg bg-background/50 border border-border shadow-xs">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-foreground">{control.label}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  control.statusColor === 'success' 
                                    ? 'bg-success/20 text-success border-success/30' 
                                    : 'bg-muted text-muted-foreground border-muted'
                                }`}
                              >
                                {control.status}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              {control.actions.map((action) => (
                                <Button 
                                  key={action} 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1 hover:bg-primary hover:text-primary-foreground"
                                  onClick={() => handleControlClick(control.id, action)}
                                >
                                  {action}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MQTT Configuration Modal */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Configuración del Broker MQTT
            </DialogTitle>
            <DialogDescription>
              Configura los parámetros del broker MQTT activo para la comunicación en tiempo real con los gateways.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nombre" className="text-right text-xs">
                Nombre
              </Label>
              <Input
                id="nombre"
                value={nombreConfig}
                onChange={(e) => setNombreConfig(e.target.value)}
                placeholder="Configuración Activa"
                className="col-span-3 bg-background border-border h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="broker" className="text-right text-xs">
                Broker URL
              </Label>
              <Input
                id="broker"
                value={brokerUrl}
                onChange={(e) => setBrokerUrl(e.target.value)}
                placeholder="mosquitto"
                className="col-span-3 bg-background border-border h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="port" className="text-right text-xs">
                Puerto
              </Label>
              <Input
                id="port"
                type="number"
                value={puerto}
                onChange={(e) => setPuerto(Number(e.target.value))}
                placeholder="1883"
                className="col-span-3 bg-background border-border h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user" className="text-right text-xs">
                Usuario
              </Label>
              <Input
                id="user"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Opcional"
                className="col-span-3 bg-background border-border h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pass" className="text-right text-xs">
                Contraseña
              </Label>
              <Input
                id="pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Opcional"
                className="col-span-3 bg-background border-border h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="base" className="text-right text-xs">
                Topic Base
              </Label>
              <Input
                id="base"
                value={topicBase}
                onChange={(e) => setTopicBase(e.target.value)}
                placeholder="scada/"
                className="col-span-3 bg-background border-border h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)} className="h-9">
              Cancelar
            </Button>
            <Button onClick={handleSaveMqttConfig} className="h-9">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VisualizacionSCADA;
