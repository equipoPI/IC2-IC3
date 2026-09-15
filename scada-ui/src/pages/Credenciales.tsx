import { useState, useEffect } from "react";
import { KeyRound, Key, Plus, Trash2, CheckCircle2, XCircle, ShieldCheck, Edit, Save, X, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import apiFetch from "@/lib/api";

interface RegistrationKeyItem {
  id: number;
  clave: string;
  activo: boolean;
  actualizado_en: string;
}

interface MqttUserItem {
  username: string;
}

const Credenciales = () => {
  const { usuario } = useAuth();
  const isAdmin = usuario?.rango === '8' || usuario?.rol === 'Administrador' || Boolean((usuario as any)?.is_staff) || Boolean((usuario as any)?.is_superuser);

  // --- Estado para Claves de Registro ---
  const [regKeys, setRegKeys] = useState<RegistrationKeyItem[]>([]);
  const [dialogNewRegKey, setDialogNewRegKey] = useState(false);
  const [newRegKeyStr, setNewRegKeyStr] = useState("");
  const [deleteRegKeyId, setDeleteRegKeyId] = useState<number | null>(null);

  // --- Estado para Usuarios Mosquitto ---
  const [mqttUsers, setMqttUsers] = useState<MqttUserItem[]>([]);
  const [dialogMqttUser, setDialogMqttUser] = useState(false);
  const [formMqttUser, setFormMqttUser] = useState({ username: "", password: "" });
  const [deleteMqttUser, setDeleteMqttUser] = useState<string | null>(null);

  const fetchRegKeys = async () => {
    try {
      const res = await apiFetch('/api/v1/registration-keys/');
      if (res.ok) {
        const data = await res.json();
        setRegKeys(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {}
  };

  const fetchMqttUsers = async () => {
    try {
      const res = await apiFetch('/api/v1/mqtt-users/');
      if (res.ok) {
        const data = await res.json();
        setMqttUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchRegKeys();
    fetchMqttUsers();
  }, []);

  // Handlers para Claves de Registro
  const handleAddRegKey = async () => {
    if (!newRegKeyStr.trim()) {
      toast.error("Ingrese una clave válida");
      return;
    }
    try {
      const res = await apiFetch('/api/v1/registration-keys/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: newRegKeyStr.trim(), activo: true })
      });
      if (res.ok) {
        toast.success("Clave de registro creada exitosamente");
        setDialogNewRegKey(false);
        setNewRegKeyStr("");
        fetchRegKeys();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Error creando clave de registro");
      }
    } catch (e) {
      toast.error("Error de red");
    }
  };

  const handleToggleRegKey = async (keyItem: RegistrationKeyItem) => {
    try {
      const res = await apiFetch(`/api/v1/registration-keys/${keyItem.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !keyItem.activo })
      });
      if (res.ok) {
        toast.success(`Clave ${!keyItem.activo ? 'activada' : 'desactivada'}`);
        fetchRegKeys();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Error actualizando estado");
      }
    } catch (e) {
      toast.error("Error de red");
    }
  };

  const executeDeleteRegKey = async () => {
    if (!deleteRegKeyId) return;
    try {
      const res = await apiFetch(`/api/v1/registration-keys/${deleteRegKeyId}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Clave de registro eliminada");
        setDeleteRegKeyId(null);
        fetchRegKeys();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "No se puede eliminar la clave");
      }
    } catch (e) {
      toast.error("Error de red");
    }
  };

  // Handlers para Usuarios Mosquitto
  const handleSaveMqttUser = async () => {
    if (!formMqttUser.username || !formMqttUser.password) {
      toast.error("Complete usuario y contraseña");
      return;
    }
    try {
      const res = await apiFetch('/api/v1/mqtt-users/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formMqttUser)
      });
      if (res.ok) {
        toast.success(`Credenciales de ${formMqttUser.username} actualizadas en Mosquitto`);
        setDialogMqttUser(false);
        setFormMqttUser({ username: "", password: "" });
        fetchMqttUsers();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Error al guardar usuario en Mosquitto");
      }
    } catch (e) {
      toast.error("Error de red");
    }
  };

  const executeDeleteMqttUser = async () => {
    if (!deleteMqttUser) return;
    try {
      const res = await apiFetch(`/api/v1/mqtt-users/${deleteMqttUser}/`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Usuario ${deleteMqttUser} eliminado de Mosquitto`);
        setDeleteMqttUser(null);
        fetchMqttUsers();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Error eliminando usuario");
      }
    } catch (e) {
      toast.error("Error de red");
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
        <ShieldCheck className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Acceso Restringido</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Esta sección de gestión de credenciales requiere privilegios de Administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-primary" /> Gestión de Credenciales y Accesos
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra las claves de registro de usuarios y los accesos autenticados al broker MQTT Mosquitto.
        </p>
      </div>

      {/* Tabs Principales */}
      <Tabs defaultValue="registro" className="space-y-6">
        <TabsList className="bg-muted p-1 border border-border">
          <TabsTrigger value="registro" className="gap-2 text-xs font-semibold">
            <Key className="h-4 w-4" /> Claves de Registro de Usuarios ({regKeys.length})
          </TabsTrigger>
          <TabsTrigger value="mosquitto" className="gap-2 text-xs font-semibold">
            <Server className="h-4 w-4" /> Credenciales Broker Mosquitto ({mqttUsers.length})
          </TabsTrigger>
          <TabsTrigger value="permisos" className="gap-2 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4" /> Matriz de Permisos por Rango
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Claves de Registro del Sistema */}
        <TabsContent value="registro">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" /> Claves de Registro de Cuentas
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Gestiona las claves requeridas para dar de alta nuevas cuentas de usuario en el sistema.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => { setNewRegKeyStr(""); setDialogNewRegKey(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Clave de Registro
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-muted-foreground">Clave de Registro</TableHead>
                      <TableHead className="text-muted-foreground">Estado</TableHead>
                      <TableHead className="text-muted-foreground">Última Actualización</TableHead>
                      <TableHead className="text-muted-foreground">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regKeys.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          No hay claves de registro configuradas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      regKeys.map((k) => (
                        <TableRow key={k.id} className="hover:bg-muted/20 border-border">
                          <TableCell className="font-mono font-bold text-foreground">{k.clave}</TableCell>
                          <TableCell>
                            {k.activo ? (
                              <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                                Activa
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-muted text-muted-foreground">
                                Inactiva
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{k.actualizado_en || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                title={k.activo ? "Desactivar clave" : "Activar clave"}
                                onClick={() => handleToggleRegKey(k)}
                              >
                                {k.activo ? <XCircle className="h-4 w-4 text-warning" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                title="Eliminar clave"
                                onClick={() => setDeleteRegKeyId(k.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Credenciales Broker Mosquitto */}
        <TabsContent value="mosquitto">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" /> Credenciales del Broker Mosquitto
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Gestiona los usuarios autorizados en el archivo de contraseñas de Mosquitto (`passwd`) para gateways y Raspberry Pi.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => { setFormMqttUser({ username: "", password: "" }); setDialogMqttUser(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario Broker
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-muted-foreground">Usuario</TableHead>
                      <TableHead className="text-muted-foreground">Estado Autenticación</TableHead>
                      <TableHead className="text-muted-foreground">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mqttUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          No se encontraron usuarios en el archivo passwd de Mosquitto
                        </TableCell>
                      </TableRow>
                    ) : (
                      mqttUsers.map((u) => (
                        <TableRow key={u.username} className="hover:bg-muted/20 border-border">
                          <TableCell className="font-medium text-foreground">{u.username}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                              Habilitado
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Cambiar Contraseña"
                                onClick={() => { setFormMqttUser({ username: u.username, password: "" }); setDialogMqttUser(true); }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                title="Eliminar Usuario"
                                onClick={() => setDeleteMqttUser(u.username)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Matriz de Permisos por Rango */}
        <TabsContent value="permisos">
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Control de Permisos y Matriz de Roles
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Resumen de accesos y nivel de autorización asignados dinámicamente a cada uno de los 8 rangos laborales del sistema SCADA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-muted-foreground">Categoría</TableHead>
                      <TableHead className="text-muted-foreground">Rangos (ID)</TableHead>
                      <TableHead className="text-muted-foreground">Módulos Accesibles (Operación y Edición Plena)</TableHead>
                      <TableHead className="text-muted-foreground">Módulo Personal (/empleados)</TableHead>
                      <TableHead className="text-muted-foreground">Módulos Ocultos / Restringidos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-muted/20 border-border">
                      <TableCell className="font-bold text-primary">1. Administrador</TableCell>
                      <TableCell><Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Rango 8 (Administrador)</Badge></TableCell>
                      <TableCell className="text-xs text-success font-medium">Acceso TOTAL (Operación, ABMC y Configuración en todos los módulos)</TableCell>
                      <TableCell><Badge className="bg-success/20 text-success border-0">ABMC + Gestión Total</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground italic">Ninguno (Acceso Completo)</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-muted/20 border-border">
                      <TableCell className="font-bold text-foreground">2. Alta Dirección</TableCell>
                      <TableCell className="space-x-1">
                        <Badge variant="outline">Rango 7 (Director)</Badge>
                        <Badge variant="outline">Rango 6 (Gerente)</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-foreground">Dashboard, Planificación, Plantillas, Monitorización, SCADA, Análisis, Alarmas, Auditoría, Guía (Edición y Operación permitidas)</TableCell>
                      <TableCell><Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">Solo Lectura Personal</Badge></TableCell>
                      <TableCell className="text-xs text-destructive font-mono">/plantas, /secciones, /sensores, /almacenamiento, /credenciales, /comunicacion</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-muted/20 border-border">
                      <TableCell className="font-bold text-foreground">3. Mandos Medios</TableCell>
                      <TableCell className="space-x-1">
                        <Badge variant="outline">Rango 5 (Jefe Sección)</Badge>
                        <Badge variant="outline">Rango 4 (Especialista)</Badge>
                        <Badge variant="outline">Rango 3 (Coordinador)</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-foreground">Dashboard, Sensores, Almacenamiento, Planificación, Plantillas, Monitorización, SCADA, Análisis, Alarmas, Auditoría, Guía (Edición y Operación permitidas)</TableCell>
                      <TableCell><Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">Solo Lectura Personal</Badge></TableCell>
                      <TableCell className="text-xs text-destructive font-mono">/plantas, /secciones, /credenciales, /comunicacion</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-muted/20 border-border">
                      <TableCell className="font-bold text-foreground">4. Operativos</TableCell>
                      <TableCell className="space-x-1">
                        <Badge variant="outline">Rango 2 (Empleado)</Badge>
                        <Badge variant="outline">Rango 1 (Pasante)</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-foreground">Dashboard, Planificación, Monitorización, SCADA, Análisis, Alarmas, Guía (Operación, Comandos MQTT y Creación de Órdenes permitidas)</TableCell>
                      <TableCell><Badge variant="outline" className="bg-destructive/20 text-destructive border-0">Sin Acceso</Badge></TableCell>
                      <TableCell className="text-xs text-destructive font-mono">/empleados, /plantas, /secciones, /sensores, /almacenamiento, /plantillas, /auditoria, /credenciales, /comunicacion</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para Crear Nueva Clave de Registro */}
      <Dialog open={dialogNewRegKey} onOpenChange={setDialogNewRegKey}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" /> Crear Nueva Clave de Registro
            </DialogTitle>
            <DialogDescription>
              Esta clave podrá ser utilizada por nuevos usuarios al momento de registrarse en la plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reg-key-input">Clave de Registro</Label>
              <Input
                id="reg-key-input"
                value={newRegKeyStr}
                onChange={(e) => setNewRegKeyStr(e.target.value)}
                placeholder="ej: SCADA_KEY_2026, 00admin00"
                className="bg-background border-border font-mono font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNewRegKey(false)}>Cancelar</Button>
            <Button onClick={handleAddRegKey}>Crear Clave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Eliminación Clave de Registro */}
      <Dialog open={!!deleteRegKeyId} onOpenChange={(open) => !open && setDeleteRegKeyId(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive font-bold flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Confirmar Eliminación de Clave
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta clave de registro? Si es la única clave activa en el sistema, la acción será rechazada para mantener la seguridad.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteRegKeyId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={executeDeleteRegKey}>Eliminar Clave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Usuario Mosquitto */}
      <Dialog open={dialogMqttUser} onOpenChange={setDialogMqttUser}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Gestionar Usuario Broker Mosquitto</DialogTitle>
            <DialogDescription>
              Crea o actualiza la contraseña de un usuario autorizado en el broker Mosquitto (`passwd`).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mqtt-username">Usuario</Label>
              <Input
                id="mqtt-username"
                value={formMqttUser.username}
                onChange={(e) => setFormMqttUser({ ...formMqttUser, username: e.target.value })}
                placeholder="ej: admin, raspberry_pi_1"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mqtt-password">Contraseña</Label>
              <Input
                id="mqtt-password"
                type="password"
                value={formMqttUser.password}
                onChange={(e) => setFormMqttUser({ ...formMqttUser, password: e.target.value })}
                placeholder="••••••••"
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMqttUser(false)}>
              <X className="h-4 w-4 mr-2" /> Cancelar
            </Button>
            <Button onClick={handleSaveMqttUser}>
              <Save className="h-4 w-4 mr-2" /> Guardar Credenciales
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Eliminación Usuario Mosquitto */}
      <Dialog open={!!deleteMqttUser} onOpenChange={(open) => !open && setDeleteMqttUser(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive font-bold flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Confirmar Eliminación de Usuario Mosquitto
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar el usuario <strong className="text-foreground">{deleteMqttUser}</strong> del broker Mosquitto? Dispositivos con estas credenciales no podrán conectarse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteMqttUser(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={executeDeleteMqttUser}>Eliminar Usuario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Credenciales;
