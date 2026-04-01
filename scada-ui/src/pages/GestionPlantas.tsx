import { useState } from "react";
import { toast } from "sonner";
import TablaGestion, { Column } from "@/components/TablaGestion";
import FormularioPlanta, { PlantaFormData } from "@/components/FormularioPlanta";

interface Planta {
  id: number;
  nombre: string;
  ubicacion: string;
  pais: string;
  fechaCreacion: string;
}

const plantasIniciales: Planta[] = [
  {
    id: 1,
    nombre: "Planta Norte",
    ubicacion: "Polígono Industrial Norte, Nave 12",
    pais: "España",
    fechaCreacion: "2020-03-15",
  },
  {
    id: 2,
    nombre: "Planta Central",
    ubicacion: "Av. Industrial 456, Centro",
    pais: "México",
    fechaCreacion: "2019-07-22",
  },
  {
    id: 3,
    nombre: "Planta Sur",
    ubicacion: "Zona Franca Sur, Módulo 8",
    pais: "España",
    fechaCreacion: "2021-01-10",
  },
  {
    id: 4,
    nombre: "Fábrica Este",
    ubicacion: "Parque Tecnológico Este",
    pais: "Argentina",
    fechaCreacion: "2022-05-18",
  },
  {
    id: 5,
    nombre: "Fábrica Oeste",
    ubicacion: "Complejo Industrial Oeste",
    pais: "Chile",
    fechaCreacion: "2023-02-28",
  },
];

const GestionPlantas = () => {
  const [plantas, setPlantas] = useState<Planta[]>(plantasIniciales);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlanta, setEditingPlanta] = useState<Planta | null>(null);

  const columns: Column<Planta>[] = [
    { key: "id", header: "ID", className: "w-20" },
    { key: "nombre", header: "Nombre" },
    { key: "ubicacion", header: "Ubicación" },
    { key: "pais", header: "País" },
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
    setPlantas(plantas.filter((p) => p.id !== planta.id));
    toast.success(`Planta "${planta.nombre}" eliminada correctamente`);
  };

  const handleSubmit = (data: PlantaFormData) => {
    if (editingPlanta) {
      setPlantas(
        plantas.map((p) =>
          p.id === editingPlanta.id
            ? { ...p, ...data }
            : p
        )
      );
      toast.success("Planta actualizada correctamente");
    } else {
      const newPlanta: Planta = {
        id: Math.max(...plantas.map((p) => p.id)) + 1,
        nombre: data.nombre,
        ubicacion: data.ubicacion,
        pais: data.pais,
        fechaCreacion: new Date().toISOString().split("T")[0],
      };
      setPlantas([...plantas, newPlanta]);
      toast.success("Planta creada correctamente");
    }
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
                estado: "Operativo",
              }
            : undefined
        }
      />
    </div>
  );
};

export default GestionPlantas;
