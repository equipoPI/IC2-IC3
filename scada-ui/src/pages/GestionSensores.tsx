import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import TablaGestion, { Column } from "@/components/TablaGestion";
import FormularioSensor, { SensorFormData } from "@/components/FormularioSensor";

interface Sensor {
  id: number;
  numeroSerie: string;
  nombre: string;
  categoria: string;
  inventarioAsignado: string;
  seccion: string;
}

const sensoresIniciales: Sensor[] = [
  {
    id: 1,
    numeroSerie: "SN-2024-0001",
    nombre: "Sensor Temp. Horno 1",
    categoria: "Sensor de Temperatura",
    inventarioAsignado: "Planta Norte - INV001",
    seccion: "Producción",
  },
  {
    id: 2,
    numeroSerie: "SN-2024-0002",
    nombre: "Sensor Presión Tanque A",
    categoria: "Sensor de Presión",
    inventarioAsignado: "Planta Central - INV002",
    seccion: "Control de Calidad",
  },
  {
    id: 3,
    numeroSerie: "SN-2023-0045",
    nombre: "Bomba Principal P1",
    categoria: "Bomba",
    inventarioAsignado: "Planta Sur - INV003",
    seccion: "Producción",
  },
  {
    id: 4,
    numeroSerie: "SN-2024-0003",
    nombre: "Motor Línea 2",
    categoria: "Motor",
    inventarioAsignado: "Fábrica Este - INV004",
    seccion: "Empaque",
  },
  {
    id: 5,
    numeroSerie: "SN-2022-0128",
    nombre: "PLC Control Central",
    categoria: "PLC",
    inventarioAsignado: "Planta Norte - INV001",
    seccion: "Mantenimiento",
  },
  {
    id: 6,
    numeroSerie: "SN-2024-0004",
    nombre: "Válvula Reguladora V3",
    categoria: "Válvula",
    inventarioAsignado: "Planta Central - INV002",
    seccion: "Producción",
  },
];

const getCategoriaColor = (categoria: string) => {
  const colors: Record<string, string> = {
    "Sensor de Temperatura": "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "Sensor de Presión": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "Sensor de Flujo": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    Motor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Bomba: "bg-green-500/20 text-green-400 border-green-500/30",
    Válvula: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    PLC: "bg-red-500/20 text-red-400 border-red-500/30",
    HMI: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  };
  return colors[categoria] || "bg-muted text-muted-foreground";
};

const GestionSensores = () => {
  const [sensores, setSensores] = useState<Sensor[]>(sensoresIniciales);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);

  const columns: Column<Sensor>[] = [
    {
      key: "numeroSerie",
      header: "Número de Serie",
      className: "font-mono",
    },
    { key: "nombre", header: "Nombre" },
    {
      key: "categoria",
      header: "Categoría",
      render: (item) => (
        <Badge variant="outline" className={getCategoriaColor(item.categoria)}>
          {item.categoria}
        </Badge>
      ),
    },
    { key: "inventarioAsignado", header: "Inventario Asignado" },
    { key: "seccion", header: "Sección" },
  ];

  const handleAdd = () => {
    setEditingSensor(null);
    setIsFormOpen(true);
  };

  const handleEdit = (sensor: Sensor) => {
    setEditingSensor(sensor);
    setIsFormOpen(true);
  };

  const handleDelete = (sensor: Sensor) => {
    setSensores(sensores.filter((s) => s.id !== sensor.id));
    toast.success(`Sensor "${sensor.nombre}" eliminado correctamente`);
  };

  const handleSubmit = (data: SensorFormData) => {
    if (editingSensor) {
      setSensores(
        sensores.map((s) =>
          s.id === editingSensor.id
            ? { ...s, ...data }
            : s
        )
      );
      toast.success("Sensor/Máquina actualizado correctamente");
    } else {
      const newSensor: Sensor = {
        id: Math.max(...sensores.map((s) => s.id)) + 1,
        ...data,
      };
      setSensores([...sensores, newSensor]);
      toast.success("Sensor/Máquina creado correctamente");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Gestión de Sensores y Máquinas
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra el inventario de sensores y equipos industriales
        </p>
      </div>

      <TablaGestion
        data={sensores}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Buscar sensores o máquinas..."
        addButtonLabel="Añadir Sensor/Máquina"
      />

      <FormularioSensor
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
        initialData={
          editingSensor
            ? {
                numeroSerie: editingSensor.numeroSerie,
                nombre: editingSensor.nombre,
                categoria: editingSensor.categoria,
                inventarioAsignado: editingSensor.inventarioAsignado,
                seccion: editingSensor.seccion,
              }
            : undefined
        }
      />
    </div>
  );
};

export default GestionSensores;
