import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import apiFetch from '@/lib/api';

export type RolUsuario = 'Operador' | 'Jefe de Sector' | 'Administrador';

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  first_name?: string;
  last_name?: string;
  rol: RolUsuario;
  username?: string;
  email?: string;
}

export interface AuditLog {
  id: string;
  usuario: string;
  accion: string;
  objetoAfectado: string;
  fechaHora: string;
  modulo: string;
}

// Deriva el rol desde `empleado.rango` si está disponible,
// con fallback a `profile.role` para compatibilidad antigua.
export const deriveRol = (u: any): RolUsuario => {
  try {
    const rango = u?.empleado?.rango || u?.profile?.rango || '';
    if (rango) {
      const r = String(rango);
      if (r === '8') return 'Administrador';
      if (['1', '2', '3'].includes(r)) return 'Jefe de Sector';
      return 'Operador';
    }
    const role = u?.profile?.role || '';
    if (role === 'admin') return 'Administrador';
    if (role === 'manager') return 'Jefe de Sector';
    return 'Operador';
  } catch (e) {
    return 'Operador';
  }
};

interface AuthContextType {
  usuario: UsuarioAutenticado | null;
  isAuthenticated: boolean;
  login: (usuario: UsuarioAutenticado) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  auditLogs: AuditLog[];
  addAuditLog: (log: Omit<AuditLog, 'id' | 'fechaHora'>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Al montar, comprobar si existe una sesión válida en el backend
    const check = async () => {
      try {
        const resp = await apiFetch('/api/v1/auth/user/');
        if (resp.ok) {
          const u = await resp.json();
          const first_name = u.first_name || '';
          const last_name = u.last_name || '';
          const nombre = `${first_name} ${last_name}`.trim() || u.username || u.email || '';
          const rol = deriveRol(u);
          setUsuario({ id: String(u.id), nombre, first_name, last_name, rol, username: u.username, email: u.email });
        }
      } catch (e) {
        // silencioso
      } finally {
        setInitialized(true);
      }
    };
    check();
  }, []);

  const refreshUser = async () => {
    try {
      const resp = await apiFetch('/api/v1/auth/user/');
      if (resp.ok) {
        const u = await resp.json();
        const first_name = u.first_name || '';
        const last_name = u.last_name || '';
        const nombre = `${first_name} ${last_name}`.trim() || u.username || u.email || '';
        const rol = deriveRol(u);
        setUsuario({ id: String(u.id), nombre, first_name, last_name, rol, username: u.username, email: u.email });
      } else {
        setUsuario(null);
      }
    } catch (e) {
      // silencioso
    }
  };

  const login = (user: UsuarioAutenticado) => {
    setUsuario(user);
    addAuditLog({
      usuario: user.nombre,
      accion: 'Inicio de Sesión',
      objetoAfectado: `Usuario ${user.nombre}`,
      modulo: 'Autenticación',
    });
  };

  const logout = async () => {
    if (usuario) {
      addAuditLog({
        usuario: usuario.nombre,
        accion: 'Cierre de Sesión',
        objetoAfectado: `Usuario ${usuario.nombre}`,
        modulo: 'Autenticación',
      });
    }
    try {
      // Invalidar la sesión en el backend; si no se hace, la cookie de sesión
      // sigue siendo válida y una recarga vuelve a autenticar al usuario.
      await apiFetch('/api/v1/auth/logout/', { method: 'POST' });
    } catch (e) {
      // silencioso
    }
    setUsuario(null);
  };

  const addAuditLog = useCallback((log: Omit<AuditLog, 'id' | 'fechaHora'>) => {
    const newLog: AuditLog = {
      ...log,
      id: `LOG-${Date.now()}`,
      fechaHora: new Date().toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        isAuthenticated: !!usuario,
        login,
        logout,
        refreshUser,
        isAdmin: usuario?.rol === 'Administrador',
        auditLogs,
        addAuditLog,
      }}
    >
      {initialized ? children : null}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
