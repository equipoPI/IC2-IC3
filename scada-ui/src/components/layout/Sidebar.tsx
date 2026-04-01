import { NavLink } from "react-router-dom";
import {
  Users,
  Factory,
  Cpu,
  Monitor,
  LayoutDashboard,
  Calendar,
  Bell,
  FileText,
  ClipboardList,
  ChevronLeft,
  Activity,
  ChevronDown,
  Wifi,
  Database,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const [openGroups, setOpenGroups] = useState<string[]>(["Producción y Control"]);
  const { isAdmin } = useAuth();

  const menuGroups = [
    {
      title: "Principal",
      items: [
        { title: "Dashboard", icon: LayoutDashboard, path: "/" },
      ],
    },
    {
      title: "Gestión Central",
      items: [
        { title: "Gestión de Empleados", icon: Users, path: "/empleados" },
        { title: "Gestión de Plantas y Fábricas", icon: Factory, path: "/plantas" },
        { title: "Gestión de Sensores y Máquinas", icon: Cpu, path: "/sensores" },
        { title: "Administración de Almacenamiento", icon: Database, path: "/almacenamiento" },
      ],
    },
    {
      title: "Producción y Control",
      collapsible: true,
      items: [
        { title: "Planificación de la Producción", icon: Calendar, path: "/planificacion" },
        { title: "Gestión de Plantillas (Recetas)", icon: FileText, path: "/plantillas" },
      ],
    },
    {
      title: "Monitoreo y Auditoría",
      items: [
        { title: "Monitorización de Plantas", icon: Monitor, path: "/monitorizacion" },
        { title: "Visualización SCADA", icon: Activity, path: "/scada" },
        { title: "Gestión de Alarmas y Notificaciones", icon: Bell, path: "/alarmas" },
        { title: "Auditoría y Registro de Actividades", icon: ClipboardList, path: "/auditoria" },
      ],
    },
    {
      title: "Comunicación",
      items: [
        { title: "Configuración MQTT", icon: Wifi, path: "/comunicacion" },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: "Administración",
            items: [
              { title: "Panel de Control de Admin", icon: ShieldCheck, path: "/admin" },
            ],
          },
        ]
      : []),
  ];

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-72 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 lg:hidden">
            <span className="text-sm font-medium text-sidebar-foreground">Navegación</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-sidebar-foreground">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            {menuGroups.map((group) => (
              <div key={group.title} className="mb-4">
                {group.collapsible ? (
                  <Collapsible
                    open={openGroups.includes(group.title)}
                    onOpenChange={() => toggleGroup(group.title)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                      <span>{group.title}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          openGroups.includes(group.title) && "rotate-180"
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="space-y-1 px-3 mt-1">
                        {group.items.map((item) => (
                          <li key={item.path}>
                            <NavLink
                              to={item.path}
                              onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                              className={({ isActive }) =>
                                cn(
                                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                                  isActive
                                    ? "bg-sidebar-accent text-sidebar-primary glow-primary"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                )
                              }
                            >
                              <item.icon className="h-5 w-5 flex-shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <>
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </div>
                    <ul className="space-y-1 px-3">
                      {group.items.map((item) => (
                        <li key={item.path}>
                          <NavLink
                            to={item.path}
                            onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-primary glow-primary"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              )
                            }
                          >
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <div className="scada-panel p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="status-dot status-dot-operational" />
                <span className="text-xs font-medium text-foreground">Sistema Operativo</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Última sincronización: 14:32:05</p>
                <p>Conexiones activas: 47</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
