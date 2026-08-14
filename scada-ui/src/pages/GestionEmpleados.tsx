import { useState, useEffect } from "react";
import TablaGestion, { Column } from "@/components/TablaGestion";
import FormularioEmpleado, { Empleado } from "@/components/FormularioEmpleado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RolUsuario } from "@/contexts/AuthContext";
import { ShieldCheck, Lock, Unlock, History } from "lucide-react";
import HistorialEmpleadoDialog from "@/components/HistorialEmpleadoDialog";
import { useNotifications } from "@/contexts/NotificationsContext";
import apiFetch from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

// Lista inicialmente vacía: cargaremos desde la API cuando sea posible
const initialEmpleados: Empleado[] = [];

// Mapeo reducido: códigos -> etiqueta simple
const RANGO_MAP: Record<string, string> = {
  '1': 'Administrador',
  '2': 'Administrador',
  '3': 'Jefe',
  '4': 'Empleado',
  '5': 'Empleado',
  '6': 'Empleado',
  '7': 'Empleado',
  '8': 'Empleado',
};

const getRolBadgeClass = (rol: RolUsuario) => {
  switch (rol) {
    case "Administrador":
      return "bg-primary/20 text-primary border-primary/30";
    case "Jefe de Sector":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Operador":
      return "bg-muted text-muted-foreground border-border";
  }
};

const getRangoBadgeVariant = (rango: string) => {
  switch (rango) {
    case "Director":
    case "Gerente":
      return "default";
    case "Jefe de Planta":
    case "Supervisor":
      return "secondary";
    default:
      return "outline";
  }
};

  const formatDateTime = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return iso;
    }
  };

const GestionEmpleados = () => {
  const { isAdmin, addAuditLog, usuario, auditLogs } = useAuth();
  const { addNotificacion } = useNotifications();
  const [historialOpen, setHistorialOpen] = useState(false);
  const [empleadoHistorial, setEmpleadoHistorial] = useState<Empleado | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>(initialEmpleados);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [empleadoToDelete, setEmpleadoToDelete] = useState<Empleado | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [empleadoToBlock, setEmpleadoToBlock] = useState<Empleado | null>(null);
  const [rolDialogOpen, setRolDialogOpen] = useState(false);
  const [empleadoToPromote, setEmpleadoToPromote] = useState<Empleado | null>(null);
  const [newRol, setNewRol] = useState<RolUsuario>("Operador");

  const columns: Column<Empleado>[] = [
    { key: "id", header: "ID", className: "font-mono text-sm" },
    { key: "nombreCompleto", header: "Nombre Completo", className: "font-medium" },
    {
      key: "rango",
      header: "Rango",
      render: (emp) => <Badge variant={getRangoBadgeVariant(emp.rango)}>{emp.rango}</Badge>,
    },
    {
      key: "rol",
      header: "Rol",
      render: (emp) => (
        <Badge variant="outline" className={getRolBadgeClass(emp.rol)}>
          {emp.rol}
        </Badge>
      ),
    },
    { key: "fabricaAsignada", header: "Fábrica Asignada" },
    { key: "email", header: "Email" },
    // columna de contacto oculta intencionalmente por privacidad/UX
    {
      key: "activo",
      header: "Estado",
      render: (emp) => (
        <Badge variant={emp.activo ? "default" : "destructive"}>
          {emp.activo ? "Activo" : "Bloqueado"}
        </Badge>
      ),
    },
    { key: "ultimoFichaje", header: "Último Fichaje", className: "text-muted-foreground text-sm" },
  ];



  // Cargar empleados desde API al montar
  useEffect(() => {
    const load = async () => {
      try {
        const resp = await apiFetch('/api/v1/empleados/');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
          const mapped = data.map((e: any, idx: number) => ({
          id: e.documento || e.username || `EMP-${String(idx + 1).padStart(4, '0')}`,
          nombre: e.nombre || '' ,
          apellido: e.apellido || '' ,
          nombreCompleto: `${e.nombre || ''} ${e.apellido || ''}`.trim(),
          rango: RANGO_MAP[String(e.rango)] || RANGO_MAP[e.rango] || 'Empleado',
          fabricaAsignada: e.fabrica_nombre || '',
          // Priorizar `ultimo_inicio_sesion` si está presente, sino `ultimo_fichaje`
          ultimoFichaje: formatDateTime(e.ultimo_inicio_sesion || e.ultimo_fichaje || ''),
          rol: e.rol_actual || 'Operador',
          activo: (e.estado || '').toUpperCase() === 'ACTIVO',
          email: e.email || '',
        }));
        setEmpleados(mapped);
      } catch (err) {
        toast({ title: 'No se pudieron cargar empleados desde la API', description: String(err), duration: 4000 });
      }
    };
    load();
  }, []);

  const handleAdd = () => {
    setSelectedEmpleado(null);
    setIsFormOpen(true);
  };

  const handleEdit = (empleado: Empleado) => {
    setSelectedEmpleado(empleado);
    setIsFormOpen(true);
  };

  const handleDelete = (empleado: Empleado) => {
    setEmpleadoToDelete(empleado);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    const doDelete = async () => {
      if (!empleadoToDelete) return;
      try {
        const resp = await apiFetch(`/api/v1/empleados/${empleadoToDelete.id}/`, { method: 'DELETE' });
        if (!resp.ok && resp.status !== 204) throw new Error(`HTTP ${resp.status}`);
        // Solo actualizar estado local si el backend confirmó la eliminación
        setEmpleados((prev) => prev.filter((e) => e.id !== empleadoToDelete.id));
        addAuditLog({
          usuario: usuario?.nombre || "Sistema",
          accion: "Eliminación de Empleado",
          objetoAfectado: `${empleadoToDelete.nombreCompleto} (${empleadoToDelete.id})`,
          modulo: "Empleados",
        });
        toast({ title: "Empleado eliminado", description: `${empleadoToDelete.nombreCompleto} ha sido eliminado correctamente.` });
      } catch (err) {
        // No eliminar localmente si la API no confirma; informar al usuario
        addAuditLog({
          usuario: usuario?.nombre || "Sistema",
          accion: "Intento de eliminación fallido",
          objetoAfectado: `${empleadoToDelete.nombreCompleto} (${empleadoToDelete.id})`,
          modulo: "Empleados",
        });
        toast({ title: 'Error al eliminar', description: 'La eliminación en el backend falló. Revisa los logs del servidor.' });
      } finally {
        setDeleteDialogOpen(false);
        setEmpleadoToDelete(null);
      }
    };
    doDelete();
  };

  const handleSubmit = (data: any) => {
    const doSubmit = async () => {
      if (selectedEmpleado) {
        // Intentar sincronizar con backend (requiere campos adicionales en el modelo); si falla, aplicamos localmente
        try {
            const payload: any = {
            documento: selectedEmpleado.id,
            nombre: data.nombre,
            apellido: data.apellido,
            rol_actual: data.rol || data.rol_actual,
            fabrica: data.fabrica ? Number(data.fabrica) : undefined,
            seccion: data.seccion ? Number(data.seccion) : undefined,
            fecha_contratacion: data.fecha_contratacion,
            email: data.email,
            direccion: data.direccion,
            estado: data.activo ? 'ACTIVO' : 'OTRO',
          };
          // Eliminar propiedades vacías para evitar validación DRF en campos no requeridos
          Object.keys(payload).forEach((k) => {
            const v = payload[k];
            if (v === undefined || v === null) delete payload[k];
            if (typeof v === 'string' && v.trim() === '') delete payload[k];
          });
          const resp = await apiFetch(`/api/v1/empleados/${selectedEmpleado.id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const updated = await resp.json();
          setEmpleados((prev) => prev.map((e) => e.id === updated.documento ? {
            ...e,
            nombre: updated.nombre,
            apellido: updated.apellido,
            nombreCompleto: `${updated.nombre} ${updated.apellido}`,
            fabricaAsignada: updated.fabrica_nombre || e.fabricaAsignada,
            ultimoFichaje: formatDateTime(updated.ultimo_inicio_sesion || updated.ultimo_fichaje || e.ultimoFichaje),
            email: updated.email || e.email,
            activo: (updated.estado || '').toUpperCase() === 'ACTIVO',
          } : e));
          addAuditLog({ usuario: usuario?.nombre || 'Sistema', accion: 'Modificación de Empleado', objetoAfectado: `${data.nombre} ${data.apellido} (${selectedEmpleado.id})`, modulo: 'Empleados' });
          toast({ title: 'Empleado actualizado', description: 'Sincronizado con backend.' });
        } catch (err) {
          setEmpleados((prev) => prev.map((e) => e.id === selectedEmpleado.id ? { ...e, ...data, nombreCompleto: `${data.nombre} ${data.apellido}` } : e));
          addAuditLog({ usuario: usuario?.nombre || 'Sistema', accion: 'Modificación local de Empleado', objetoAfectado: `${data.nombre} ${data.apellido} (${selectedEmpleado.id})`, modulo: 'Empleados' });
          toast({ title: 'Actualizado localmente', description: 'Backend requiere campos adicionales; sincronización pendiente.' });
        }
      } else {
        // Crear localmente (backend requiere campos obligatorios; creación remota pendiente)
        try {
          const payload = {
            documento: data.documento,
            nombre: data.nombre,
            apellido: data.apellido,
            rol_actual: data.rol || data.rol_actual,
            fabrica: data.fabrica ? Number(data.fabrica) : undefined,
            seccion: data.seccion ? Number(data.seccion) : undefined,
            fecha_contratacion: data.fecha_contratacion,
            email: data.email,
            direccion: data.direccion,
            estado: data.activo ? 'ACTIVO' : 'OTRO',
            // Alta desde el panel de Empleados: marcar email como verificado y activar usuario
            email_verified: true,
          };
          Object.keys(payload).forEach((k) => {
            const v = payload[k];
            if (v === undefined || v === null) delete payload[k];
            if (typeof v === 'string' && v.trim() === '') delete payload[k];
          });
          const resp = await apiFetch('/api/v1/empleados/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const created = await resp.json();
          const newEmpleado: Empleado = {
            id: created.documento || `EMP-${String(empleados.length + 1).padStart(3, '0')}`,
            nombre: created.nombre,
            apellido: created.apellido,
            nombreCompleto: `${created.nombre} ${created.apellido}`,
            rango: RANGO_MAP[created.rango] || 'Empleado',
            fabricaAsignada: created.fabrica_nombre || '',
            ultimoFichaje: formatDateTime(created.ultimo_inicio_sesion || created.ultimo_fichaje || ''),
            rol: created.rol_actual || 'Operador',
            activo: created.estado === 'ACTIVO',
          };
          setEmpleados((prev) => [...prev, newEmpleado]);
          addAuditLog({ usuario: usuario?.nombre || 'Sistema', accion: 'Alta de Empleado', objetoAfectado: `${newEmpleado.nombreCompleto} (${newEmpleado.id})`, modulo: 'Empleados' });
          toast({ title: 'Empleado creado', description: 'Sincronizado con backend.' });
        } catch (err) {
          const newEmpleado: Empleado = {
            id: `EMP-${String(empleados.length + 1).padStart(3, '0')}`,
            ...data,
            nombreCompleto: `${data.nombre} ${data.apellido}`,
            ultimoFichaje: new Date().toLocaleString('es-ES'),
          };
          setEmpleados((prev) => [...prev, newEmpleado]);
          addAuditLog({ usuario: usuario?.nombre || 'Sistema', accion: 'Alta de Empleado (local)', objetoAfectado: `${data.nombre} ${data.apellido} (${newEmpleado.id})`, modulo: 'Empleados' });
          toast({ title: 'Empleado añadido (local)', description: 'Backend no respondió; creado localmente.' });
        }
      }
      setSelectedEmpleado(null);
      setIsFormOpen(false);
    };
    doSubmit();
  };

  const handleToggleBlock = (empleado: Empleado) => {
    setEmpleadoToBlock(empleado);
    setBlockDialogOpen(true);
  };

  const confirmBlock = () => {
    if (empleadoToBlock) {
      const newStatus = !empleadoToBlock.activo;
      setEmpleados((prev) =>
        prev.map((e) => (e.id === empleadoToBlock.id ? { ...e, activo: newStatus } : e))
      );
      addAuditLog({
        usuario: usuario?.nombre || "Sistema",
        accion: newStatus ? "Desbloqueo de Empleado" : "Bloqueo de Empleado",
        objetoAfectado: `${empleadoToBlock.nombreCompleto} (${empleadoToBlock.id})`,
        modulo: "Empleados",
      });
      addNotificacion({
        titulo: newStatus ? "Acceso desbloqueado" : "Acceso bloqueado",
        mensaje: `${usuario?.nombre || "Admin"} ha ${newStatus ? "desbloqueado" : "bloqueado"} a ${empleadoToBlock.nombreCompleto}.`,
        tipo: newStatus ? 'success' : 'warning',
      });
    }
    setBlockDialogOpen(false);
    setEmpleadoToBlock(null);
  };

  const handleEditRol = (empleado: Empleado) => {
    setEmpleadoToPromote(empleado);
    setNewRol(empleado.rol);
    setRolDialogOpen(true);
  };

  const confirmRolChange = () => {
    if (empleadoToPromote && newRol !== empleadoToPromote.rol) {
      const oldRol = empleadoToPromote.rol;
      setEmpleados((prev) =>
        prev.map((e) => (e.id === empleadoToPromote.id ? { ...e, rol: newRol } : e))
      );
      addAuditLog({
        usuario: usuario?.nombre || "Sistema",
        accion: "Cambio de Rol",
        objetoAfectado: `${empleadoToPromote.nombreCompleto}: ${oldRol} → ${newRol}`,
        modulo: "Empleados",
      });
      addNotificacion({
        titulo: "Cambio de rol",
        mensaje: `${usuario?.nombre || "Admin"} cambió el rol de ${empleadoToPromote.nombreCompleto}: ${oldRol} → ${newRol}.`,
        tipo: 'info',
      });
    }
    setRolDialogOpen(false);
    setEmpleadoToPromote(null);
  };

  const handleViewHistorial = (empleado: Empleado) => {
    setEmpleadoHistorial(empleado);
    setHistorialOpen(true);
  };

  const getLogsForEmpleado = (empleado: Empleado) => {
    const nombre = empleado.nombreCompleto.toLowerCase();
    const id = empleado.id.toLowerCase();
    return auditLogs.filter(
      (log) =>
        log.usuario.toLowerCase() === nombre.toLowerCase() ||
        log.objetoAfectado.toLowerCase().includes(nombre.toLowerCase()) ||
        log.objetoAfectado.toLowerCase().includes(id)
    );
  };

  const extraActions = (empleado: Empleado) => (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleViewHistorial(empleado)}
        title="Ver Historial"
      >
        <History className="h-4 w-4 text-muted-foreground" />
      </Button>
      {isAdmin && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditRol(empleado)}
            title="Editar Rol"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleBlock(empleado)}
            title={empleado.activo ? "Bloquear Acceso" : "Desbloquear Acceso"}
          >
            {empleado.activo ? (
              <Lock className="h-4 w-4 text-destructive" />
            ) : (
              <Unlock className="h-4 w-4 text-emerald-400" />
            )}
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div>
      <TablaGestion
        title="Gestión de Empleados"
        subtitle="Administra el personal de todas las plantas y fábricas"
        data={empleados}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Buscar empleados..."
        addButtonLabel="Añadir Empleado"
        extraActions={extraActions}
      />

      <FormularioEmpleado
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        empleado={selectedEmpleado}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente a{" "}
              <span className="font-medium text-foreground">{empleadoToDelete?.nombreCompleto}</span> del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block/Unblock Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {empleadoToBlock?.activo ? "¿Bloquear acceso?" : "¿Desbloquear acceso?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {empleadoToBlock?.activo
                ? `Se bloqueará el acceso de ${empleadoToBlock?.nombreCompleto} al sistema. Su historial se conservará.`
                : `Se restaurará el acceso de ${empleadoToBlock?.nombreCompleto} al sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlock}>
              {empleadoToBlock?.activo ? "Bloquear" : "Desbloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change Dialog */}
      <Dialog open={rolDialogOpen} onOpenChange={setRolDialogOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Rol</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Cambiar rol de <span className="font-medium text-foreground">{empleadoToPromote?.nombreCompleto}</span>
            </p>
            <Select value={newRol} onValueChange={(v) => setNewRol(v as RolUsuario)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="Operador">Operador</SelectItem>
                <SelectItem value="Jefe de Sector">Jefe de Sector</SelectItem>
                <SelectItem value="Administrador">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRolDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmRolChange}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Historial Dialog */}
      {empleadoHistorial && (
        <HistorialEmpleadoDialog
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          nombreEmpleado={empleadoHistorial.nombreCompleto}
          logs={getLogsForEmpleado(empleadoHistorial)}
        />
      )}
    </div>
  );
};

export default GestionEmpleados;
