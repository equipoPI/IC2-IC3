import { useState } from "react";
import { User, Mail, Phone, Building, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

interface PerfilDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PerfilDialog = ({ open, onOpenChange }: PerfilDialogProps) => {
  const [perfil, setPerfil] = useState({
    nombre: "Juan García",
    email: "juan.garcia@empresa.com",
    telefono: "+34 612 345 678",
    departamento: "Operaciones",
    rol: "Supervisor de Planta",
  });

  const handleSave = () => {
    toast({
      title: "Perfil actualizado",
      description: "Los cambios se han guardado correctamente",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex justify-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
                {perfil.nombre.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nombre Completo
              </Label>
              <Input 
                value={perfil.nombre} 
                onChange={(e) => setPerfil({...perfil, nombre: e.target.value})}
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Correo Electrónico
              </Label>
              <Input 
                type="email"
                value={perfil.email} 
                onChange={(e) => setPerfil({...perfil, email: e.target.value})}
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Teléfono
              </Label>
              <Input 
                value={perfil.telefono} 
                onChange={(e) => setPerfil({...perfil, telefono: e.target.value})}
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Departamento
              </Label>
              <Input 
                value={perfil.departamento} 
                onChange={(e) => setPerfil({...perfil, departamento: e.target.value})}
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Rol</Label>
              <Input 
                value={perfil.rol} 
                disabled
                className="bg-muted border-border"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PerfilDialog;
