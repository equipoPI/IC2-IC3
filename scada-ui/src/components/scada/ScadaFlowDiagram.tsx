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

const createInitialNodes = (storageUnits: ReturnType<typeof useStorage>['storageUnits']): Node[] => {
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
      data: { label: 'Válvula V1', isOpen: true, flowRate: 12.5 },
    },
    {
      id: 'valve-2',
      type: 'valve',
      position: { x: 220, y: 330 },
      data: { label: 'Válvula V2', isOpen: true, flowRate: 8.3 },
    },
    {
      id: 'pump-1',
      type: 'pump',
      position: { x: 350, y: 180 },
      data: { label: 'Bomba P1', isRunning: true, rpm: 1450, power: 75 },
    },
    {
      id: 'mixer-1',
      type: 'mixer',
      position: { x: 500, y: 150 },
      data: { label: 'Mezclador M1', isRunning: true, speed: 120, temperature: 45 },
    },
    {
      id: 'sensor-1',
      type: 'sensor',
      position: { x: 650, y: 80 },
      data: { label: 'Sensor Temp', value: 45.2, unit: '°C', type: 'temperature', status: 'normal' },
    },
    {
      id: 'sensor-2',
      type: 'sensor',
      position: { x: 650, y: 180 },
      data: { label: 'Sensor Presión', value: 2.4, unit: 'bar', type: 'pressure', status: 'normal' },
    },
    {
      id: 'sensor-3',
      type: 'sensor',
      position: { x: 650, y: 280 },
      data: { label: 'Sensor Flujo', value: 18.7, unit: 'L/min', type: 'flow', status: 'warning' },
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
  
  const allNodes = useMemo(() => createInitialNodes(storageUnits), [storageUnits]);

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
  }, [selectedView]);

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredData.edges);

  // Update nodes when view changes
  useEffect(() => {
    setNodes(filteredData.nodes);
    setEdges(filteredData.edges);
  }, [filteredData, setNodes, setEdges]);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type === 'tank') {
            const variation = (Math.random() - 0.5) * 4;
            const newLevel = Math.max(5, Math.min(95, (node.data.level as number) + variation));
            const tempVariation = (Math.random() - 0.5) * 1;
            const newTemp = Math.max(20, Math.min(60, (node.data.temperature as number) + tempVariation));
            return {
              ...node,
              data: { ...node.data, level: Math.round(newLevel * 10) / 10, temperature: Math.round(newTemp * 10) / 10 },
            };
          }
          if (node.type === 'pump') {
            const rpmVariation = (Math.random() - 0.5) * 20;
            const newRpm = Math.max(1200, Math.min(1600, (node.data.rpm as number) + rpmVariation));
            return {
              ...node,
              data: { ...node.data, rpm: Math.round(newRpm) },
            };
          }
          if (node.type === 'sensor') {
            let variation = 0;
            if (node.data.type === 'temperature') {
              variation = (Math.random() - 0.5) * 2;
            } else if (node.data.type === 'pressure') {
              variation = (Math.random() - 0.5) * 0.3;
            } else if (node.data.type === 'flow') {
              variation = (Math.random() - 0.5) * 2;
            }
            const newValue = Math.max(0, (node.data.value as number) + variation);
            return {
              ...node,
              data: { ...node.data, value: Math.round(newValue * 10) / 10 },
            };
          }
          if (node.type === 'valve') {
            const flowVariation = (Math.random() - 0.5) * 1;
            const newFlow = Math.max(0, (node.data.flowRate as number) + flowVariation);
            return {
              ...node,
              data: { ...node.data, flowRate: Math.round(newFlow * 10) / 10 },
            };
          }
          if (node.type === 'mixer') {
            const speedVariation = (Math.random() - 0.5) * 5;
            const newSpeed = Math.max(80, Math.min(150, (node.data.speed as number) + speedVariation));
            const tempVariation = (Math.random() - 0.5) * 1;
            const newTemp = Math.max(35, Math.min(55, (node.data.temperature as number) + tempVariation));
            return {
              ...node,
              data: { ...node.data, speed: Math.round(newSpeed), temperature: Math.round(newTemp * 10) / 10 },
            };
          }
          return node;
        })
      );
    }, 1500);

    return () => clearInterval(interval);
  }, [setNodes]);

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
