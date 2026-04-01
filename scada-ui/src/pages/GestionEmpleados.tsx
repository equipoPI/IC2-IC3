import { useState } from "react";
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

const initialEmpleados: Empleado[] = [
  { id: "EMP-001", nombre: "Carlos", apellido: "García López", nombreCompleto: "Carlos García López", rango: "Supervisor", fabricaAsignada: "Planta Norte", ultimoFichaje: "2024-01-15 08:30", rol: "Administrador", activo: true },
  { id: "EMP-002", nombre: "María", apellido: "Rodríguez Sánchez", nombreCompleto: "María Rodríguez Sánchez", rango: "Ingeniero", fabricaAsignada: "Planta Central", ultimoFichaje: "2024-01-15 07:45", rol: "Jefe de Sector", activo: true },
  { id: "EMP-003", nombre: "Juan", apellido: "Martínez Pérez", nombreCompleto: "Juan Martínez Pérez", rango: "Operario", fabricaAsignada: "Planta Sur", ultimoFichaje: "2024-01-15 06:00", rol: "Operador", activo: true },
  { id: "EMP-004", nombre: "Ana", apellido: "López Fernández", nombreCompleto: "Ana López Fernández", rango: "Técnico", fabricaAsignada: "Fábrica Este", ultimoFichaje: "2024-01-15 08:15", rol: "Operador", activo: true },
  { id: "EMP-005", nombre: "Pedro", apellido: "Sánchez Ruiz", nombreCompleto: "Pedro Sánchez Ruiz", rango: "Jefe de Planta", fabricaAsignada: "Planta Norte", ultimoFichaje: "2024-01-15 07:00", rol: "Jefe de Sector", activo: true },
  { id: "EMP-006", nombre: "Laura", apellido: "González Torres", nombreCompleto: "Laura González Torres", rango: "Gerente", fabricaAsignada: "Planta Central", ultimoFichaje: "2024-01-15 09:00", rol: "Administrador", activo: true },
  { id: "EMP-007", nombre: "Miguel", apellido: "Hernández Díaz", nombreCompleto: "Miguel Hernández Díaz", rango: "Operario", fabricaAsignada: "Fábrica Oeste", ultimoFichaje: "2024-01-15 06:30", rol: "Operador", activo: false },
  { id: "EMP-008", nombre: "Carmen", apellido: "Jiménez Moreno", nombreCompleto: "Carmen Jiménez Moreno", rango: "Técnico", fabricaAsignada: "Planta Sur", ultimoFichaje: "2024-01-15 07:30", rol: "Operador", activo: true },
];

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
    if (empleadoToDelete) {
      setEmpleados((prev) => prev.filter((e) => e.id !== empleadoToDelete.id));
      addAuditLog({
        usuario: usuario?.nombre || "Sistema",
        accion: "Eliminación de Empleado",
        objetoAfectado: `${empleadoToDelete.nombreCompleto} (${empleadoToDelete.id})`,
        modulo: "Empleados",
      });
      toast({ title: "Empleado eliminado", description: `${empleadoToDelete.nombreCompleto} ha sido eliminado correctamente.` });
    }
    setDeleteDialogOpen(false);
    setEmpleadoToDelete(null);
  };

  const handleSubmit = (data: Omit<Empleado, "id" | "nombreCompleto" | "ultimoFichaje">) => {
    if (selectedEmpleado) {
      setEmpleados((prev) =>
        prev.map((e) =>
          e.id === selectedEmpleado.id
            ? { ...e, ...data, nombreCompleto: `${data.nombre} ${data.apellido}` }
            : e
        )
      );
      addAuditLog({
        usuario: usuario?.nombre || "Sistema",
        accion: "Modificación de Empleado",
        objetoAfectado: `${data.nombre} ${data.apellido} (${selectedEmpleado.id})`,
        modulo: "Empleados",
      });
      toast({ title: "Empleado actualizado", description: `Los datos de ${data.nombre} ${data.apellido} han sido actualizados.` });
    } else {
      const newEmpleado: Empleado = {
        id: `EMP-${String(empleados.length + 1).padStart(3, "0")}`,
        ...data,
        nombreCompleto: `${data.nombre} ${data.apellido}`,
        ultimoFichaje: new Date().toLocaleString("es-ES"),
      };
      setEmpleados((prev) => [...prev, newEmpleado]);
      addAuditLog({
        usuario: usuario?.nombre || "Sistema",
        accion: "Alta de Empleado",
        objetoAfectado: `${data.nombre} ${data.apellido} (${newEmpleado.id})`,
        modulo: "Empleados",
      });
      toast({ title: "Empleado añadido", description: `${data.nombre} ${data.apellido} ha sido añadido al sistema.` });
    }
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
