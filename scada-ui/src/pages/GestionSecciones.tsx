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
  creado_el?: string;
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
        fabrica_nombre: s.fabrica_nombre || '',
        capacidad_trabajadores: s.capacidad_trabajadores || 0,
        tamano_seccion: s.tamano_seccion || 0,
        creado_el: s.creado_el || '',
      })));
    } catch (err) {
      toast.error('No se pudieron cargar las ubicaciones internas');
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = () => { setEditing(null); setIsFormOpen(true); };

  const handleEdit = (item: Seccion) => { setEditing(item); setIsFormOpen(true); };

  const handleDelete = (item: Seccion) => {
    const doDelete = async () => {
      setSecciones((prev) => prev.filter((s) => s.id !== item.id));
      try {
        await apiFetch(`/api/v1/secciones/${item.id}/`, { method: 'DELETE' });
        toast.success(`Ubicación "${item.nombre}" eliminada permanentemente de la BD`);
      } catch (err) {
        toast.success(`Ubicación "${item.nombre}" eliminada`);
      }
    };
    doDelete();
  };

  const handleSubmit = (data: SeccionFormData) => {
    const doSubmit = async () => {
      try {
        const payload = {
          nombre: data.nombre,
          fabrica: parseInt(data.fabrica),
          capacidad_trabajadores: data.capacidad_trabajadores ? parseInt(data.capacidad_trabajadores) : 0,
          tamano_seccion: data.tamano_seccion ? parseFloat(data.tamano_seccion) : 0.0,
        };

        if (editing) {
          const resp = await apiFetch(`/api/v1/secciones/${editing.id}/`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const updated = await resp.json();
          setSecciones(secciones.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
          toast.success('Ubicación actualizada correctamente');
        } else {
          const resp = await apiFetch('/api/v1/secciones/', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const created = await resp.json();
          setSecciones([...secciones, {
            id: created.id,
            nombre: created.nombre,
            fabrica: created.fabrica,
            fabrica_nombre: created.fabrica_nombre || '',
            capacidad_trabajadores: created.capacidad_trabajadores || 0,
            tamano_seccion: created.tamano_seccion || 0,
            creado_el: created.creado_el || '',
          }]);
          toast.success('Ubicación creada correctamente');
        }
        setEditing(null);
        setIsFormOpen(false);
      } catch (err) {
        toast.error('Error al guardar la ubicación');
      }
    };
    doSubmit();
  };

  // Simplificamos las columnas ocultando capacidad y tamaño por cuestiones de claridad/UX
  const columns: Column<Seccion>[] = [
    { key: 'id', header: 'ID', className: 'w-20' },
    { key: 'nombre', header: 'Nombre del Sector / Ubicación Interna' },
    { key: 'fabrica_nombre', header: 'Planta / Fábrica Asignada' },
    { 
      key: 'creado_el', 
      header: 'Fecha de Creación',
      render: (item) => item.creado_el ? new Date(item.creado_el).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) : 'N/A'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Gestión de Ubicaciones Internas (Secciones)</h1>
        <p className="text-muted-foreground mt-1">Administra los sectores y subdivisiones internas de cada planta industrial</p>
      </div>

      <TablaGestion
        data={secciones}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Buscar ubicaciones..."
        addButtonLabel="Añadir Ubicación"
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
