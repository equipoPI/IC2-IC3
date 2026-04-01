import { useState } from "react";
import { Database, Plus, Edit, Trash2, Search, Droplets, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useStorage, StorageUnit } from "@/contexts/StorageContext";
import { machineDefinitions } from "@/components/scada/ScadaFlowDiagram";

const statusConfig = {
  active: { label: "Activo", className: "bg-success/20 text-success border-success/30" },
  inactive: { label: "Inactivo", className: "bg-muted/20 text-muted-foreground border-muted/30" },
  warning: { label: "Advertencia", className: "bg-warning/20 text-warning border-warning/30" },
  error: { label: "Error", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

const typeLabels = {
  tank: "Tanque",
  silo: "Silo",
  deposit: "Depósito",
};

const AdministracionAlmacenamiento = () => {
  const { storageUnits, updateStorageUnit, addStorageUnit, deleteStorageUnit } = useStorage();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<StorageUnit | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<StorageUnit, 'id'>>({
    nodeId: '',
    name: '',
    type: 'tank',
    content: '',
    currentVolume: 0,
    capacity: 1000,
    unit: 'L',
    temperature: 25,
    status: 'active',
  });

  const filteredUnits = storageUnits.filter((unit) =>
    unit.name.toLowerCase().includes(search.toLowerCase()) ||
    unit.content.toLowerCase().includes(search.toLowerCase())
  );

  const availableNodes = Object.entries(machineDefinitions)
    .filter(([id]) => id.startsWith('tank'))
    .map(([id, def]) => ({ id, label: def.label }));

  const handleOpenDialog = (unit?: StorageUnit) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        nodeId: unit.nodeId,
        name: unit.name,
        type: unit.type,
        content: unit.content,
        currentVolume: unit.currentVolume,
        capacity: unit.capacity,
        unit: unit.unit,
        temperature: unit.temperature,
        status: unit.status,
      });
    } else {
      setEditingUnit(null);
      setFormData({
        nodeId: '',
        name: '',
        type: 'tank',
        content: '',
        currentVolume: 0,
        capacity: 1000,
        unit: 'L',
        temperature: 25,
        status: 'active',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.content || !formData.nodeId) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    if (editingUnit) {
      updateStorageUnit({ ...formData, id: editingUnit.id });
      toast({ title: "Actualizado", description: "Unidad de almacenamiento actualizada correctamente" });
    } else {
      addStorageUnit(formData);
      toast({ title: "Creado", description: "Nueva unidad de almacenamiento registrada" });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteStorageUnit(id);
    toast({ title: "Eliminado", description: "Unidad de almacenamiento eliminada" });
  };

  const totalCapacity = storageUnits.reduce((acc, unit) => acc + unit.capacity, 0);
  const totalVolume = storageUnits.reduce((acc, unit) => acc + unit.currentVolume, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Administración de Almacenamiento</h1>
        <p className="text-muted-foreground mt-1">
          Gestione los tanques, silos y depósitos del sistema SCADA
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Unidades</p>
                <p className="text-2xl font-bold text-foreground">{storageUnits.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Droplets className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacidad Total</p>
                <p className="text-2xl font-bold text-foreground">{totalCapacity.toLocaleString()} L</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Droplets className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volumen Actual</p>
                <p className="text-2xl font-bold text-foreground">{totalVolume.toLocaleString()} L</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Thermometer className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ocupación</p>
                <p className="text-2xl font-bold text-foreground">
                  {totalCapacity > 0 ? Math.round((totalVolume / totalCapacity) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Units Table */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Unidades de Almacenamiento</CardTitle>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Unidad
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o contenido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background border-border"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-muted-foreground">Contenido</TableHead>
                  <TableHead className="text-muted-foreground">Volumen / Capacidad</TableHead>
                  <TableHead className="text-muted-foreground">Nivel</TableHead>
                  <TableHead className="text-muted-foreground">Temp.</TableHead>
                  <TableHead className="text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-muted-foreground">Nodo SCADA</TableHead>
                  <TableHead className="text-muted-foreground">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.map((unit) => {
                  const levelPercent = (unit.currentVolume / unit.capacity) * 100;
                  return (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium text-foreground">{unit.name}</TableCell>
                      <TableCell className="text-foreground">{typeLabels[unit.type]}</TableCell>
                      <TableCell className="text-foreground">{unit.content}</TableCell>
                      <TableCell className="text-foreground font-mono">
                        {unit.currentVolume.toLocaleString()} / {unit.capacity.toLocaleString()} {unit.unit}
                      </TableCell>
                      <TableCell className="w-32">
                        <div className="flex items-center gap-2">
                          <Progress value={levelPercent} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground font-mono w-10">
                            {Math.round(levelPercent)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-mono">
                        {unit.temperature !== undefined ? `${unit.temperature}°C` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusConfig[unit.status].className}>
                          {statusConfig[unit.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {unit.nodeId}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(unit)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(unit.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {editingUnit ? "Editar Unidad de Almacenamiento" : "Nueva Unidad de Almacenamiento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Tanque Principal"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nodeId">Nodo SCADA *</Label>
                <Select
                  value={formData.nodeId}
                  onValueChange={(value) => setFormData({ ...formData, nodeId: value })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Seleccionar nodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.label} ({node.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'tank' | 'silo' | 'deposit') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tank">Tanque</SelectItem>
                    <SelectItem value="silo">Silo</SelectItem>
                    <SelectItem value="deposit">Depósito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Contenido *</Label>
                <Input
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Ej: Aceite de Oliva"
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentVolume">Volumen Actual</Label>
                <Input
                  id="currentVolume"
                  type="number"
                  value={formData.currentVolume}
                  onChange={(e) => setFormData({ ...formData, currentVolume: Number(e.target.value) })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidad</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidad</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Litros (L)</SelectItem>
                    <SelectItem value="m³">Metros cúbicos (m³)</SelectItem>
                    <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                    <SelectItem value="T">Toneladas (T)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperatura (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  value={formData.temperature || ''}
                  onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'inactive' | 'warning' | 'error') =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="warning">Advertencia</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingUnit ? "Guardar Cambios" : "Crear Unidad"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdministracionAlmacenamiento;
