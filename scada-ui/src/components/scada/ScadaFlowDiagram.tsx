import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TankNode from './nodes/TankNode';
import PumpNode from './nodes/PumpNode';
import ValveNode from './nodes/ValveNode';
import MixerNode from './nodes/MixerNode';
import SensorNode from './nodes/SensorNode';
import { useStorage } from '@/contexts/StorageContext';
import apiFetch from '@/lib/api';

const nodeTypes = {
  tank: TankNode,
  pump: PumpNode,
  valve: ValveNode,
  mixer: MixerNode,
  sensor: SensorNode,
};

// Define systems and their components
export const systemDefinitions = {
  'planta-completa': {
    label: 'Planta Completa',
    nodeIds: ['tank-1', 'tank-2', 'valve-1', 'valve-2', 'pump-1', 'mixer-1', 'sensor-1', 'sensor-2', 'sensor-3', 'tank-3'],
  },
  'sistema-preparacion': {
    label: 'Sistema de Preparación',
    nodeIds: ['tank-1', 'tank-2', 'valve-1', 'valve-2', 'pump-1'],
  },
  'sistema-mezclado': {
    label: 'Sistema de Mezclado',
    nodeIds: ['pump-1', 'mixer-1', 'sensor-1', 'sensor-2', 'sensor-3'],
  },
  'sistema-salida': {
    label: 'Sistema de Salida',
    nodeIds: ['mixer-1', 'sensor-1', 'sensor-2', 'sensor-3', 'tank-3'],
  },
};

export const machineDefinitions = {
  'tank-1': { label: 'Tanque A', connectedNodes: ['valve-1'] },
  'tank-2': { label: 'Tanque B', connectedNodes: ['valve-2'] },
  'valve-1': { label: 'Válvula V1', connectedNodes: ['tank-1', 'pump-1'] },
  'valve-2': { label: 'Válvula V2', connectedNodes: ['tank-2', 'pump-1'] },
  'pump-1': { label: 'Bomba P1', connectedNodes: ['valve-1', 'valve-2', 'mixer-1'] },
  'mixer-1': { label: 'Mezclador M1', connectedNodes: ['pump-1', 'sensor-1', 'sensor-2', 'sensor-3', 'tank-3'] },
  'sensor-1': { label: 'Sensor Temp', connectedNodes: ['mixer-1'] },
  'sensor-2': { label: 'Sensor Presión', connectedNodes: ['mixer-1'] },
  'sensor-3': { label: 'Sensor Flujo', connectedNodes: ['mixer-1'] },
  'tank-3': { label: 'Tanque Salida', connectedNodes: ['mixer-1'] },
};

const createInitialNodes = (
  storageUnits: ReturnType<typeof useStorage>['storageUnits'],
  dispositivos: any[]
): Node[] => {
  const getStorageData = (nodeId: string) => {
    const unit = storageUnits.find(u => u.nodeId === nodeId);
    if (unit) {
      return {
        label: `${unit.name} (${unit.content})`,
        level: Math.round((unit.currentVolume / unit.capacity) * 100),
        temperature: unit.temperature || 25,
        capacity: unit.capacity,
        unit: unit.unit,
        status: unit.status,
        content: unit.content,
      };
    }
    return null;
  };

  const getDeviceData = (nodeId: string, defaultData: any) => {
    const dev = dispositivos.find(d => d.numero_serie === nodeId);
    if (!dev) return defaultData;

    // Retornar datos mapeados de base de datos
    if (dev.categoria === 'VALVULA') {
      const isOpen = dev.valor_lectura === 1 || dev.valor_lectura === "open" || String(dev.valor_lectura) === "1.0" || String(dev.valor_lectura) === "true";
      return {
        label: dev.nombre || defaultData.label,
        isOpen,
        flowRate: dev.valor_lectura !== null ? Number(dev.valor_lectura) : defaultData.flowRate,
      };
    }
    if (dev.categoria === 'BOMBA') {
      const isRunning = dev.valor_lectura === 1 || dev.valor_lectura === "running" || String(dev.valor_lectura) === "1.0" || String(dev.valor_lectura) === "true";
      return {
        label: dev.nombre || defaultData.label,
        isRunning,
        rpm: isRunning ? 1450 : 0,
        power: isRunning ? 75 : 0,
      };
    }
    if (dev.categoria === 'MEZCLADORA') {
      const isRunning = dev.valor_lectura === 1 || dev.valor_lectura === "running" || String(dev.valor_lectura) === "1.0" || String(dev.valor_lectura) === "true";
      return {
        label: dev.nombre || defaultData.label,
        isRunning,
        speed: isRunning ? 120 : 0,
        temperature: 45,
      };
    }
    // Sensores en general
    return {
      label: dev.nombre || defaultData.label,
      value: dev.valor_lectura !== null ? Number(dev.valor_lectura) : defaultData.value,
      unit: dev.unidad_lectura || defaultData.unit,
      type: defaultData.type,
      status: dev.estado === 'ERROR' ? 'critical' : dev.estado === 'MANTENIMIENTO' ? 'warning' : 'normal',
    };
  };

  return [
    {
      id: 'tank-1',
      type: 'tank',
      position: { x: 50, y: 50 },
      data: getStorageData('tank-1') || { label: 'Tanque A', level: 75, temperature: 25, capacity: 1000, unit: 'L', status: 'active' },
    },
    {
      id: 'tank-2',
      type: 'tank',
      position: { x: 50, y: 280 },
      data: getStorageData('tank-2') || { label: 'Tanque B', level: 45, temperature: 30, capacity: 800, unit: 'L', status: 'active' },
    },
    {
      id: 'valve-1',
      type: 'valve',
      position: { x: 220, y: 100 },
      data: getDeviceData('valve-1', { label: 'Válvula V1', isOpen: true, flowRate: 12.5 }),
    },
    {
      id: 'valve-2',
      type: 'valve',
      position: { x: 220, y: 330 },
      data: getDeviceData('valve-2', { label: 'Válvula V2', isOpen: true, flowRate: 8.3 }),
    },
    {
      id: 'pump-1',
      type: 'pump',
      position: { x: 350, y: 180 },
      data: getDeviceData('pump-1', { label: 'Bomba P1', isRunning: true, rpm: 1450, power: 75 }),
    },
    {
      id: 'mixer-1',
      type: 'mixer',
      position: { x: 500, y: 150 },
      data: getDeviceData('mixer-1', { label: 'Mezclador M1', isRunning: true, speed: 120, temperature: 45 }),
    },
    {
      id: 'sensor-1',
      type: 'sensor',
      position: { x: 650, y: 80 },
      data: getDeviceData('sensor-1', { label: 'Sensor Temp', value: 45.2, unit: '°C', type: 'temperature', status: 'normal' }),
    },
    {
      id: 'sensor-2',
      type: 'sensor',
      position: { x: 650, y: 180 },
      data: getDeviceData('sensor-2', { label: 'Sensor Presión', value: 2.4, unit: 'bar', type: 'pressure', status: 'normal' }),
    },
    {
      id: 'sensor-3',
      type: 'sensor',
      position: { x: 650, y: 280 },
      data: getDeviceData('sensor-3', { label: 'Sensor Flujo', value: 18.7, unit: 'L/min', type: 'flow', status: 'warning' }),
    },
    {
      id: 'tank-3',
      type: 'tank',
      position: { x: 780, y: 130 },
      data: getStorageData('tank-3') || { label: 'Tanque Salida', level: 30, temperature: 42, capacity: 1500, unit: 'L', status: 'active' },
    },
  ];
};

const allEdges: Edge[] = [
  { id: 'e1', source: 'tank-1', target: 'valve-1', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e2', source: 'tank-2', target: 'valve-2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e3', source: 'valve-1', target: 'pump-1', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e4', source: 'valve-2', target: 'pump-1', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e5', source: 'pump-1', target: 'mixer-1', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e6', source: 'mixer-1', target: 'sensor-1', style: { stroke: 'hsl(var(--muted-foreground))' } },
  { id: 'e7', source: 'mixer-1', target: 'sensor-2', style: { stroke: 'hsl(var(--muted-foreground))' } },
  { id: 'e8', source: 'mixer-1', target: 'sensor-3', style: { stroke: 'hsl(var(--muted-foreground))' } },
  { id: 'e9', source: 'mixer-1', target: 'tank-3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
];

interface ScadaFlowDiagramProps {
  selectedView?: string;
}

const ScadaFlowDiagram = ({ selectedView = 'planta-completa' }: ScadaFlowDiagramProps) => {
  const { storageUnits } = useStorage();
  const [dispositivos, setDispositivos] = useState<any[]>([]);

  const loadDispositivos = async () => {
    try {
      const resp = await apiFetch("/api/v1/dispositivos/");
      if (resp.ok) {
        const data = await resp.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setDispositivos(list);
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    loadDispositivos();
    const interval = setInterval(loadDispositivos, 3000);
    return () => clearInterval(interval);
  }, []);
  
  const allNodes = useMemo(() => createInitialNodes(storageUnits, dispositivos), [storageUnits, dispositivos]);

  const filteredData = useMemo(() => {
    let nodeIds: string[] = [];

    // Check if it's a system view
    if (selectedView in systemDefinitions) {
      nodeIds = systemDefinitions[selectedView as keyof typeof systemDefinitions].nodeIds;
    } 
    // Check if it's a machine view
    else if (selectedView in machineDefinitions) {
      const machine = machineDefinitions[selectedView as keyof typeof machineDefinitions];
      nodeIds = [selectedView, ...machine.connectedNodes];
    }

    const filteredNodes = allNodes.filter(node => nodeIds.includes(node.id));
    const filteredEdges = allEdges.filter(edge => 
      nodeIds.includes(edge.source) && nodeIds.includes(edge.target)
    );

    // Reposition nodes for better view when filtered
    if (selectedView !== 'planta-completa') {
      const repositionedNodes = filteredNodes.map((node, index) => ({
        ...node,
        position: {
          x: 100 + (index % 3) * 200,
          y: 80 + Math.floor(index / 3) * 180,
        },
      }));
      return { nodes: repositionedNodes, edges: filteredEdges };
    }

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [selectedView, allNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredData.edges);

  // Update nodes when view changes or when new data loads
  useEffect(() => {
    setNodes(filteredData.nodes);
    setEdges(filteredData.edges);
  }, [filteredData, setNodes, setEdges]);

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border bg-background/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={2}
        key={selectedView}
      >
        <Background color="hsl(var(--muted-foreground))" gap={20} size={1} />
        <Controls className="bg-card border-border" />
        <MiniMap 
          nodeColor={(node) => {
            if (node.type === 'tank') return 'hsl(var(--primary))';
            if (node.type === 'pump') return 'hsl(var(--success))';
            if (node.type === 'valve') return 'hsl(var(--warning))';
            if (node.type === 'mixer') return 'hsl(var(--info))';
            return 'hsl(var(--muted-foreground))';
          }}
          className="bg-card border-border"
        />
      </ReactFlow>
    </div>
  );
};

export default ScadaFlowDiagram;
