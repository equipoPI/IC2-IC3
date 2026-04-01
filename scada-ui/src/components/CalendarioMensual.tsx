import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Wrench, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface CalendarEvent {
  id: string;
  nombre: string;
  fechaInicio: string;
  horaInicio: string;
  fechaFin: string;
  horaFin: string;
  planta: string;
  sistema?: string;
  maquina?: string;
  tipo: "produccion" | "mantenimiento";
  estado?: "pendiente" | "en_proceso" | "completada";
}

interface CalendarioMensualProps {
  eventos: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const CalendarioMensual = ({ eventos, onEventClick }: CalendarioMensualProps) => {
  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);

  const diasDelMes = useMemo(() => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    
    // Get the day of the week (0 = Sunday, adjust to Monday = 0)
    let diaSemanaInicio = primerDia.getDay() - 1;
    if (diaSemanaInicio < 0) diaSemanaInicio = 6;
    
    const dias: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Previous month days
    const diasMesAnterior = new Date(year, month, 0).getDate();
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      dias.push({
        date: new Date(year, month - 1, diasMesAnterior - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month days
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Next month days to complete the grid
    const diasRestantes = 42 - dias.length;
    for (let i = 1; i <= diasRestantes; i++) {
      dias.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return dias;
  }, [mesActual]);

  const getEventosPorDia = (fecha: Date) => {
    const fechaStr = fecha.toISOString().split("T")[0];
    return eventos.filter((evento) => {
      const inicio = evento.fechaInicio;
      const fin = evento.fechaFin || evento.fechaInicio;
      return fechaStr >= inicio && fechaStr <= fin;
    });
  };

  const eventosDelDiaSeleccionado = useMemo(() => {
    if (!diaSeleccionado) return [];
    return getEventosPorDia(diaSeleccionado);
  }, [diaSeleccionado, eventos]);

  const mesAnterior = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1));
  };

  const mesSiguiente = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1));
  };

  const irAHoy = () => {
    setMesActual(new Date());
    setDiaSeleccionado(new Date());
  };

  const esHoy = (fecha: Date) => {
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  };

  const esDiaSeleccionado = (fecha: Date) => {
    return diaSeleccionado?.toDateString() === fecha.toDateString();
  };

  const getEventoColor = (tipo: CalendarEvent["tipo"], estado?: CalendarEvent["estado"]) => {
    if (tipo === "mantenimiento") {
      return "bg-orange-500";
    }
    switch (estado) {
      case "completada":
        return "bg-success";
      case "en_proceso":
        return "bg-blue-500";
      default:
        return "bg-primary";
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Vista Calendario
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={irAHoy}>
              Hoy
            </Button>
            <Button variant="ghost" size="icon" onClick={mesAnterior}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
            </span>
            <Button variant="ghost" size="icon" onClick={mesSiguiente}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          {/* Calendar Grid */}
          <div className="flex-1">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DIAS_SEMANA.map((dia) => (
                <div
                  key={dia}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {dia}
                </div>
              ))}
            </div>
            
            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {diasDelMes.map(({ date, isCurrentMonth }, index) => {
                const eventosDelDia = getEventosPorDia(date);
                const tieneProduccion = eventosDelDia.some((e) => e.tipo === "produccion");
                const tieneMantenimiento = eventosDelDia.some((e) => e.tipo === "mantenimiento");
                
                return (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setDiaSeleccionado(date)}
                          className={`
                            relative h-20 p-1 rounded-md border transition-all text-left
                            ${isCurrentMonth ? "bg-background" : "bg-muted/30"}
                            ${esDiaSeleccionado(date) ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground/50"}
                            ${esHoy(date) ? "ring-2 ring-primary/50" : ""}
                          `}
                        >
                          <span
                            className={`
                              text-xs font-medium
                              ${isCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                              ${esHoy(date) ? "bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full" : ""}
                            `}
                          >
                            {date.getDate()}
                          </span>
                          
                          {/* Event indicators */}
                          {eventosDelDia.length > 0 && (
                            <div className="absolute bottom-1 left-1 right-1 flex flex-col gap-0.5">
                              {eventosDelDia.slice(0, 2).map((evento) => (
                                <div
                                  key={evento.id}
                                  className={`
                                    text-[10px] px-1 py-0.5 rounded truncate text-white
                                    ${getEventoColor(evento.tipo, evento.estado)}
                                  `}
                                >
                                  {evento.nombre}
                                </div>
                              ))}
                              {eventosDelDia.length > 2 && (
                                <span className="text-[10px] text-muted-foreground text-center">
                                  +{eventosDelDia.length - 2} más
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Type indicators */}
                          <div className="absolute top-1 right-1 flex gap-0.5">
                            {tieneProduccion && (
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                            )}
                            {tieneMantenimiento && (
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                            )}
                          </div>
                        </button>
                      </TooltipTrigger>
                      {eventosDelDia.length > 0 && (
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="text-sm font-medium mb-1">
                            {date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                          </div>
                          <div className="space-y-1">
                            {eventosDelDia.map((e) => (
                              <div key={e.id} className="text-xs text-muted-foreground">
                                {e.horaInicio} - {e.nombre}
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Producción</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-orange-500" />
                <span>Mantenimiento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-success" />
                <span>Completada</span>
              </div>
            </div>
          </div>
          
          {/* Agenda Sidebar */}
          <div className="w-80 border-l border-border pl-6">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-foreground">
                {diaSeleccionado 
                  ? diaSeleccionado.toLocaleDateString("es-ES", { 
                      weekday: "long", 
                      day: "numeric", 
                      month: "long",
                      year: "numeric"
                    })
                  : "Selecciona un día"
                }
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {eventosDelDiaSeleccionado.length} evento{eventosDelDiaSeleccionado.length !== 1 ? "s" : ""}
              </p>
            </div>
            
            <ScrollArea className="h-[400px] pr-4">
              {diaSeleccionado ? (
                eventosDelDiaSeleccionado.length > 0 ? (
                  <div className="space-y-3">
                    {eventosDelDiaSeleccionado.map((evento) => (
                      <div
                        key={evento.id}
                        onClick={() => onEventClick?.(evento)}
                        className={`
                          p-3 rounded-lg border border-border bg-background 
                          hover:bg-muted/50 transition-colors cursor-pointer
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`
                            w-1 h-full min-h-[60px] rounded-full
                            ${getEventoColor(evento.tipo, evento.estado)}
                          `} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {evento.tipo === "produccion" ? (
                                <Package className="h-4 w-4 text-blue-400" />
                              ) : (
                                <Wrench className="h-4 w-4 text-orange-400" />
                              )}
                              <span className="text-sm font-medium text-foreground truncate">
                                {evento.nombre}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {evento.horaInicio} - {evento.horaFin || "N/A"}
                              </div>
                              <div>{evento.planta}</div>
                              {evento.sistema && (
                                <div className="text-muted-foreground/70">{evento.sistema}</div>
                              )}
                              {evento.maquina && (
                                <div className="text-muted-foreground/70">{evento.maquina}</div>
                              )}
                            </div>
                            <div className="mt-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  evento.tipo === "mantenimiento"
                                    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                    : evento.estado === "completada"
                                    ? "bg-success/20 text-success border-success/30"
                                    : evento.estado === "en_proceso"
                                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                    : "bg-warning/20 text-warning border-warning/30"
                                }`}
                              >
                                {evento.tipo === "mantenimiento" 
                                  ? "Mantenimiento" 
                                  : evento.estado === "completada"
                                  ? "Completada"
                                  : evento.estado === "en_proceso"
                                  ? "En Proceso"
                                  : "Pendiente"
                                }
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay eventos programados</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Selecciona un día para ver los eventos</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarioMensual;
