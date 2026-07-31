import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [registrationKey, setRegistrationKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password1 !== password2) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    // Validación cliente: campos obligatorios
    if (!firstName.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    if (!lastName.trim()) {
      toast({ title: "Error", description: "El apellido es obligatorio", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Error", description: "El correo es obligatorio", variant: "destructive" });
      return;
    }
    if (!registrationKey.trim()) {
      toast({ title: "Error", description: "La clave de registro es obligatoria", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const username = email ? email.split('@')[0] : '';

      // Obtener cookie CSRF
      const getCookie = (name: string) => {
        const matches = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return matches ? decodeURIComponent(matches[1]) : null;
      };
      const csrftoken = getCookie('csrftoken');

      const headers: any = { 'Content-Type': 'application/json' };
      if (csrftoken) headers['X-CSRFToken'] = csrftoken;

      const res = await fetch(`/api/v1/auth/registration/`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ username, email, password1, password2, first_name: firstName, last_name: lastName, registration_key: registrationKey }),
      });
      if (res.ok) {
        toast({ title: "Registro enviado", description: "Revise su correo para confirmar la cuenta" });
        navigate("/login");
      } else {
        const data = await res.json();
        // Mapear errores de la API a mensajes en español
        const labels: any = {
          username: 'Usuario',
          email: 'Correo',
          password1: 'Contraseña',
          password2: 'Confirmación de contraseña',
          registration_key: 'Clave de registro',
          non_field_errors: '',
          detail: '',
        };

        // Traducciones simples EN -> ES para mensajes comunes de DRF/allauth
        const TRANSLATIONS: { [k: string]: string } = {
          'This field is required.': 'Este campo es obligatorio.',
          'This field may not be blank.': 'Este campo no puede estar vacío.',
          'Enter a valid email address.': 'Introduzca un correo electrónico válido.',
          'Invalid password.': 'Contraseña inválida.',
          'Passwords do not match.': 'Las contraseñas no coinciden.',
          'This password is too short.': 'La contraseña es demasiado corta.',
          'user with this email already exists.': 'Ya existe un usuario con este correo.',
        };

        const translate = (msg: string) => {
          if (!msg) return msg;
          if (TRANSLATIONS[msg]) return TRANSLATIONS[msg];
          // Buscar coincidencias parciales
          for (const en of Object.keys(TRANSLATIONS)) {
            if (msg.toLowerCase().includes(en.toLowerCase())) return TRANSLATIONS[en];
          }
          return msg;
        };

        const messages: string[] = [];
        if (typeof data === 'string') {
          messages.push(translate(data));
        } else if (data) {
          for (const key of Object.keys(data)) {
            const val = data[key];
            const label = labels[key] !== undefined ? labels[key] : key;
            if (Array.isArray(val)) {
              val.forEach((m: any) => messages.push(label ? `${label}: ${translate(String(m))}` : `${translate(String(m))}`));
            } else {
              messages.push(label ? `${label}: ${translate(String(val))}` : `${translate(String(val))}`);
            }
          }
        }
        const description = messages.length ? messages.join(' | ') : 'Error en el registro';
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
          <CardTitle>Registro</CardTitle>
          <CardDescription>Crear una cuenta y recibir un correo de verificación</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="lastName">Apellido</Label>
              <Input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password1">Contraseña</Label>
              <Input id="password1" type="password" value={password1} onChange={(e) => setPassword1(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password2">Confirmar contraseña</Label>
              <Input id="password2" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="registrationKey">Clave de acceso / Clave de registro</Label>
              <Input id="registrationKey" placeholder="Introduce la clave de registro" type="text" value={registrationKey} onChange={(e) => setRegistrationKey(e.target.value)} />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Enviando..." : "Registrarse"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
