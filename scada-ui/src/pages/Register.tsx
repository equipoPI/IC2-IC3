import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const Register = () => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documento, setDocumento] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fabrica, setFabrica] = useState("");
  const [seccion, setSeccion] = useState("");
  const [fechaContratacion, setFechaContratacion] = useState("");
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
      const username = documento ? documento : (email ? email.split('@')[0] : '');

      // Obtener cookie CSRF
      const getCookie = (name: string) => {
        const matches = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return matches ? decodeURIComponent(matches[1]) : null;
      };
      const csrftoken = getCookie('csrftoken');

      const headers: any = { 'Content-Type': 'application/json' };
      if (csrftoken) headers['X-CSRFToken'] = csrftoken;

      const regPayload: any = { username, email, password1, password2, first_name: firstName, last_name: lastName, registration_key: registrationKey };
      if (documento && documento.trim()) regPayload.documento = documento.trim();

      const res = await fetch(`/api/v1/auth/registration/`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(regPayload),
      });
      if (res.ok) {
        toast({ title: "Registro enviado", description: "Revise su correo para confirmar la cuenta" });
        // Intentar crear también el Empleado asociado en la API del backend
        try {
          const empleadoPayload: any = {
            documento: documento || username || undefined,
            nombre: firstName,
            apellido: lastName,
            email,
            direccion: direccion || undefined,
            fecha_contratacion: fechaContratacion || undefined,
            fabrica: fabrica || undefined,
            seccion: seccion || undefined,
            // registro público: no verificar email automáticamente
            email_verified: false,
          };
          Object.keys(empleadoPayload).forEach((k) => { const v = empleadoPayload[k]; if (v === undefined) delete empleadoPayload[k]; });
          await fetch('/api/v1/empleados/', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify(empleadoPayload),
          });
        } catch (err) {
          console.warn('No se pudo crear Empleado tras registro:', err);
        }
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

  // Cargar fabricas y secciones para permitir asignarlas durante el registro
  const [fabricas, setFabricas] = useState<any[]>([]);
  const [secciones, setSecciones] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const r1 = await fetch('/api/v1/fabricas/?page_size=200');
        if (r1.ok) {
          const d = await r1.json();
          const items = d.results || d || [];
          setFabricas(items);
        }
        const r2 = await fetch('/api/v1/secciones/?page_size=500');
        if (r2.ok) {
          const s = await r2.json();
          const items = s.results || s || [];
          setSecciones(items);
        }
      } catch (err) {
        console.warn('Register: fallo cargando fabricas/secciones', err);
      }
    };
    load();
  }, []);

  // Nota: no se captura número de teléfono por política de privacidad

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
              <Label htmlFor="documento">Documento (DNI/CUIT)</Label>
              <Input id="documento" type="text" value={documento} onChange={(e) => setDocumento(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {/* Teléfono eliminado del formulario por política: no se captura ni se envía */}
            <div className="space-y-2">
              <Label htmlFor="fabrica">Fábrica (opcional)</Label>
              <Select value={fabrica} onValueChange={(v) => setFabrica(v)}>
                <SelectTrigger id="fabrica">
                  <SelectValue placeholder="Seleccionar fábrica (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {fabricas.map((f: any) => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.nombre || f.nombre_fabrica || String(f.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seccion">Sección (opcional)</Label>
              <Select value={seccion} onValueChange={(v) => setSeccion(v)}>
                <SelectTrigger id="seccion">
                  <SelectValue placeholder="Seleccionar sección (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {secciones.filter((s: any) => !fabrica || String(s.fabrica) === String(fabrica)).map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.nombre || String(s.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fechaContratacion">Fecha de contratación</Label>
              <Input id="fechaContratacion" type="date" value={fechaContratacion} onChange={(e) => setFechaContratacion(e.target.value)} />
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
