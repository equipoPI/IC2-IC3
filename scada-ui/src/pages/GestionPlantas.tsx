import { useState, useEffect } from "react";
import { toast } from "sonner";
import TablaGestion, { Column } from "@/components/TablaGestion";
import FormularioPlanta, { PlantaFormData } from "@/components/FormularioPlanta";
import FabricasDashboard from "@/components/FabricasDashboard"; 

interface Planta {
  id: number;
  nombre: string;
  ubicacion: string;
  pais: string;
  fecha_creacion: string; 
}

const GestionPlantas = () => {
  const [plantas, setPlantas] = useState<Planta[]>([]);
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

  // DELETE: Borrar planta en la base de datos
  const handleDelete = async (planta: Planta) => {
    try {
      const response = await fetch(`http://localhost:8000/polls/api/fabricas/${planta.id}/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPlantas(plantas.filter((p) => p.id !== planta.id));
        toast.success(`Planta "${planta.nombre}" eliminada correctamente`);
      } else {
        toast.error("Error al eliminar la planta en el servidor");
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      toast.error("Error de conexión con el servidor");
    }
  };

  // POST / PUT: Crear o actualizar planta
  const handleSubmit = async (data: PlantaFormData) => {
    if (editingPlanta) {
      // Editar (PUT)
      try {
        const payload = {
          ...editingPlanta,
          nombre: data.nombre,
          ubicacion: data.ubicacion,
          pais: data.pais,
        };

        const response = await fetch(`http://localhost:8000/polls/api/fabricas/${editingPlanta.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const updatedPlanta = await response.json();
          setPlantas(plantas.map((p) => (p.id === editingPlanta.id ? updatedPlanta : p)));
          toast.success("Planta actualizada correctamente");
          setIsFormOpen(false); // Cerramos el modal
        } else {
          toast.error("Error al actualizar la planta");
        }
      } catch (error) {
        console.error("Error al actualizar:", error);
        toast.error("Error de conexión con el servidor");
      }
    } else {
      // Crear (POST)
      try {
        const payload = {
          nombre: data.nombre,
          ubicacion: data.ubicacion,
          pais: data.pais,
          estado: 'OPERATIVO', // Estado por defecto para las nuevas
        };

        const response = await fetch('http://localhost:8000/polls/api/fabricas/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const newPlanta = await response.json();
          setPlantas([...plantas, newPlanta]);
          toast.success("Planta creada correctamente");
          setIsFormOpen(false); // Cerramos el modal
        } else {
          toast.error("Error al crear la planta. Verificá que el nombre no exista ya.");
        }
      } catch (error) {
        console.error("Error al crear:", error);
        toast.error("Error de conexión con el servidor");
      }
    }
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