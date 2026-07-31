import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Activity, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, RolUsuario } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Login = () => {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  // El rol es interno y lo asigna el admin; por defecto local usamos 'Operador'
  const [rol] = useState<RolUsuario>("Operador");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Obtener csrf si existe
      const getCookie = (name: string) => {
        const matches = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return matches ? decodeURIComponent(matches[1]) : null;
      };
      const csrftoken = getCookie('csrftoken');

      const headers: any = { 'Content-Type': 'application/json' };
      if (csrftoken) headers['X-CSRFToken'] = csrftoken;

      const payload: any = { password: contrasena };
      // Enviar como `email` si el campo parece un correo, sino como `username`
      if (/^.+@.+\..+$/.test(usuario)) payload.email = usuario;
      else payload.username = usuario;

      const resp = await fetch('/api/v1/auth/login/', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        const msg = err?.detail || (err && JSON.stringify(err)) || 'Credenciales inválidas';
        toast({ title: 'Error de autenticación', description: String(msg), variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Obtener datos del usuario autenticado
      const userResp = await fetch('/api/v1/auth/user/', { credentials: 'include' });
      const userData = userResp.ok ? await userResp.json() : null;
      const nombre = userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username : usuario;

      login({ id: String(userData?.id || Date.now()), nombre, rol });
      toast({ title: 'Bienvenido', description: `Sesión iniciada como ${rol}` });
      navigate('/dashboard');
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />

      <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Activity className="h-10 w-10 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Sistema de Gestión SCADA
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Utilice su correo electrónico y contraseña para iniciar sesión
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Correo electrónico (usuario)</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Ingrese su correo electrónico"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contrasena" className="text-sm font-medium text-foreground">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contrasena"
                  type="password"
                  placeholder="Ingrese su contraseña"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                />
              </div>
            </div>

            {/* El rol se asigna desde el backend por un admin; no permitir selección en el login */}

            <Button
              type="submit"
              className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Iniciando sesión...
                </span>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to="/password-reset" className="text-primary hover:underline">¿Olvidaste la contraseña?</Link>
            <Link to="/register" className="text-primary hover:underline">¿No tenés cuenta? Registrate</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
