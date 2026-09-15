import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const VerifyEmail = () => {
  const query = useQuery();
  const key = query.get("key") || "";
  const [status, setStatus] = useState<string>(key ? "pending" : "no-key");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      if (!key) return;
      try {
        // Usar rutas relativas proxied por Vite (/api/*) para que el navegador hable
        // con el frontend dev server y éste reenvíe las peticiones al backend.
        // Obtener token CSRF desde el endpoint proxied: /api/csrf-token/
        let csrftoken: string | null = null;
        try {
          const t = await fetch('/api/csrf-token/', { credentials: 'include' });
          if (t.ok) {
            const jd = await t.json();
            csrftoken = jd.csrfToken || null;
          }
        } catch (e) {
          // ignore
        }

        const headers: any = { 'Content-Type': 'application/json' };
        if (csrftoken) headers['X-CSRFToken'] = csrftoken;

        // Intentamos POST (API oficial). Si falla por CSRF, caemos
        // al endpoint GET fallback `/api/v1/auth/registration/verify-email-get/`.
        let res = await fetch(`/api/v1/auth/registration/verify-email/`, {
          method: "POST",
          credentials: 'include',
          headers,
          body: JSON.stringify({ key }),
        });
        if (res.status === 403 || res.status === 400 || res.status === 404) {
          // Fallback: confirmar por GET (sin CSRF)
          try {
            res = await fetch(`/api/v1/auth/registration/verify-email-get/?key=${encodeURIComponent(key)}`, {
              method: 'GET',
              credentials: 'include',
            });
          } catch (e) {
            // ignore
          }
        }
        if (res.ok) {
          setStatus("ok");
          toast({ title: "Cuenta verificada", description: "Ya puede iniciar sesión" });
          setTimeout(() => navigate("/login"), 1500);
        } else {
          const data = await res.json();
          setStatus("error");
          toast({ title: "Error", description: JSON.stringify(data), variant: "destructive" });
        }
      } catch (err) {
        setStatus("error");
        toast({ title: "Error", description: String(err), variant: "destructive" });
      }
    };
    verify();
  }, [key]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Verificación de Email</CardTitle>
          <CardDescription>Verificando su correo...</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "no-key" && (
            <p>No se encontró el código de verificación en la URL.</p>
          )}
          {status === "pending" && <p>Verificando...</p>}
          {status === "ok" && <p>Cuenta verificada. Redirigiendo a login...</p>}
          {status === "error" && <p>Error al verificar la cuenta. Revise el enlace o solicite uno nuevo.</p>}
          <div className="mt-4">
            <Button onClick={() => navigate("/login")} className="w-full">Ir a Login</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
