import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const PasswordReset = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Limpiar cookies de analytics que pueden inflar el header "Cookie" y causar 400
      const clearAnalyticsCookies = () => {
        try {
          const prefixes = ['rl_', 'ph_', 'posthog'];
          document.cookie.split(';').forEach((c) => {
            const name = c.split('=')[0].trim();
            if (prefixes.some((p) => name.startsWith(p))) {
              document.cookie = `${name}=; Max-Age=0; path=/;`;
            }
          });
        } catch (e) {}
      };

      // Obtener cookie CSRF (y forzar que el backend la emita vía endpoint auxiliar)
      const getCookie = (name: string) => {
        const matches = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return matches ? decodeURIComponent(matches[1]) : null;
      };
      // Borrar cookies de analytics antes de pedir el token CSRF
      clearAnalyticsCookies();
      // Solicitar token al backend para asegurarnos de que la cookie `csrftoken` está presente
      await fetch('/api/csrf/', { credentials: 'include' }).catch(() => null);
      const csrftoken = getCookie('csrftoken');

      const headers: any = { 'Content-Type': 'application/json' };
      if (csrftoken) headers['X-CSRFToken'] = csrftoken;

      const res = await fetch(`/api/v1/auth/password/reset/`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        toast({ title: "Enviado", description: "Revise su correo para instrucciones" });
        navigate("/login");
      } else {
        // La respuesta podría ser HTML (página de error) o JSON. Manejar ambos casos.
        let description: string;
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          try {
            const data = await res.json();
            description = JSON.stringify(data);
          } catch (e) {
            description = await res.text().catch(() => `Error ${res.status}`);
          }
        } else {
          // Probablemente HTML de error (ej. página de debug/CSRF); mostrar texto
          description = await res.text().catch(() => `Error ${res.status}`);
        }
        toast({ title: "Error", description, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Recuperar Contraseña</CardTitle>
          <CardDescription>Introduce tu email para recibir instrucciones</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Enviando..." : "Enviar instrucciones"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordReset;
