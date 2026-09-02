import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { RefreshCw, Play, Droplet, ShieldAlert } from "lucide-react";

interface ControlReposicionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispositivoId?: string | number;
}

export function ControlReposicionModal({ open, onOpenChange, dispositivoId }: ControlReposicionModalProps) {
  const [bombo, setBombo] = useState<string>("1");
  const [limitePorcentaje, setLimitePorcentaje] = useState<number>(80);
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [selectedDispositivo, setSelectedDispositivo] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      fetchDispositivos();
    }
  }, [open]);

  const fetchDispositivos = async () => {
    try {
      const res = await apiFetch("/api/v1/dispositivos/");
      if (res.ok) {
        const data = await res.json();
        const items = data.results || data;
        if (Array.isArray(items) && items.length > 0) {
          setDispositivos(items);
          if (dispositivoId) {
            setSelectedDispositivo(String(dispositivoId));
          } else {
            setSelectedDispositivo(String(items[0].id));
          }
        }
      }
    } catch (e) {
      console.warn("No se pudieron cargar los dispositivos:", e);
    }
  };

  const handleIniciarReposicion = async () => {
    setLoading(true);
    try {
      const targetId = selectedDispositivo || dispositivoId;
      if (!targetId) {
        toast({ title: "Error", description: "Selecciona un dispositivo o sistema para enviar el comando", variant: "destructive" });
        setLoading(false);
        return;
      }

      const res = await apiFetch(`/api/v1/dispositivos/${targetId}/reposicion/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bombo: parseInt(bombo),
          limite_porcentaje: limitePorcentaje,
          freno: false,
        }),
      });

      if (res.ok) {
        toast({
          title: "✅ Orden de Reposición Enviada",
          description: `Se inició la reposición hacia el Bombo ${bombo} hasta el ${limitePorcentaje}% (Comando R enviado)`,
        });
        onOpenChange(false);
      } else {
        const errorData = await res.json();
        toast({
          title: "Error al enviar orden",
          description: errorData.error || "No se pudo comunicar la reposición con el servidor",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({ title: "Error de comunicación", description: "Ocurrió un error al contactar al servidor SCADA", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFrenoEmergencia = async () => {
    setLoading(true);
    try {
      const targetId = selectedDispositivo || dispositivoId;
      if (!targetId) {
        toast({ title: "Error", description: "Selecciona un dispositivo para enviar la parada", variant: "destructive" });
        setLoading(false);
        return;
      }

      const res = await apiFetch(`/api/v1/dispositivos/${targetId}/reposicion/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freno: true,
        }),
      });

      if (res.ok) {
        toast({
          title: "🚨 FRENO DE EMERGENCIA ACTIVADO",
          description: "Se envió la parada inmediata de la Bomba de Reposición y Electroválvulas (Comando F enviado)",
          variant: "destructive",
        });
        onOpenChange(false);
      } else {
        toast({ title: "Error al detener reposición", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error de comunicación", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <RefreshCw className="h-5 w-5 text-primary animate-spin-slow" />
            Control de Reposición de Materia Prima
          </DialogTitle>
          <DialogDescription>
            Configura el llenado de materia prima líquida hacia los bombos de reserva mediante la bomba de camión/reposición y electroválvulas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dispositivo Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Dispositivo SCADA Target</Label>
            <Select value={selectedDispositivo} onValueChange={setSelectedDispositivo}>
              <SelectTrigger className="w-full bg-background border-input">
                <SelectValue placeholder="Seleccionar dispositivo..." />
              </SelectTrigger>
              <SelectContent>
                {dispositivos.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.nombre} ({d.numero_serie || `ID ${d.id}`})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Bombo Destino */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tanque / Bombo Destino</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={bombo === "1" ? "default" : "outline"}
                className={`h-12 flex items-center gap-2 justify-center font-medium ${
                  bombo === "1" ? "bg-primary text-primary-foreground" : ""
                }`}
                onClick={() => setBombo("1")}
              >
                <Droplet className="h-4 w-4" />
                Bombo 1 (Tanque A)
              </Button>
              <Button
                type="button"
                variant={bombo === "2" ? "default" : "outline"}
                className={`h-12 flex items-center gap-2 justify-center font-medium ${
                  bombo === "2" ? "bg-primary text-primary-foreground" : ""
                }`}
                onClick={() => setBombo("2")}
              >
                <Droplet className="h-4 w-4" />
                Bombo 2 (Tanque B)
              </Button>
            </div>
          </div>

          {/* Slider de Porcentaje Límite */}
          <div className="space-y-3 bg-muted/40 p-4 rounded-lg border border-border">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-semibold">Nivel Límite de Reposición</Label>
              <Badge variant="outline" className="text-base font-mono bg-background text-primary border-primary/40 px-3 py-1">
                {limitePorcentaje}%
              </Badge>
            </div>
            <Slider
              value={[limitePorcentaje]}
              onValueChange={(val) => setLimitePorcentaje(val[0])}
              min={10}
              max={100}
              step={5}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10% (Mínimo)</span>
              <span>50% (Medio)</span>
              <span>100% (Capacidad Máxima)</span>
            </div>
          </div>

          {/* Información del Comando Serial */}
          <div className="p-3 bg-muted/20 rounded border border-border/50 text-xs font-mono space-y-1">
            <div className="text-muted-foreground flex justify-between">
              <span>Trama Serial Generada:</span>
              <span className="text-emerald-400 font-bold">
                R{parseInt(bombo) === 1 ? 1000 + limitePorcentaje : 2000 + limitePorcentaje}
              </span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>Electroválvula Objetivo:</span>
              <span className="text-foreground">Electroválvula Bombo {bombo} (Pin {bombo === "1" ? "10" : "8"})</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>Bomba de Reposición:</span>
              <span className="text-foreground">Bomba Camión (Pin 9 - ON)</span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 gap-2 shadow-lg shadow-emerald-950/20"
              disabled={loading}
              onClick={handleIniciarReposicion}
            >
              <Play className="h-4 w-4 fill-current" />
              🚀 Iniciar Reposición de Materia Prima
            </Button>

            <Button
              variant="destructive"
              className="w-full font-semibold h-11 gap-2 border border-destructive/50"
              disabled={loading}
              onClick={handleFrenoEmergencia}
            >
              <ShieldAlert className="h-4 w-4" />
              🚨 Freno de Emergencia Reposición (Comando F)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
