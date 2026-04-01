import { createContext, useContext, useState, ReactNode } from 'react';

export interface StorageUnit {
  id: string;
  nodeId: string; // Links to SCADA diagram node
  name: string;
  type: 'tank' | 'silo' | 'deposit';
  content: string;
  currentVolume: number;
  capacity: number;
  unit: string;
  temperature?: number;
  status: 'active' | 'inactive' | 'warning' | 'error';
}

export interface Ingredient {
  id: string;
  name: string;
  category: 'raw_material' | 'additive' | 'catalyst' | 'base';
  unit: string;
  availableInStorage?: string; // Storage unit ID if available
}

interface StorageContextType {
  storageUnits: StorageUnit[];
  ingredients: Ingredient[];
  updateStorageUnit: (unit: StorageUnit) => void;
  addStorageUnit: (unit: Omit<StorageUnit, 'id'>) => void;
  deleteStorageUnit: (id: string) => void;
  getStorageUnitByNodeId: (nodeId: string) => StorageUnit | undefined;
}

const defaultStorageUnits: StorageUnit[] = [
  {
    id: 'storage-1',
    nodeId: 'tank-1',
    name: 'Tanque A',
    type: 'tank',
    content: 'Aceite de Oliva',
    currentVolume: 750,
    capacity: 1000,
    unit: 'L',
    temperature: 25,
    status: 'active',
  },
  {
    id: 'storage-2',
    nodeId: 'tank-2',
    name: 'Tanque B',
    type: 'tank',
    content: 'Agua Destilada',
    currentVolume: 360,
    capacity: 800,
    unit: 'L',
    temperature: 30,
    status: 'active',
  },
  {
    id: 'storage-3',
    nodeId: 'tank-3',
    name: 'Tanque Salida',
    type: 'tank',
    content: 'Producto Final',
    currentVolume: 450,
    capacity: 1500,
    unit: 'L',
    temperature: 42,
    status: 'active',
  },
];

const defaultIngredients: Ingredient[] = [
  { id: 'ing-1', name: 'Aceite de Oliva', category: 'raw_material', unit: 'L', availableInStorage: 'storage-1' },
  { id: 'ing-2', name: 'Agua Destilada', category: 'raw_material', unit: 'L', availableInStorage: 'storage-2' },
  { id: 'ing-3', name: 'Glicerina', category: 'raw_material', unit: 'L' },
  { id: 'ing-4', name: 'Sosa Cáustica', category: 'catalyst', unit: 'kg' },
  { id: 'ing-5', name: 'Colorante Industrial', category: 'additive', unit: 'g' },
  { id: 'ing-6', name: 'Fragancia Natural', category: 'additive', unit: 'ml' },
  { id: 'ing-7', name: 'Polímero Base', category: 'base', unit: 'kg' },
  { id: 'ing-8', name: 'Estabilizador UV', category: 'additive', unit: 'g' },
  { id: 'ing-9', name: 'Catalizador A', category: 'catalyst', unit: 'g' },
  { id: 'ing-10', name: 'Resina Epóxica', category: 'base', unit: 'L' },
];

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider = ({ children }: { children: ReactNode }) => {
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>(defaultStorageUnits);
  const [ingredients] = useState<Ingredient[]>(defaultIngredients);

  const updateStorageUnit = (updatedUnit: StorageUnit) => {
    setStorageUnits((prev) =>
      prev.map((unit) => (unit.id === updatedUnit.id ? updatedUnit : unit))
    );
  };

  const addStorageUnit = (unitData: Omit<StorageUnit, 'id'>) => {
    const newUnit: StorageUnit = {
      ...unitData,
      id: `storage-${Date.now()}`,
    };
    setStorageUnits((prev) => [...prev, newUnit]);
  };

  const deleteStorageUnit = (id: string) => {
    setStorageUnits((prev) => prev.filter((unit) => unit.id !== id));
  };

  const getStorageUnitByNodeId = (nodeId: string) => {
    return storageUnits.find((unit) => unit.nodeId === nodeId);
  };

  return (
    <StorageContext.Provider
      value={{
        storageUnits,
        ingredients,
        updateStorageUnit,
        addStorageUnit,
        deleteStorageUnit,
        getStorageUnitByNodeId,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
