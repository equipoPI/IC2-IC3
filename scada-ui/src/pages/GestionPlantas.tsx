import { useState, useEffect } from "react";
import { toast } from "sonner";
import TablaGestion, { Column } from "@/components/TablaGestion";
import FormularioPlanta, { PlantaFormData } from "@/components/FormularioPlanta";
import FabricasDashboard from "@/components/FabricasDashboard"; 
import apiFetch from "@/lib/api";

interface Planta {
  id: number;
  nombre: string;
  ubicacion: string;
  pais: string;
  fecha_creacion: string; 
}

// Inicio con lista vacía; cargaremos desde la API
const plantillasFallback: Planta[] = [];

const GestionPlantas = () => {
  const [plantas, setPlantas] = useState<Planta[]>(plantillasFallback);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlanta, setEditingPlanta] = useState<Planta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // GET: Traer las plantas al cargar la pantalla
  useEffect(() => {
    fetch('http://localhost:8000/polls/api/fabricas/')
      .then(res => res.json())
      .then(data => {
        setPlantas(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error al cargar las plantas en la tabla:", err);
        toast.error("Error al conectar con la base de datos");
        setIsLoading(false);
      });
  }, []);

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
        // Normalizar fechas
        const mapped = data.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          ubicacion: p.ubicacion || '',
          pais: p.pais || '',
          fecha_creacion: p.fecha_creacion || (p.fecha_creacion && p.fecha_creacion.split('T')[0]) || new Date().toISOString().split('T')[0],
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
    { 
      key: "ubicacion", 
      header: "Ubicación",
      render: (item) => item.ubicacion || "Sin especificar" 
    },
    { key: "pais", header: "País" },
    {
      key: "fecha_creacion",
      header: "Fecha de Creación",
      render: (item) =>
        item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString("es-ES") : "-",
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
          const resp = await apiFetch(`/api/v1/fabricas/${editingPlanta.id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: data.nombre, ubicacion: data.ubicacion, pais: data.pais }) });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const updated = await resp.json();
          setPlantas(plantas.map((p) => p.id === updated.id ? { ...p, nombre: updated.nombre, ubicacion: updated.ubicacion, pais: updated.pais, fecha_creacion: updated.fecha_creacion || p.fecha_creacion } : p));
          toast.success('Planta actualizada correctamente');
        } else {
          const resp = await apiFetch('/api/v1/fabricas/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: data.nombre, ubicacion: data.ubicacion, pais: data.pais }) });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const created = await resp.json();
          const newPlanta: Planta = {
            id: created.id,
            nombre: created.nombre,
            ubicacion: created.ubicacion || '',
            pais: created.pais || '',
            fecha_creacion: created.fecha_creacion ? created.fecha_creacion.split('T')[0] : new Date().toISOString().split('T')[0],
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Gestión de Plantas y Fábricas
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra y monitorea las plantas del sistema
        </p>
      </div>

      <section>
        <h2 className="text-lg font-medium text-foreground mb-4">
          Monitor SCADA (Hardware/Operativo)
        </h2>
        <FabricasDashboard />
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-lg font-medium text-foreground mb-4">
          Directorio Administrativo (Base de Datos Real)
        </h2>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">
            Cargando directorio...
          </div>
        ) : (
          <TablaGestion
            data={plantas}
            columns={columns}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            searchPlaceholder="Buscar plantas..."
            addButtonLabel="Añadir Planta"
          />
        )}
      </section>

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
                estado: "Operativo",
              }
            : undefined
        }
      />
    </div>
  );
};

export default GestionPlantas;