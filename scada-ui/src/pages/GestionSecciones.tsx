import { useState, useEffect } from "react";
import { toast } from "sonner";
import TablaGestion, { Column } from "@/components/TablaGestion";
import apiFetch from "@/lib/api";
import FormularioSeccion, { SeccionFormData } from "@/components/FormularioSeccion";

interface Seccion {
  id: number;
  nombre: string;
  fabrica: number;
  fabrica_nombre?: string;
  capacidad_trabajadores: number;
  tamano_seccion: number;
}

const GestionSecciones = () => {
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Seccion | null>(null);

  const load = async () => {
    try {
      const resp = await apiFetch('/api/v1/secciones/?page_size=500');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const list = Array.isArray(data) ? data : data.results || [];
      setSecciones(list.map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        fabrica: s.fabrica,
        fabrica_nombre: s.fabrica_nombre || s.fabrica_nombre || '',
        capacidad_trabajadores: s.capacidad_trabajadores || 0,
        tamano_seccion: s.tamano_seccion || 0,
      })));
    } catch (err) {
      toast.error('No se pudieron cargar las secciones');
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = () => { setEditing(null); setIsFormOpen(true); };

  const handleEdit = (item: Seccion) => { setEditing(item); setIsFormOpen(true); };

  const handleDelete = (item: Seccion) => {
    const doDelete = async () => {
      try {
        const resp = await apiFetch(`/api/v1/secciones/${item.id}/`, { method: 'DELETE' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        setSecciones(secciones.filter((s) => s.id !== item.id));
        toast.success(`Sección "${item.nombre}" eliminada`);
      } catch (err) {
        toast.error('Error al eliminar la sección');
      }
    };
    doDelete();
  };

  const handleSubmit = (data: SeccionFormData) => {
    const doSubmit = async () => {
      try {
        if (editing) {
          const resp = await apiFetch(`/api/v1/secciones/${editing.id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const updated = await resp.json();
          setSecciones(secciones.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
          toast.success('Sección actualizada correctamente');
        } else {
          const resp = await apiFetch('/api/v1/secciones/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const created = await resp.json();
          setSecciones([...secciones, {
            id: created.id,
            nombre: created.nombre,
            fabrica: created.fabrica,
            fabrica_nombre: created.fabrica_nombre || '',
            capacidad_trabajadores: created.capacidad_trabajadores || 0,
            tamano_seccion: created.tamano_seccion || 0,
          }]);
          toast.success('Sección creada correctamente');
        }
        setEditing(null);
        setIsFormOpen(false);
      } catch (err) {
        toast.error('Error guardando la sección');
      }
    };
    doSubmit();
  };

  const columns: Column<Seccion>[] = [
    { key: 'id', header: 'ID', className: 'w-16' },
    { key: 'nombre', header: 'Nombre' },
    { key: 'fabrica_nombre', header: 'Fábrica' },
    { key: 'capacidad_trabajadores', header: 'Capacidad' },
    { key: 'tamano_seccion', header: 'Tamaño (m²)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Gestión de Secciones</h1>
        <p className="text-muted-foreground mt-1">Administra las secciones vinculadas a las fábricas</p>
      </div>

      <TablaGestion
        data={secciones}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Buscar secciones..."
        addButtonLabel="Añadir Sección"
      />

      <FormularioSeccion
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
        initialData={editing ? {
          nombre: editing.nombre,
          fabrica: String(editing.fabrica),
          capacidad_trabajadores: String(editing.capacidad_trabajadores),
          tamano_seccion: String(editing.tamano_seccion),
        } : undefined}
      />
    </div>
  );
};

export default GestionSecciones;
