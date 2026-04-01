import { useMemo, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Wrench, GripVertical } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

export interface GanttItem {
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

type PeriodView = "diario" | "semanal" | "mensual";

interface GanttChartProps {
  items: GanttItem[];
  onAddMantenimiento?: () => void;
  onItemUpdate?: (item: GanttItem) => void;
}

const tipoColors: Record<string, { bg: string; border: string; text: string }> = {
  produccion: {
    bg: "bg-primary/30",
    border: "border-primary/50",
    text: "text-primary",
  },
  mantenimiento: {
    bg: "bg-orange-500/30",
    border: "border-orange-500/50",
    text: "text-orange-400",
  },
};

const estadoColors: Record<string, { bg: string; border: string }> = {
  pendiente: { bg: "bg-warning/30", border: "border-warning/50" },
  en_proceso: { bg: "bg-blue-500/30", border: "border-blue-500/50" },
  completada: { bg: "bg-success/30", border: "border-success/50" },
};

const GanttChart = ({ items, onAddMantenimiento, onItemUpdate }: GanttChartProps) => {
  const [periodView, setPeriodView] = useState<PeriodView>("diario");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggingItem, setDraggingItem] = useState<GanttItem | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, startX: 0 });
  const chartRef = useRef<HTMLDivElement>(null);

  // Get time slots based on period view
  const timeSlots = useMemo(() => {
    if (periodView === "diario") {
      // 24 hours
      return Array.from({ length: 24 }, (_, i) => ({
        label: `${i.toString().padStart(2, "0")}:00`,
        value: i,
      }));
    } else if (periodView === "semanal") {
      // 7 days
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return {
          label: date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
          value: i,
          date: date.toISOString().split("T")[0],
        };
      });
    } else {
      // 30/31 days of month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      return Array.from({ length: daysInMonth }, (_, i) => ({
        label: (i + 1).toString(),
        value: i + 1,
        date: `${year}-${(month + 1).toString().padStart(2, "0")}-${(i + 1).toString().padStart(2, "0")}`,
      }));
    }
  }, [periodView, currentDate]);

  // Calculate position and width for each item
  const getItemPosition = (item: GanttItem) => {
    const startDate = new Date(`${item.fechaInicio}T${item.horaInicio}`);
    const endDate = new Date(`${item.fechaFin}T${item.horaFin}`);

    if (periodView === "diario") {
      // Check if item is on the current day
      const currentDay = currentDate.toISOString().split("T")[0];
      if (item.fechaInicio !== currentDay && item.fechaFin !== currentDay) {
        return null;
      }

      const startHour = parseInt(item.horaInicio.split(":")[0]) + parseInt(item.horaInicio.split(":")[1]) / 60;
      const endHour = parseInt(item.horaFin.split(":")[0]) + parseInt(item.horaFin.split(":")[1]) / 60;
      
      const left = (startHour / 24) * 100;
      const width = ((endHour - startHour) / 24) * 100;
      
      return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
    } else if (periodView === "semanal") {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      if (endDate < startOfWeek || startDate > endOfWeek) {
        return null;
      }

      const effectiveStart = startDate < startOfWeek ? startOfWeek : startDate;
      const effectiveEnd = endDate > endOfWeek ? endOfWeek : endDate;

      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const left = ((effectiveStart.getTime() - startOfWeek.getTime()) / weekMs) * 100;
      const width = ((effectiveEnd.getTime() - effectiveStart.getTime()) / weekMs) * 100;

      return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
    } else {
      // Monthly
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const daysInMonth = endOfMonth.getDate();

      if (endDate < startOfMonth || startDate > endOfMonth) {
        return null;
      }

      const effectiveStart = startDate < startOfMonth ? startOfMonth : startDate;
      const effectiveEnd = endDate > endOfMonth ? endOfMonth : endDate;

      const startDay = effectiveStart.getDate() - 1 + effectiveStart.getHours() / 24;
      const endDay = effectiveEnd.getDate() - 1 + effectiveEnd.getHours() / 24;

      const left = (startDay / daysInMonth) * 100;
      const width = ((endDay - startDay) / daysInMonth) * 100;

      return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
    }
  };

  // Group items by planta/sistema/maquina
  const groupedItems = useMemo(() => {
    const groups: Record<string, GanttItem[]> = {};
    
    items.forEach((item) => {
      const key = item.maquina || item.sistema || item.planta;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    
    return groups;
  }, [items]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent, item: GanttItem, barElement: HTMLDivElement) => {
    e.preventDefault();
    setDraggingItem(item);
    const rect = barElement.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, startX: rect.left });
  }, []);

  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!draggingItem || !chartRef.current) return;
    
    const chartRect = chartRef.current.getBoundingClientRect();
    const resourceWidth = 192; // w-48 = 12rem = 192px
    const chartWidth = chartRect.width - resourceWidth;
    const newX = e.clientX - chartRect.left - resourceWidth - dragOffset.x;
    const percentage = Math.max(0, Math.min(100, (newX / chartWidth) * 100));
    
    // Update visual position of dragging element
    const draggingElements = document.querySelectorAll(`[data-item-id="${draggingItem.id}"]`);
    draggingElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const width = parseFloat(htmlEl.style.width);
      htmlEl.style.left = `${Math.min(percentage, 100 - width)}%`;
    });
  }, [draggingItem, dragOffset]);

  const handleDragEnd = useCallback((e: React.MouseEvent) => {
    if (!draggingItem || !chartRef.current || !onItemUpdate) {
      setDraggingItem(null);
      return;
    }

    const chartRect = chartRef.current.getBoundingClientRect();
    const resourceWidth = 192;
    const chartWidth = chartRect.width - resourceWidth;
    const newX = e.clientX - chartRect.left - resourceWidth - dragOffset.x;
    const percentage = Math.max(0, Math.min(100, (newX / chartWidth) * 100));

    // Calculate new dates based on percentage and period view
    let newFechaInicio: string;
    let newHoraInicio: string;
    let newFechaFin: string;
    let newHoraFin: string;

    // Calculate duration of original item
    const originalStart = new Date(`${draggingItem.fechaInicio}T${draggingItem.horaInicio}`);
    const originalEnd = new Date(`${draggingItem.fechaFin}T${draggingItem.horaFin}`);
    const durationMs = originalEnd.getTime() - originalStart.getTime();

    if (periodView === "diario") {
      // Percentage maps to hours (0-24)
      const newStartHour = (percentage / 100) * 24;
      const hours = Math.floor(newStartHour);
      const minutes = Math.round((newStartHour - hours) * 60);
      
      newFechaInicio = currentDate.toISOString().split("T")[0];
      newHoraInicio = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      
      const endTime = new Date(`${newFechaInicio}T${newHoraInicio}`);
      endTime.setTime(endTime.getTime() + durationMs);
      newFechaFin = endTime.toISOString().split("T")[0];
      newHoraFin = `${endTime.getHours().toString().padStart(2, "0")}:${endTime.getMinutes().toString().padStart(2, "0")}`;
    } else if (periodView === "semanal") {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const newStartMs = startOfWeek.getTime() + (percentage / 100) * weekMs;
      const newStart = new Date(newStartMs);
      
      newFechaInicio = newStart.toISOString().split("T")[0];
      newHoraInicio = `${newStart.getHours().toString().padStart(2, "0")}:${newStart.getMinutes().toString().padStart(2, "0")}`;
      
      const endTime = new Date(newStartMs + durationMs);
      newFechaFin = endTime.toISOString().split("T")[0];
      newHoraFin = `${endTime.getHours().toString().padStart(2, "0")}:${endTime.getMinutes().toString().padStart(2, "0")}`;
    } else {
      // Monthly
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const newDay = 1 + (percentage / 100) * (daysInMonth - 1);
      const dayInt = Math.floor(newDay);
      const dayFraction = newDay - dayInt;
      const hours = Math.floor(dayFraction * 24);
      const minutes = Math.round((dayFraction * 24 - hours) * 60);
      
      newFechaInicio = `${year}-${(month + 1).toString().padStart(2, "0")}-${dayInt.toString().padStart(2, "0")}`;
      newHoraInicio = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      
      const endTime = new Date(`${newFechaInicio}T${newHoraInicio}`);
      endTime.setTime(endTime.getTime() + durationMs);
      newFechaFin = endTime.toISOString().split("T")[0];
      newHoraFin = `${endTime.getHours().toString().padStart(2, "0")}:${endTime.getMinutes().toString().padStart(2, "0")}`;
    }

    const updatedItem: GanttItem = {
      ...draggingItem,
      fechaInicio: newFechaInicio,
      horaInicio: newHoraInicio,
      fechaFin: newFechaFin,
      horaFin: newHoraFin,
    };

    onItemUpdate(updatedItem);
    toast({
      title: "Evento reprogramado",
      description: `${updatedItem.nombre} movido a ${newFechaInicio} ${newHoraInicio}`,
    });

    setDraggingItem(null);
  }, [draggingItem, dragOffset, periodView, currentDate, onItemUpdate]);

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (periodView === "diario") {
      newDate.setDate(newDate.getDate() + direction);
    } else if (periodView === "semanal") {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const getPeriodLabel = () => {
    if (periodView === "diario") {
      return currentDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } else if (periodView === "semanal") {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} - ${endOfWeek.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;
    } else {
      return currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Vista Gantt de Producción</CardTitle>
        <div className="flex items-center gap-4">
          {onAddMantenimiento && (
            <Button variant="outline" size="sm" onClick={onAddMantenimiento}>
              <Wrench className="h-4 w-4 mr-2" />
              Añadir Mantenimiento
            </Button>
          )}
          <Select value={periodView} onValueChange={(v) => setPeriodView(v as PeriodView)}>
            <SelectTrigger className="w-[140px] bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diario">Diario</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Period navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-foreground font-medium capitalize">{getPeriodLabel()}</span>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${tipoColors.produccion.bg} ${tipoColors.produccion.border} border`} />
            <span className="text-sm text-muted-foreground">Producción</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${tipoColors.mantenimiento.bg} ${tipoColors.mantenimiento.border} border`} />
            <span className="text-sm text-muted-foreground">Mantenimiento</span>
          </div>
          <div className="border-l border-border pl-4 flex gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${estadoColors.pendiente.bg}`} />
              <span className="text-xs text-muted-foreground">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${estadoColors.en_proceso.bg}`} />
              <span className="text-xs text-muted-foreground">En Proceso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${estadoColors.completada.bg}`} />
              <span className="text-xs text-muted-foreground">Completada</span>
            </div>
          </div>
        </div>

        {/* Gantt chart */}
        <div 
          ref={chartRef}
          className={`border border-border rounded-lg overflow-hidden ${draggingItem ? 'select-none' : ''}`}
          onMouseMove={draggingItem ? handleDragMove : undefined}
          onMouseUp={draggingItem ? handleDragEnd : undefined}
          onMouseLeave={draggingItem ? handleDragEnd : undefined}
        >
          {/* Time header */}
          <div className="flex bg-muted/30">
            <div className="w-48 flex-shrink-0 px-3 py-2 border-r border-border">
              <span className="text-sm font-medium text-muted-foreground">Recurso</span>
            </div>
            <div className="flex-1 flex">
              {timeSlots.map((slot, i) => (
                <div
                  key={i}
                  className="flex-1 text-center py-2 text-xs text-muted-foreground border-r border-border last:border-r-0"
                  style={{ minWidth: periodView === "mensual" ? "24px" : "auto" }}
                >
                  {slot.label}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <TooltipProvider>
            {Object.entries(groupedItems).length === 0 ? (
              <div className="px-3 py-8 text-center text-muted-foreground">
                No hay eventos programados para este período
              </div>
            ) : (
              Object.entries(groupedItems).map(([resource, resourceItems]) => (
                <div key={resource} className="flex border-t border-border">
                  <div className="w-48 flex-shrink-0 px-3 py-3 border-r border-border bg-muted/10">
                    <span className="text-sm text-foreground truncate block">{resource}</span>
                  </div>
                  <div className="flex-1 relative h-12">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {timeSlots.map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 border-r border-border/30 last:border-r-0"
                          style={{ minWidth: periodView === "mensual" ? "24px" : "auto" }}
                        />
                      ))}
                    </div>

                    {/* Items */}
                    {resourceItems.map((item) => {
                      const position = getItemPosition(item);
                      if (!position) return null;

                      const colorConfig = tipoColors[item.tipo];
                      const estadoConfig = item.estado ? estadoColors[item.estado] : null;

                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            <div
                              data-item-id={item.id}
                              className={`
                                absolute top-1 bottom-1 rounded border flex items-center overflow-hidden
                                ${colorConfig.bg} ${colorConfig.border}
                                ${onItemUpdate ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                                ${draggingItem?.id === item.id ? 'opacity-70 ring-2 ring-primary z-10' : 'hover:opacity-80'}
                                transition-opacity
                              `}
                              style={{ left: position.left, width: position.width }}
                              onMouseDown={(e) => {
                                if (onItemUpdate) {
                                  handleDragStart(e, item, e.currentTarget as HTMLDivElement);
                                }
                              }}
                            >
                              {onItemUpdate && (
                                <div className="flex-shrink-0 px-0.5 opacity-50 hover:opacity-100">
                                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                              {estadoConfig && (
                                <div className={`absolute ${onItemUpdate ? 'left-4' : 'left-1'} w-2 h-2 rounded-full ${estadoConfig.bg}`} />
                              )}
                              <span className={`text-xs ${colorConfig.text} truncate px-2 font-medium`}>
                                {item.nombre}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium">{item.nombre}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.fechaInicio} {item.horaInicio} - {item.fechaFin} {item.horaFin}
                              </p>
                              <div className="flex gap-2">
                                <Badge variant="outline" className={`${colorConfig.bg} ${colorConfig.text} text-xs`}>
                                  {item.tipo === "produccion" ? "Producción" : "Mantenimiento"}
                                </Badge>
                                {item.estado && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.estado.replace("_", " ")}
                                  </Badge>
                                )}
                              </div>
                              {onItemUpdate && (
                                <p className="text-xs text-muted-foreground italic pt-1">
                                  Arrastra para reprogramar
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};

export default GanttChart;
