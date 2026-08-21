import { useState, useEffect } from "react";
import { toast } from "sonner";
import TablaGestion, { Column } from "@/components/TablaGestion";
import FormularioPlanta, { PlantaFormData } from "@/components/FormularioPlanta";
import apiFetch from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface Planta {
  id: number;
  nombre: string;
  ubicacion: string;
  pais: string;
  estado: string;
  fechaCreacion: string;
}

// Inicio con lista vacía; cargaremos desde la API
const plantillasFallback: Planta[] = [];

const GestionPlantas = () => {
  const [plantas, setPlantas] = useState<Planta[]>(plantillasFallback);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlanta, setEditingPlanta] = useState<Planta | null>(null);

  const getCookie = (name: string) => {
    const matches = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return matches ? decodeURIComponent(matches[1]) : null;
  };

  useEffect(() => {
    // Cargar plantas desde backend
    const load = async () => {
      try {
        const resp = await apiFetch('/api/v1/fabricas/');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        // Soporta paginación de DRF: { count, next, previous, results }
        const list = Array.isArray(data) ? data : data.results || [];
        // Normalizar fechas
        const mapped = list.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          ubicacion: p.ubicacion || '',
          pais: p.pais || '',
          estado: p.estado || 'OPERATIVO',
          fechaCreacion: p.fecha_creacion || (p.fecha_creacion && p.fecha_creacion.split('T')[0]) || new Date().toISOString().split('T')[0],
        }));
        setPlantas(mapped);
      } catch (err) {
        toast.error('No se pudieron cargar las plantas desde la API');
      }
    };
    load();
  }, []);

  const columns: Column<Planta>[] = [
    { key: "id", header: "ID", className: "w-20" },
    { key: "nombre", header: "Nombre" },
    { key: "ubicacion", header: "Ubicación" },
    { key: "pais", header: "País" },
    {
      key: "estado",
      header: "Estado",
      render: (item) => {
        let variant: "default" | "destructive" | "secondary" | "outline" = "outline";
        let label = item.estado || "Otro";
        if (label === "OPERATIVO") {
          variant = "default";
          label = "Operativo";
        } else if (label === "ADVERTENCIA") {
          return <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30" variant="outline">Advertencia</Badge>;
        } else if (label === "CRITICO") {
          variant = "destructive";
          label = "Crítico";
        } else if (label === "OFFLINE") {
          variant = "outline";
          label = "Offline";
        }
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      key: "fechaCreacion",
      header: "Fecha de Creación",
      render: (item) =>
        new Date(item.fechaCreacion).toLocaleDateString("es-ES"),
    },
  ];

  const handleAdd = () => {
    setEditingPlanta(null);
    setIsFormOpen(true);
  };

  const handleEdit = (planta: Planta) => {
    setEditingPlanta(planta);
    setIsFormOpen(true);
  };

  const handleDelete = (planta: Planta) => {
    const doDelete = async () => {
      try {
        const resp = await apiFetch(`/api/v1/fabricas/${planta.id}/`, { method: 'DELETE' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        setPlantas(plantas.filter((p) => p.id !== planta.id));
        toast.success(`Planta "${planta.nombre}" eliminada correctamente`);
      } catch (err) {
        toast.error('Error al eliminar la planta');
      }
    };
    doDelete();
  };

  const handleSubmit = (data: PlantaFormData) => {
    const doSubmit = async () => {
      try {
          if (editingPlanta) {
          const resp = await apiFetch(`/api/v1/fabricas/${editingPlanta.id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: data.nombre, ubicacion: data.ubicacion, pais: data.pais, estado: data.estado }) });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const updated = await resp.json();
          setPlantas(plantas.map((p) => p.id === updated.id ? { ...p, nombre: updated.nombre, ubicacion: updated.ubicacion, pais: updated.pais, estado: updated.estado, fechaCreacion: updated.fecha_creacion || p.fechaCreacion } : p));
          toast.success('Planta actualizada correctamente');
        } else {
          const resp = await apiFetch('/api/v1/fabricas/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: data.nombre, ubicacion: data.ubicacion, pais: data.pais, estado: data.estado }) });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const created = await resp.json();
          const newPlanta: Planta = {
            id: created.id,
            nombre: created.nombre,
            ubicacion: created.ubicacion || '',
            pais: created.pais || '',
            estado: created.estado || 'OPERATIVO',
            fechaCreacion: created.fecha_creacion ? created.fecha_creacion.split('T')[0] : new Date().toISOString().split('T')[0],
          };
          setPlantas([...plantas, newPlanta]);
          toast.success('Planta creada correctamente');
        }
        setEditingPlanta(null);
        setIsFormOpen(false);
      } catch (err) {
        toast.error('Error al guardar la planta');
      }
    };
    doSubmit();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Gestión de Plantas y Fábricas
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra las plantas y fábricas del sistema
        </p>
      </div>

      <TablaGestion
        data={plantas}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Buscar plantas..."
        addButtonLabel="Añadir Planta"
      />

      <FormularioPlanta
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
        initialData={
          editingPlanta
            ? {
                nombre: editingPlanta.nombre,
                ubicacion: editingPlanta.ubicacion,
                pais: editingPlanta.pais,
                estado: editingPlanta.estado,
              }
            : undefined
        }
      />
    </div>
  );
};

export default GestionPlantas;
