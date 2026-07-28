import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const PasswordResetConfirm = () => {
  const query = useQuery();
  const uid = query.get("uid") || "";
  const token = query.get("token") || "";
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password1 !== password2) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/auth/password/reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, new_password1: password1, new_password2: password2 }),
      });
      if (res.ok) {
        toast({ title: "Contraseña actualizada", description: "Ya puede iniciar sesión" });
        navigate("/login");
      } else {
        const data = await res.json();
        toast({ title: "Error", description: JSON.stringify(data), variant: "destructive" });
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
          <CardTitle>Establecer nueva contraseña</CardTitle>
          <CardDescription>Introduce la nueva contraseña para tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password1">Contraseña</Label>
              <Input id="password1" type="password" value={password1} onChange={(e) => setPassword1(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password2">Confirmar contraseña</Label>
              <Input id="password2" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Enviando..." : "Actualizar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordResetConfirm;
