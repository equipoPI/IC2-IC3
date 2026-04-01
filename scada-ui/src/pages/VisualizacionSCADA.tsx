import { Activity, Settings, Play, Pause, RotateCcw, Maximize2, Filter, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import ScadaFlowDiagram, { systemDefinitions, machineDefinitions } from "@/components/scada/ScadaFlowDiagram";

const VisualizacionSCADA = () => {
  const [isRunning, setIsRunning] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedView, setSelectedView] = useState('planta-completa');

  // Get relevant controls based on selected view
  const relevantControls = useMemo(() => {
    const allControls = [
      { id: 'valve-1', label: 'Válvula V1', status: 'Abierta', statusColor: 'outline', actions: ['Cerrar', 'Auto'] },
      { id: 'valve-2', label: 'Válvula V2', status: 'Abierta', statusColor: 'outline', actions: ['Cerrar', 'Auto'] },
      { id: 'pump-1', label: 'Bomba P1', status: 'Activa', statusColor: 'success', actions: ['Detener', 'Auto'] },
      { id: 'mixer-1', label: 'Mezclador M1', status: 'Activo', statusColor: 'success', actions: ['Detener', 'Auto'] },
    ];

    if (selectedView === 'planta-completa') {
      return allControls;
    }

    let visibleNodeIds: string[] = [];
    
    if (selectedView in systemDefinitions) {
      visibleNodeIds = systemDefinitions[selectedView as keyof typeof systemDefinitions].nodeIds;
    } else if (selectedView in machineDefinitions) {
      const machine = machineDefinitions[selectedView as keyof typeof machineDefinitions];
      visibleNodeIds = [selectedView, ...machine.connectedNodes];
    }

    return allControls.filter(control => visibleNodeIds.includes(control.id));
  }, [selectedView]);

  // Get current view label
  const currentViewLabel = useMemo(() => {
    if (selectedView in systemDefinitions) {
      return systemDefinitions[selectedView as keyof typeof systemDefinitions].label;
    }
    if (selectedView in machineDefinitions) {
      return machineDefinitions[selectedView as keyof typeof machineDefinitions].label;
    }
    return 'Vista Desconocida';
  }, [selectedView]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Visualización SCADA
          </h1>
          <p className="text-muted-foreground mt-1">
            Diagrama de proceso en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-success/20 text-success border-success/30">
            <div className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
            Conectado
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Diagram Area */}
        <div className="xl:col-span-3 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Diagrama de Proceso en Tiempo Real
                </CardTitle>
                
                {/* Hierarchical View Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 bg-background/50 rounded-lg p-1 border border-border">
                    <Layers className="h-4 w-4 text-muted-foreground ml-2" />
                    <Select value={selectedView} onValueChange={setSelectedView}>
                      <SelectTrigger className="w-[200px] border-0 bg-transparent focus:ring-0">
                        <SelectValue placeholder="Seleccionar vista" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {/* Plant Level */}
                        <SelectItem value="planta-completa" className="font-semibold">
                          🏭 Planta Completa
                        </SelectItem>
                        
                        {/* Systems */}
                        <div className="px-2 py-1 text-xs text-muted-foreground font-medium border-t border-border mt-1 pt-2">
                          SISTEMAS
                        </div>
                        <SelectItem value="sistema-preparacion">
                          ⚙️ Sistema de Preparación
                        </SelectItem>
                        <SelectItem value="sistema-mezclado">
                          ⚙️ Sistema de Mezclado
                        </SelectItem>
                        <SelectItem value="sistema-salida">
                          ⚙️ Sistema de Salida
                        </SelectItem>
                        
                        {/* Individual Machines */}
                        <div className="px-2 py-1 text-xs text-muted-foreground font-medium border-t border-border mt-1 pt-2">
                          MÁQUINAS
                        </div>
                        <SelectItem value="tank-1">🛢️ Tanque A</SelectItem>
                        <SelectItem value="tank-2">🛢️ Tanque B</SelectItem>
                        <SelectItem value="tank-3">🛢️ Tanque Salida</SelectItem>
                        <SelectItem value="valve-1">🔧 Válvula V1</SelectItem>
                        <SelectItem value="valve-2">🔧 Válvula V2</SelectItem>
                        <SelectItem value="pump-1">⚡ Bomba P1</SelectItem>
                        <SelectItem value="mixer-1">🔄 Mezclador M1</SelectItem>
                        <SelectItem value="sensor-1">📡 Sensor Temp</SelectItem>
                        <SelectItem value="sensor-2">📡 Sensor Presión</SelectItem>
                        <SelectItem value="sensor-3">📡 Sensor Flujo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Actualizar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Current View Badge */}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  Vista: {currentViewLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Dynamic SCADA Flow Diagram */}
              <ScadaFlowDiagram selectedView={selectedView} />
              
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
          <Card className="bg-card border-border">
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
                    onClick={() => setIsRunning(false)}
                    disabled={!isRunning}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setIsRunning(true)}
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
          <Card className="bg-card border-border">
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
                        <span className="text-foreground">REC-001</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fase</span>
                        <span className="text-foreground">Mezclado</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="text-foreground font-mono">67%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tiempo Est.</span>
                        <span className="text-foreground font-mono">1h 23m</span>
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
                        No hay controles disponibles para esta vista
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {relevantControls.map((control) => (
                          <div key={control.id} className="p-3 rounded-lg bg-background/50 border border-border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-foreground">{control.label}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  control.statusColor === 'success' 
                                    ? 'bg-success/20 text-success' 
                                    : control.statusColor === 'warning'
                                    ? 'bg-warning/20 text-warning'
                                    : ''
                                }`}
                              >
                                {control.status}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              {control.actions.map((action) => (
                                <Button key={action} variant="outline" size="sm" className="flex-1">
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
    </div>
  );
};

export default VisualizacionSCADA;
