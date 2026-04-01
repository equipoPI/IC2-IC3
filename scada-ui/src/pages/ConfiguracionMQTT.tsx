import { useState } from "react";
import { Wifi, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface ConexionMQTT {
  id: string;
  nombre: string;
  ip: string;
  puerto: number;
  estado: "conectado" | "desconectado" | "error";
}

interface TopicMQTT {
  id: string;
  conexionId: string;
  topic: string;
  tipo: "suscripcion" | "publicacion";
  tipoDato: string;
  descripcion: string;
}

const conexionesIniciales: ConexionMQTT[] = [
  { id: "CON-001", nombre: "Broker Principal", ip: "192.168.1.100", puerto: 1883, estado: "conectado" },
  { id: "CON-002", nombre: "Broker Backup", ip: "192.168.1.101", puerto: 1883, estado: "desconectado" },
  { id: "CON-003", nombre: "Broker Producción", ip: "10.0.0.50", puerto: 8883, estado: "conectado" },
];

const topicsIniciales: TopicMQTT[] = [
  { id: "TOP-001", conexionId: "CON-001", topic: "planta/norte/temperatura", tipo: "suscripcion", tipoDato: "float", descripcion: "Temperatura Planta Norte" },
  { id: "TOP-002", conexionId: "CON-001", topic: "planta/norte/presion", tipo: "suscripcion", tipoDato: "float", descripcion: "Presión Planta Norte" },
  { id: "TOP-003", conexionId: "CON-001", topic: "planta/norte/control/valvula", tipo: "publicacion", tipoDato: "boolean", descripcion: "Control Válvula Norte" },
  { id: "TOP-004", conexionId: "CON-003", topic: "produccion/linea1/estado", tipo: "suscripcion", tipoDato: "integer", descripcion: "Estado Línea 1" },
  { id: "TOP-005", conexionId: "CON-003", topic: "produccion/linea1/setpoint", tipo: "publicacion", tipoDato: "float", descripcion: "Setpoint Línea 1" },
];

const tiposDato = ["string", "integer", "float", "boolean", "json"];

const ConfiguracionMQTT = () => {
  const [conexiones, setConexiones] = useState<ConexionMQTT[]>(conexionesIniciales);
  const [topics, setTopics] = useState<TopicMQTT[]>(topicsIniciales);
  const [dialogConexion, setDialogConexion] = useState(false);
  const [dialogTopic, setDialogTopic] = useState(false);
  const [editingConexion, setEditingConexion] = useState<ConexionMQTT | null>(null);
  const [editingTopic, setEditingTopic] = useState<TopicMQTT | null>(null);

  const [formConexion, setFormConexion] = useState({ nombre: "", ip: "", puerto: "1883" });
  const [formTopic, setFormTopic] = useState({ conexionId: "", topic: "", tipo: "suscripcion" as "suscripcion" | "publicacion", tipoDato: "string", descripcion: "" });

  const handleSaveConexion = () => {
    if (!formConexion.nombre || !formConexion.ip || !formConexion.puerto) {
      toast({ title: "Error", description: "Complete todos los campos", variant: "destructive" });
      return;
    }

    if (editingConexion) {
      setConexiones(conexiones.map(c => 
        c.id === editingConexion.id 
          ? { ...c, nombre: formConexion.nombre, ip: formConexion.ip, puerto: parseInt(formConexion.puerto) }
          : c
      ));
      toast({ title: "Conexión actualizada", description: "La conexión se ha actualizado correctamente" });
    } else {
      const newConexion: ConexionMQTT = {
        id: `CON-${String(conexiones.length + 1).padStart(3, "0")}`,
        nombre: formConexion.nombre,
        ip: formConexion.ip,
        puerto: parseInt(formConexion.puerto),
        estado: "desconectado",
      };
      setConexiones([...conexiones, newConexion]);
      toast({ title: "Conexión creada", description: "La conexión se ha creado correctamente" });
    }
    setDialogConexion(false);
    setEditingConexion(null);
    setFormConexion({ nombre: "", ip: "", puerto: "1883" });
  };

  const handleSaveTopic = () => {
    if (!formTopic.conexionId || !formTopic.topic || !formTopic.tipoDato) {
      toast({ title: "Error", description: "Complete todos los campos", variant: "destructive" });
      return;
    }

    if (editingTopic) {
      setTopics(topics.map(t => 
        t.id === editingTopic.id 
          ? { ...t, ...formTopic }
          : t
      ));
      toast({ title: "Topic actualizado", description: "El topic se ha actualizado correctamente" });
    } else {
      const newTopic: TopicMQTT = {
        id: `TOP-${String(topics.length + 1).padStart(3, "0")}`,
        ...formTopic,
      };
      setTopics([...topics, newTopic]);
      toast({ title: "Topic creado", description: "El topic se ha creado correctamente" });
    }
    setDialogTopic(false);
    setEditingTopic(null);
    setFormTopic({ conexionId: "", topic: "", tipo: "suscripcion", tipoDato: "string", descripcion: "" });
  };

  const handleEditConexion = (conexion: ConexionMQTT) => {
    setEditingConexion(conexion);
    setFormConexion({ nombre: conexion.nombre, ip: conexion.ip, puerto: String(conexion.puerto) });
    setDialogConexion(true);
  };

  const handleEditTopic = (topic: TopicMQTT) => {
    setEditingTopic(topic);
    setFormTopic({ conexionId: topic.conexionId, topic: topic.topic, tipo: topic.tipo, tipoDato: topic.tipoDato, descripcion: topic.descripcion });
    setDialogTopic(true);
  };

  const handleDeleteConexion = (id: string) => {
    setConexiones(conexiones.filter(c => c.id !== id));
    setTopics(topics.filter(t => t.conexionId !== id));
    toast({ title: "Conexión eliminada", description: "La conexión y sus topics han sido eliminados" });
  };

  const handleDeleteTopic = (id: string) => {
    setTopics(topics.filter(t => t.id !== id));
    toast({ title: "Topic eliminado", description: "El topic ha sido eliminado" });
  };

  const getEstadoConfig = (estado: ConexionMQTT["estado"]) => {
    switch (estado) {
      case "conectado": return { label: "Conectado", className: "bg-success/20 text-success border-success/30" };
      case "desconectado": return { label: "Desconectado", className: "bg-muted text-muted-foreground border-muted" };
      case "error": return { label: "Error", className: "bg-destructive/20 text-destructive border-destructive/30" };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configuración de Comunicación MQTT</h1>
        <p className="text-muted-foreground mt-1">Gestiona las conexiones y topics MQTT del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Conexiones</p>
                <p className="text-2xl font-bold text-foreground">{conexiones.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conectadas</p>
                <p className="text-2xl font-bold text-foreground">{conexiones.filter(c => c.estado === "conectado").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Topics Suscritos</p>
                <p className="text-2xl font-bold text-foreground">{topics.filter(t => t.tipo === "suscripcion").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Topics Publicación</p>
                <p className="text-2xl font-bold text-foreground">{topics.filter(t => t.tipo === "publicacion").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conexiones */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Conexiones MQTT</CardTitle>
          <Button size="sm" onClick={() => { setEditingConexion(null); setFormConexion({ nombre: "", ip: "", puerto: "1883" }); setDialogConexion(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Conexión
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-muted-foreground">ID</TableHead>
                  <TableHead className="text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-muted-foreground">Dirección IP</TableHead>
                  <TableHead className="text-muted-foreground">Puerto</TableHead>
                  <TableHead className="text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-muted-foreground">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conexiones.map((conexion) => (
                  <TableRow key={conexion.id}>
                    <TableCell className="font-mono text-foreground">{conexion.id}</TableCell>
                    <TableCell className="text-foreground font-medium">{conexion.nombre}</TableCell>
                    <TableCell className="font-mono text-foreground">{conexion.ip}</TableCell>
                    <TableCell className="font-mono text-foreground">{conexion.puerto}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getEstadoConfig(conexion.estado).className}>
                        {getEstadoConfig(conexion.estado).label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditConexion(conexion)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteConexion(conexion.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Topics */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Topics MQTT</CardTitle>
          <Button size="sm" onClick={() => { setEditingTopic(null); setFormTopic({ conexionId: "", topic: "", tipo: "suscripcion", tipoDato: "string", descripcion: "" }); setDialogTopic(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Topic
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-muted-foreground">ID</TableHead>
                  <TableHead className="text-muted-foreground">Conexión</TableHead>
                  <TableHead className="text-muted-foreground">Topic</TableHead>
                  <TableHead className="text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-muted-foreground">Tipo de Dato</TableHead>
                  <TableHead className="text-muted-foreground">Descripción</TableHead>
                  <TableHead className="text-muted-foreground">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((topic) => (
                  <TableRow key={topic.id}>
                    <TableCell className="font-mono text-foreground">{topic.id}</TableCell>
                    <TableCell className="text-foreground">{conexiones.find(c => c.id === topic.conexionId)?.nombre || "-"}</TableCell>
                    <TableCell className="font-mono text-foreground">{topic.topic}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={topic.tipo === "suscripcion" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-warning/20 text-warning border-warning/30"}>
                        {topic.tipo === "suscripcion" ? "Suscripción" : "Publicación"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{topic.tipoDato}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">{topic.descripcion}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditTopic(topic)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTopic(topic.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Conexión */}
      <Dialog open={dialogConexion} onOpenChange={setDialogConexion}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingConexion ? "Editar Conexión" : "Nueva Conexión MQTT"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={formConexion.nombre} onChange={(e) => setFormConexion({...formConexion, nombre: e.target.value})} placeholder="Broker Principal" className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label>Dirección IP</Label>
              <Input value={formConexion.ip} onChange={(e) => setFormConexion({...formConexion, ip: e.target.value})} placeholder="192.168.1.100" className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label>Puerto</Label>
              <Input type="number" value={formConexion.puerto} onChange={(e) => setFormConexion({...formConexion, puerto: e.target.value})} placeholder="1883" className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogConexion(false)}><X className="h-4 w-4 mr-2" />Cancelar</Button>
            <Button onClick={handleSaveConexion}><Save className="h-4 w-4 mr-2" />Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Topic */}
      <Dialog open={dialogTopic} onOpenChange={setDialogTopic}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingTopic ? "Editar Topic" : "Nuevo Topic MQTT"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Conexión</Label>
              <Select value={formTopic.conexionId} onValueChange={(v) => setFormTopic({...formTopic, conexionId: v})}>
                <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Seleccionar conexión" /></SelectTrigger>
                <SelectContent>
                  {conexiones.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input value={formTopic.topic} onChange={(e) => setFormTopic({...formTopic, topic: e.target.value})} placeholder="planta/norte/temperatura" className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formTopic.tipo} onValueChange={(v: "suscripcion" | "publicacion") => setFormTopic({...formTopic, tipo: v})}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="suscripcion">Suscripción</SelectItem>
                  <SelectItem value="publicacion">Publicación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Dato</Label>
              <Select value={formTopic.tipoDato} onValueChange={(v) => setFormTopic({...formTopic, tipoDato: v})}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposDato.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={formTopic.descripcion} onChange={(e) => setFormTopic({...formTopic, descripcion: e.target.value})} placeholder="Descripción del topic" className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTopic(false)}><X className="h-4 w-4 mr-2" />Cancelar</Button>
            <Button onClick={handleSaveTopic}><Save className="h-4 w-4 mr-2" />Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfiguracionMQTT;
