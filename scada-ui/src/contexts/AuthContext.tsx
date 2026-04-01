import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type RolUsuario = 'Operador' | 'Jefe de Sector' | 'Administrador';

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  rol: RolUsuario;
}

export interface AuditLog {
  id: string;
  usuario: string;
  accion: string;
  objetoAfectado: string;
  fechaHora: string;
  modulo: string;
}

interface AuthContextType {
  usuario: UsuarioAutenticado | null;
  isAuthenticated: boolean;
  login: (usuario: UsuarioAutenticado) => void;
  logout: () => void;
  isAdmin: boolean;
  auditLogs: AuditLog[];
  addAuditLog: (log: Omit<AuditLog, 'id' | 'fechaHora'>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const login = (user: UsuarioAutenticado) => {
    setUsuario(user);
    addAuditLog({
      usuario: user.nombre,
      accion: 'Inicio de Sesión',
      objetoAfectado: `Usuario ${user.nombre}`,
      modulo: 'Autenticación',
    });
  };

  const logout = () => {
    if (usuario) {
      addAuditLog({
        usuario: usuario.nombre,
        accion: 'Cierre de Sesión',
        objetoAfectado: `Usuario ${usuario.nombre}`,
        modulo: 'Autenticación',
      });
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
        isAdmin: usuario?.rol === 'Administrador',
        auditLogs,
        addAuditLog,
      }}
    >
      {children}
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
