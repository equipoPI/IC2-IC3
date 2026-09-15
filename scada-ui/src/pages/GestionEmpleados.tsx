import { useState, useEffect } from "react";
import TablaGestion, { Column } from "@/components/TablaGestion";
import FormularioEmpleado, { Empleado } from "@/components/FormularioEmpleado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RolUsuario } from "@/contexts/AuthContext";
import { Lock, Unlock, History } from "lucide-react";
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
  '1': 'Director',
  '2': 'Gerente',
  '3': 'Jefe de Sección',
  '4': 'Coordinador',
  '5': 'Especialista',
  '6': 'Empleado',
  '7': 'Pasante',
  '8': 'Administrador',
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
  const { isAdmin, addAuditLog, usuario, auditLogs, refreshUser } = useAuth();
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
  // removed persistent `rol` UI: no role-change dialog/state
  

  const columns: Column<Empleado>[] = [
    { key: "id", header: "ID", className: "font-mono text-sm" },
    { key: "nombreCompleto", header: "Nombre Completo", className: "font-medium" },
    {
      key: "rango",
      header: "Rango",
      render: (emp) => <Badge variant={getRangoBadgeVariant(emp.rango)}>{emp.rango}</Badge>,
    },
    // `rol` persistente eliminado: mostrar sólo `rango` derivado para evitar inconsistencias
    { key: "fabricaAsignada", header: "Fábrica Asignada" },
    { key: "email", header: "Email" },
    // columna de contacto oculta intencionalmente por privacidad/UX
    {
      key: "estado",
      header: "Estado",
      render: (emp) => {
        let variant: "default" | "destructive" | "secondary" | "outline" = "outline";
        let label = emp.estado || "Otro";
        if (label === "ACTIVO") {
          variant = "default";
          label = "Activo";
        } else if (label === "DESPEDIDO") {
          variant = "destructive";
          label = "Despedido";
        } else if (label === "SUSPENDIDO") {
          variant = "destructive";
          label = "Suspendido";
        } else if (label === "JUBILADO") {
          variant = "secondary";
          label = "Jubilado";
        } else {
          variant = "outline";
          label = "Otro";
        }
        return <Badge variant={variant}>{label}</Badge>;
      },
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
          // rol eliminado: derivar en runtime desde `rango` cuando sea necesario
          activo: (e.estado || '').toUpperCase() === 'ACTIVO',
          estado: e.estado || 'ACTIVO',
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
    const doOpen = async () => {
      try {
        // Intentar obtener detalle completo desde backend (incluye fecha_contratacion, seccion, etc.)
        const resp = await apiFetch(`/api/v1/empleados/${encodeURIComponent(empleado.id)}/`);
        if (resp.ok) {
          const full = await resp.json();
          const normalized = { ...full, id: full.documento || full.username || full.id };
          setSelectedEmpleado(normalized as any);
        } else {
          // fallback a la versión reducida
          setSelectedEmpleado(empleado);
        }
      } catch (e) {
        setSelectedEmpleado(empleado);
      } finally {
        setIsFormOpen(true);
      }
    };
    doOpen();
  };

  const handleDelete = (empleado: Empleado) => {
    setEmpleadoToDelete(empleado);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    const doDelete = async () => {
      if (!empleadoToDelete) return;
      const targetId = empleadoToDelete.id;
      const targetName = empleadoToDelete.nombreCompleto;
      setEmpleados((prev) => prev.filter((e) => e.id !== targetId));
      setDeleteDialogOpen(false);
      setEmpleadoToDelete(null);

      try {
        await apiFetch(`/api/v1/empleados/${targetId}/`, { method: 'DELETE' });
        toast({ title: "Empleado eliminado", description: `${targetName} fue eliminado permanentemente de la BD.` });
      } catch (err) {
        toast({ title: "Empleado eliminado", description: `${targetName} fue eliminado.` });
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
            rango: data.rango,
            // rol_actual removed: backend derives role from `rango`
            fabrica: data.fabrica ? Number(data.fabrica) : undefined,
            seccion: data.seccion ? Number(data.seccion) : undefined,
            fecha_contratacion: data.fecha_contratacion,
            email: data.email,
            direccion: data.direccion,
            estado: data.estado || 'ACTIVO',
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
            rango: RANGO_MAP[String(updated.rango)] || RANGO_MAP[updated.rango] || e.rango,
            ultimoFichaje: formatDateTime(updated.ultimo_inicio_sesion || updated.ultimo_fichaje || e.ultimoFichaje),
            email: updated.email || e.email,
            activo: (updated.estado || '').toUpperCase() === 'ACTIVO',
            estado: updated.estado || 'ACTIVO',
          } : e));
          // Emitir evento global para que widgets/perfil recarguen datos
          try {
            window.dispatchEvent(new CustomEvent('empleado:updated', { detail: { documento: updated.documento, email: updated.email } }));
          } catch (e) {}
          // Si actualizamos al usuario actualmente autenticado, refrescar contexto global
          try {
            const isCurrentUser = usuario && (String(updated.documento) === String(usuario.username) || (updated.email && usuario.email && String(updated.email) === String(usuario.email)));
            if (isCurrentUser) {
              await refreshUser();
            }
          } catch (e) {
            // silencioso
          }
          addAuditLog({ usuario: usuario?.nombre || 'Sistema', accion: 'Modificación de Empleado', objetoAfectado: `${data.nombre} ${data.apellido} (${selectedEmpleado.id})`, modulo: 'Empleados' });
          toast({ title: 'Empleado actualizado', description: 'Sincronizado con backend.' });
        } catch (err) {
          setEmpleados((prev) => prev.map((e) => e.id === selectedEmpleado.id ? { ...e, ...data, nombreCompleto: `${data.nombre} ${data.apellido}`, estado: data.estado || 'ACTIVO' } : e));
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
            rango: data.rango,
            // rol_actual removed: rely on `rango`
            fabrica: data.fabrica ? Number(data.fabrica) : undefined,
            seccion: data.seccion ? Number(data.seccion) : undefined,
            fecha_contratacion: data.fecha_contratacion,
            email: data.email,
            direccion: data.direccion,
            estado: data.estado || 'ACTIVO',
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
            activo: created.estado === 'ACTIVO',
            estado: created.estado || 'ACTIVO',
          };
          setEmpleados((prev) => [...prev, newEmpleado]);
          addAuditLog({ usuario: usuario?.nombre || 'Sistema', accion: 'Alta de Empleado', objetoAfectado: `${newEmpleado.nombreCompleto} (${newEmpleado.id})`, modulo: 'Empleados' });
          // Emitir evento global para que Perfil/otros recarguen datos
          try { window.dispatchEvent(new CustomEvent('empleado:updated', { detail: { documento: created.documento, email: created.email } })); } catch (e) {}
          toast({ title: 'Empleado creado', description: 'Sincronizado con backend.' });
        } catch (err) {
          const newEmpleado: Empleado = {
            id: `EMP-${String(empleados.length + 1).padStart(3, '0')}`,
            ...data,
            nombreCompleto: `${data.nombre} ${data.apellido}`,
            ultimoFichaje: new Date().toLocaleString('es-ES'),
            estado: data.estado || 'ACTIVO',
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
      const isBlocked = empleadoToBlock.activo; // Si estaba activo, ahora lo bloqueamos (SUSPENDIDO)
      const nuevoEstado = isBlocked ? 'SUSPENDIDO' : 'ACTIVO';
      const doBlock = async () => {
        try {
          const resp = await apiFetch(`/api/v1/empleados/${empleadoToBlock.id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado }),
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const updated = await resp.json();
          
          setEmpleados((prev) =>
            prev.map((e) => (e.id === empleadoToBlock.id ? {
              ...e,
              activo: updated.estado === 'ACTIVO',
              estado: updated.estado,
            } : e))
          );

          addAuditLog({
            usuario: usuario?.nombre || "Sistema",
            accion: nuevoEstado === 'ACTIVO' ? "Desbloqueo de Empleado" : "Bloqueo de Empleado",
            objetoAfectado: `${empleadoToBlock.nombreCompleto} (${empleadoToBlock.id})`,
            modulo: "Empleados",
          });
          addNotificacion({
            titulo: nuevoEstado === 'ACTIVO' ? "Acceso desbloqueado" : "Acceso bloqueado",
            mensaje: `${usuario?.nombre || "Admin"} ha ${nuevoEstado === 'ACTIVO' ? "desbloqueado" : "bloqueado"} a ${empleadoToBlock.nombreCompleto}.`,
            tipo: nuevoEstado === 'ACTIVO' ? 'success' : 'warning',
          });
          toast({ title: nuevoEstado === 'ACTIVO' ? "Acceso desbloqueado" : "Acceso bloqueado", description: `El empleado ha sido ${nuevoEstado === 'ACTIVO' ? "habilitado" : "suspendido"} correctamente.` });
        } catch (err) {
          toast({ title: 'Error al actualizar acceso', description: 'No se pudo sincronizar el cambio con el servidor.', variant: 'destructive' });
        }
      };
      doBlock();
    }
    setBlockDialogOpen(false);
    setEmpleadoToBlock(null);
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
          {/* Editar rango se hará en el formulario del empleado (campo `rango`). */}
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

  const canEdit = Number(usuario?.rango) === 8 || Boolean((usuario as any)?.is_superuser);

  return (
    <div>
      <TablaGestion
        title="Gestión de Empleados"
        subtitle={canEdit ? "Administra el personal de todas las plantas y fábricas" : "Consulta de personal (Modo Solo Lectura)"}
        data={empleados}
        columns={columns}
        onAdd={canEdit ? handleAdd : undefined}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canEdit ? handleDelete : undefined}
        searchPlaceholder="Buscar empleados..."
        addButtonLabel="Añadir Empleado"
        extraActions={canEdit ? extraActions : (empleado) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewHistorial(empleado)}
            title="Ver Historial"
          >
            <History className="h-4 w-4 text-primary" />
          </Button>
        )}
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

      {/* Role change UI removed: use `rango` field in FormularioEmpleado */}
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
