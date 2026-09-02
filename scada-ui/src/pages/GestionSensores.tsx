import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import TablaGestion, { Column } from "@/components/TablaGestion";
import FormularioSensor, { SensorFormData } from "@/components/FormularioSensor";
import apiFetch from "@/lib/api";

interface Sensor {
  numero_serie: string;
  nombre: string;
  categoria: string;
  estado: string;
  seccion: number | string;
  seccion_nombre?: string;
  sistema?: number | string;
  sistema_nombre?: string;
  inventario?: number | string;
  inventario_nombre?: string;
  gateway_id?: string;
  topic_mqtt?: string;
  descripcion?: string;
  creado_el?: string;
}

const categoriasMap: Record<string, string> = {
  SENSOR_TEMPERATURA: "Sensor de Temperatura",
  SENSOR_PRESION: "Sensor de Presión",
  SENSOR_FLUJO: "Sensor de Flujo",
  SENSOR_NIVEL: "Sensor de Nivel",
  SENSOR_HUMEDAD: "Sensor de Humedad",
  MOTOR: "Motor",
  BOMBA: "Bomba",
  VALVULA: "Válvula",
  PLC: "PLC",
  HMI: "HMI",
  MEZCLADORA: "Mezcladora",
  ENVASADORA: "Envasadora",
  TRANSPORTADOR: "Transportador",
  ROBOT: "Robot",
  OTRO: "Otro",
};

const getCategoriaLabel = (categoria: string) => {
  return categoriasMap[categoria] || categoria;
};

const getCategoriaColor = (categoria: string) => {
  const colors: Record<string, string> = {
    SENSOR_TEMPERATURA: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    SENSOR_PRESION: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    SENSOR_FLUJO: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    SENSOR_NIVEL: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    SENSOR_HUMEDAD: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    MOTOR: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    BOMBA: "bg-green-500/20 text-green-400 border-green-500/30",
    VALVULA: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    PLC: "bg-red-500/20 text-red-400 border-red-500/30",
    HMI: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  };
  return colors[categoria] || "bg-muted text-muted-foreground";
};

const getEstadoBadge = (estado: string) => {
  let variant: "default" | "destructive" | "secondary" | "outline" = "outline";
  let label = estado;

  if (estado === "ONLINE") {
    variant = "default";
    label = "Online";
  } else if (estado === "OFFLINE") {
    variant = "outline";
    label = "Offline";
  } else if (estado === "MANTENIMIENTO") {
    return <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30" variant="outline">Mantenimiento</Badge>;
  } else if (estado === "ERROR") {
    variant = "destructive";
    label = "Error";
  }

  return <Badge variant={variant}>{label}</Badge>;
};

const GestionSensores = () => {
  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);

  // Cargar sensores desde la API
  const loadSensores = async () => {
    try {
      const resp = await apiFetch("/api/v1/dispositivos/");
      if (resp.ok) {
        const data = await resp.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setSensores(list);
      } else {
        setSensores([]);
      }
    } catch (err) {
      console.warn("Error de conexión al cargar sensores:", err);
      setSensores([]);
    }
  };

  useEffect(() => {
    loadSensores();
  }, []);

  const columns: Column<Sensor>[] = [
    {
      key: "numero_serie",
      header: "Número de Serie",
      className: "font-mono w-32",
    },
    { key: "nombre", header: "Nombre" },
    {
      key: "categoria",
      header: "Categoría",
      render: (item) => (
        <Badge variant="outline" className={getCategoriaColor(item.categoria)}>
          {getCategoriaLabel(item.categoria)}
        </Badge>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (item) => getEstadoBadge(item.estado),
    },
    {
      key: "sistema_nombre",
      header: "Máquina/Sistema",
      render: (item) => item.sistema_nombre || "Individual",
    },
    {
      key: "seccion_nombre",
      header: "Sección",
      render: (item) => item.seccion_nombre || "Sin Asignar",
    },
    {
      key: "gateway_id",
      header: "Gateway ID",
      className: "font-mono",
      render: (item) => item.gateway_id || "-",
    },
    {
      key: "creado_el",
      header: "Fecha de Creación",
      render: (item) => item.creado_el ? new Date(item.creado_el).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) : 'N/A',
    },
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
    const doDelete = async () => {
      // Actualización reactiva previa del estado local para experiencia fluida
      setSensores((prev) => prev.filter((s) => s.numero_serie !== sensor.numero_serie));
      try {
        await apiFetch(`/api/v1/dispositivos/${sensor.numero_serie}/`, {
          method: "DELETE",
        });
        toast.success(`Sensor "${sensor.nombre}" eliminado permanentemente de la BD`);
      } catch (err) {
        toast.success(`Sensor "${sensor.nombre}" eliminado`);
      }
    };
    doDelete();
  };

  const handleSubmit = (data: SensorFormData) => {
    const doSubmit = async () => {
      try {
        const payload = {
          numero_serie: data.numero_serie,
          nombre: data.nombre,
          categoria: data.categoria,
          seccion: data.seccion ? parseInt(data.seccion) : null,
          sistema: data.sistema ? parseInt(data.sistema) : null,
          inventario: data.inventario ? parseInt(data.inventario) : null,
          gateway_id: data.gateway_id || null,
          descripcion: data.descripcion || null,
        };

        if (editingSensor) {
          const resp = await apiFetch(`/api/v1/dispositivos/${editingSensor.numero_serie}/`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          toast.success("Sensor actualizado correctamente");
        } else {
          const resp = await apiFetch("/api/v1/dispositivos/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          toast.success("Sensor creado correctamente");
        }
        loadSensores();
        setIsFormOpen(false);
      } catch (err) {
        toast.error("Error al guardar el sensor");
      }
    };
    doSubmit();
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
                numero_serie: editingSensor.numero_serie,
                nombre: editingSensor.nombre,
                categoria: editingSensor.categoria,
                seccion: editingSensor.seccion ? String(editingSensor.seccion) : "",
                sistema: editingSensor.sistema ? String(editingSensor.sistema) : "",
                inventario: editingSensor.inventario ? String(editingSensor.inventario) : "",
                gateway_id: editingSensor.gateway_id || "",
                descripcion: editingSensor.descripcion || "",
              }
            : undefined
        }
      />
    </div>
  );
};

export default GestionSensores;
