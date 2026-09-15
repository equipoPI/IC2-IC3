import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'warning' | 'success' | 'error';
  fechaHora: string;
  leida: boolean;
}

interface NotificationsContextType {
  notificaciones: Notificacion[];
  noLeidas: number;
  addNotificacion: (notif: Omit<Notificacion, 'id' | 'fechaHora' | 'leida'>) => void;
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: () => void;
  limpiarNotificaciones: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  const addNotificacion = useCallback((notif: Omit<Notificacion, 'id' | 'fechaHora' | 'leida'>) => {
    const nueva: Notificacion = {
      ...notif,
      id: `NOTIF-${Date.now()}`,
      fechaHora: new Date().toLocaleString('es-ES', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }),
      leida: false,
    };
    setNotificaciones((prev) => [nueva, ...prev]);
    toast({
      title: notif.titulo,
      description: notif.mensaje,
      variant: notif.tipo === 'error' ? 'destructive' : 'default',
    });
  }, []);

  const marcarLeida = useCallback((id: string) => {
    setNotificaciones((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
  }, []);

  const marcarTodasLeidas = useCallback(() => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  }, []);

  const limpiarNotificaciones = useCallback(() => {
    setNotificaciones([]);
  }, []);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  return (
    <NotificationsContext.Provider value={{ notificaciones, noLeidas, addNotificacion, marcarLeida, marcarTodasLeidas, limpiarNotificaciones }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
