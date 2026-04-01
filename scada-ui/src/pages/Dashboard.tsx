import { Factory, Users, Cpu, AlertTriangle, Activity, TrendingUp, Zap, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const stats = [
    {
      title: "Plantas Activas",
      value: "4/5",
      change: "+1 hoy",
      icon: Factory,
      trend: "up",
    },
    {
      title: "Empleados en Turno",
      value: "127",
      change: "+12 vs ayer",
      icon: Users,
      trend: "up",
    },
    {
      title: "Sensores Online",
      value: "342",
      change: "98.5% uptime",
      icon: Cpu,
      trend: "up",
    },
    {
      title: "Alarmas Activas",
      value: "8",
      change: "-3 vs ayer",
      icon: AlertTriangle,
      trend: "down",
    },
  ];

  const plantasResumen = [
    { nombre: "Planta Norte", estado: "operativo", produccion: 87, eficiencia: 94 },
    { nombre: "Planta Central", estado: "advertencia", produccion: 65, eficiencia: 78 },
    { nombre: "Planta Sur", estado: "operativo", produccion: 92, eficiencia: 96 },
    { nombre: "Fábrica Este", estado: "critico", produccion: 23, eficiencia: 45 },
    { nombre: "Fábrica Oeste", estado: "offline", produccion: 0, eficiencia: 0 },
  ];

  const actividadReciente = [
    { mensaje: "Sensor S-102 reconectado", tiempo: "Hace 2 min", tipo: "info" },
    { mensaje: "Alarma crítica resuelta - Planta Este", tiempo: "Hace 15 min", tipo: "success" },
    { mensaje: "Nuevo empleado registrado", tiempo: "Hace 32 min", tipo: "info" },
    { mensaje: "Mantenimiento programado - Planta Norte", tiempo: "Hace 1 hora", tipo: "warning" },
    { mensaje: "Temperatura elevada - Sensor T-045", tiempo: "Hace 2 horas", tipo: "warning" },
  ];

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "operativo":
        return "status-dot-operational";
      case "advertencia":
        return "status-dot-warning";
      case "critico":
        return "status-dot-critical";
      default:
        return "status-dot-offline";
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "operativo":
        return "bg-success/20 text-success border-success/30";
      case "advertencia":
        return "bg-warning/20 text-warning border-warning/30";
      case "critico":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "success":
        return "bg-success/20 text-success";
      case "warning":
        return "bg-warning/20 text-warning";
      case "error":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-primary/20 text-primary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Resumen general del sistema SCADA
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp
                      className={`h-3 w-3 ${
                        stat.trend === "up" ? "text-success" : "text-destructive"
                      }`}
                    />
                    <span
                      className={
                        stat.trend === "up" ? "text-success" : "text-destructive"
                      }
                    >
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resumen de Plantas */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Factory className="h-5 w-5 text-primary" />
              Resumen de Plantas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {plantasResumen.map((planta) => (
                <div
                  key={planta.nombre}
                  className="flex items-center justify-between p-3 rounded-lg scada-panel"
                >
                  <div className="flex items-center gap-3">
                    <div className={`status-dot ${getEstadoColor(planta.estado)}`} />
                    <div>
                      <p className="font-medium text-foreground">{planta.nombre}</p>
                      <Badge
                        variant="outline"
                        className={`${getEstadoBadge(planta.estado)} mt-1 text-xs`}
                      >
                        {planta.estado.charAt(0).toUpperCase() + planta.estado.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Producción</p>
                      <div className="flex items-center gap-2">
                        <Progress value={planta.produccion} className="w-20 h-2" />
                        <span className="text-sm font-mono text-foreground">
                          {planta.produccion}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Eficiencia</p>
                      <span className="text-sm font-mono text-foreground">
                        {planta.eficiencia}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Activity className="h-5 w-5 text-primary" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {actividadReciente.map((actividad, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      actividad.tipo === "success"
                        ? "bg-success"
                        : actividad.tipo === "warning"
                        ? "bg-warning"
                        : "bg-primary"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {actividad.mensaje}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {actividad.tiempo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                <Activity className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Producción Total Hoy</p>
                <p className="text-2xl font-bold text-foreground">12,450</p>
                <p className="text-xs text-success">unidades producidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Consumo Energético</p>
                <p className="text-2xl font-bold text-foreground">9,620</p>
                <p className="text-xs text-muted-foreground">kWh total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eficiencia Global</p>
                <p className="text-2xl font-bold text-foreground">87.3%</p>
                <p className="text-xs text-success">+2.1% vs semana pasada</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
