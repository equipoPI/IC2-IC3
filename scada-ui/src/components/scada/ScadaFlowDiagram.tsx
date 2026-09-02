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
    nodeIds: ['bomba_reposicion', 'electrovalvula-1', 'electrovalvula-2', 'tank-1', 'tank-2', 'pump-1', 'pump-2', 'sensor-3', 'sensor_caudal_02', 'mixer-1', 'bomba_mezcla', 'tank-3'],
  },
  'sistema-preparacion': {
    label: 'Sistema de Preparación',
    nodeIds: ['bomba_reposicion', 'electrovalvula-1', 'electrovalvula-2', 'tank-1', 'tank-2'],
  },
  'sistema-mezclado': {
    label: 'Sistema de Mezclado',
    nodeIds: ['pump-1', 'pump-2', 'sensor-3', 'sensor_caudal_02', 'mixer-1'],
  },
  'sistema-salida': {
    label: 'Sistema de Salida',
    nodeIds: ['mixer-1', 'bomba_mezcla', 'tank-3'],
  },
};

export const machineDefinitions = {
  'tank-1': { label: 'Tanque A', connectedNodes: ['electrovalvula-1', 'pump-1'] },
  'tank-2': { label: 'Tanque B', connectedNodes: ['electrovalvula-2', 'pump-2'] },
  'electrovalvula-1': { label: 'Válvula Rep. A', connectedNodes: ['bomba_reposicion', 'tank-1'] },
  'electrovalvula-2': { label: 'Válvula Rep. B', connectedNodes: ['bomba_reposicion', 'tank-2'] },
  'bomba_reposicion': { label: 'Bomba Reposición', connectedNodes: ['electrovalvula-1', 'electrovalvula-2'] },
  'pump-1': { label: 'Bomba A', connectedNodes: ['tank-1', 'sensor-3'] },
  'pump-2': { label: 'Bomba B', connectedNodes: ['tank-2', 'sensor_caudal_02'] },
  'sensor-3': { label: 'Caudalímetro 1', connectedNodes: ['pump-1', 'mixer-1'] },
  'sensor_caudal_02': { label: 'Caudalímetro 2', connectedNodes: ['pump-2', 'mixer-1'] },
  'mixer-1': { label: 'Mezclador M1', connectedNodes: ['sensor-3', 'sensor_caudal_02', 'bomba_mezcla'] },
  'bomba_mezcla': { label: 'Bomba de Mezcla', connectedNodes: ['mixer-1', 'tank-3'] },
  'tank-3': { label: 'Tanque Salida', connectedNodes: ['bomba_mezcla'] },
};

const isDeviceActive = (dev: any) => {
  if (!dev) return false;
  const val = dev.valor_lectura;
  return val === 1 || val === 1.0 || String(val) === "1" || String(val) === "1.0" || String(val).toLowerCase() === "true" || String(val).toLowerCase() === "open" || String(val).toLowerCase() === "running";
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

    // Válvulas / Electroválvulas
    if (nodeId === 'electrovalvula-1' || nodeId === 'electrovalvula-2') {
      if (!dev) return { ...defaultData, isOpen: false, flowRate: 0 };
      const isOpen = isDeviceActive(dev);
      return {
        label: defaultData.label,
        isOpen,
        flowRate: isOpen ? (nodeId === 'electrovalvula-1' ? 12.5 : 8.3) : 0,
      };
    }

    // Bomba Principal P1 (Bomba A)
    if (nodeId === 'pump-1') {
      const isRunning = isDeviceActive(dev);
      return {
        label: dev?.nombre || defaultData.label,
        isRunning,
        rpm: isRunning ? 1450 : 0,
        power: isRunning ? 75 : 0,
      };
    }

    // Bomba P2 (Bomba B)
    if (nodeId === 'pump-2') {
      const isRunning = isDeviceActive(dev);
      return {
        label: dev?.nombre || defaultData.label,
        isRunning,
        rpm: isRunning ? 1450 : 0,
        power: isRunning ? 75 : 0,
      };
    }

    // Bomba Reposición
    if (nodeId === 'bomba_reposicion') {
      const isRunning = isDeviceActive(dev);
      return {
        label: dev?.nombre || defaultData.label,
        isRunning,
        rpm: isRunning ? 1450 : 0,
        power: isRunning ? 50 : 0,
      };
    }

    // Bomba Mezcla
    if (nodeId === 'bomba_mezcla') {
      const isRunning = isDeviceActive(dev);
      return {
        label: dev?.nombre || defaultData.label,
        isRunning,
        rpm: isRunning ? 1450 : 0,
        power: isRunning ? 90 : 0,
      };
    }

    // Sensor de Flujo 1
    if (nodeId === 'sensor-3') {
      const val = dev && dev.valor_lectura !== null ? Number(dev.valor_lectura) : 0;
      return {
        label: dev?.nombre || defaultData.label,
        value: val,
        unit: 'L/min',
        type: 'flow',
        status: val > 0 ? 'normal' : 'warning',
      };
    }

    // Sensor de Flujo 2
    if (nodeId === 'sensor_caudal_02') {
      const val = dev && dev.valor_lectura !== null ? Number(dev.valor_lectura) : 0;
      return {
        label: dev?.nombre || defaultData.label,
        value: val,
        unit: 'L/min',
        type: 'flow',
        status: val > 0 ? 'normal' : 'warning',
      };
    }

    if (!dev) return defaultData;

    // Mezclador
    if (dev.categoria === 'MEZCLADORA') {
      const isRunning = isDeviceActive(dev);
      return {
        label: dev.nombre || defaultData.label,
        isRunning,
        speed: isRunning ? 120 : 0,
        temperature: 25,
      };
    }

    return defaultData;
  };

  return [
    {
      id: 'bomba_reposicion',
      type: 'pump',
      position: { x: 50, y: 220 },
      data: getDeviceData('bomba_reposicion', { label: 'Bomba Reposición', isRunning: false, rpm: 0, power: 0 }),
    },
    {
      id: 'electrovalvula-1',
      type: 'valve',
      position: { x: 180, y: 70 },
      data: getDeviceData('electrovalvula-1', { label: 'Válvula Rep. A', isOpen: false, flowRate: 0 }),
    },
    {
      id: 'electrovalvula-2',
      type: 'valve',
      position: { x: 180, y: 370 },
      data: getDeviceData('electrovalvula-2', { label: 'Válvula Rep. B', isOpen: false, flowRate: 0 }),
    },
    {
      id: 'tank-1',
      type: 'tank',
      position: { x: 300, y: 50 },
      data: getStorageData('tank-1') || { label: 'Tanque A', level: 75, temperature: 25, capacity: 1000, unit: 'L', status: 'active' },
    },
    {
      id: 'tank-2',
      type: 'tank',
      position: { x: 300, y: 350 },
      data: getStorageData('tank-2') || { label: 'Tanque B', level: 45, temperature: 30, capacity: 800, unit: 'L', status: 'active' },
    },
    {
      id: 'pump-1',
      type: 'pump',
      position: { x: 460, y: 80 },
      data: getDeviceData('pump-1', { label: 'Bomba A', isRunning: false, rpm: 0, power: 0 }),
    },
    {
      id: 'pump-2',
      type: 'pump',
      position: { x: 460, y: 380 },
      data: getDeviceData('pump-2', { label: 'Bomba B', isRunning: false, rpm: 0, power: 0 }),
    },
    {
      id: 'sensor-3',
      type: 'sensor',
      position: { x: 580, y: 80 },
      data: getDeviceData('sensor-3', { label: 'Caudalímetro 1', value: 0.0, unit: 'L/min', type: 'flow', status: 'normal' }),
    },
    {
      id: 'sensor_caudal_02',
      type: 'sensor',
      position: { x: 580, y: 380 },
      data: getDeviceData('sensor_caudal_02', { label: 'Caudalímetro 2', value: 0.0, unit: 'L/min', type: 'flow', status: 'normal' }),
    },
    {
      id: 'mixer-1',
      type: 'mixer',
      position: { x: 720, y: 200 },
      data: getDeviceData('mixer-1', { label: 'Mezclador M1', isRunning: false, speed: 0, temperature: 25 }),
    },
    {
      id: 'tank-3',
      type: 'tank',
      position: { x: 860, y: 200 },
      data: getStorageData('tank-3') || { label: 'Tanque Salida', level: 30, temperature: 25, capacity: 1500, unit: 'L', status: 'active' },
    },
    {
      id: 'bomba_mezcla',
      type: 'pump',
      position: { x: 990, y: 220 },
      data: getDeviceData('bomba_mezcla', { label: 'Bomba de Mezcla', isRunning: false, rpm: 0, power: 0 }),
    },
  ];
};

const allEdges: Edge[] = [
  { id: 'e-repo-1', source: 'bomba_reposicion', target: 'electrovalvula-1', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e-repo-2', source: 'bomba_reposicion', target: 'electrovalvula-2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e-valv-1', source: 'electrovalvula-1', target: 'tank-1', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e-valv-2', source: 'electrovalvula-2', target: 'tank-2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e-tank-1', source: 'tank-1', target: 'pump-1', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e-pump-1', source: 'pump-1', target: 'sensor-3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e-flow-1', source: 'sensor-3', target: 'mixer-1', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e-tank-2', source: 'tank-2', target: 'pump-2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e-pump-2', source: 'pump-2', target: 'sensor_caudal_02', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e-flow-2', source: 'sensor_caudal_02', target: 'mixer-1', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e-mix-1', source: 'mixer-1', target: 'tank-3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e-mix-2', source: 'tank-3', target: 'bomba_mezcla', animated: true, style: { stroke: 'hsl(var(--primary))' } },
];

interface ScadaFlowDiagramProps {
  selectedView?: string;
  selectedPlanta: string;
  selectedSeccion: string;
  selectedSistema: string;
  secciones?: any[];
  sistemas?: any[];
  plantas?: any[];
}

const ScadaFlowDiagram = ({ 
  selectedView = 'planta-completa',
  selectedPlanta,
  selectedSeccion,
  selectedSistema,
  secciones = [],
  sistemas = [],
  plantas = []
}: ScadaFlowDiagramProps) => {
  const { storageUnits } = useStorage();
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const cached = localStorage.getItem("scada_node_positions");
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const onNodeDragStop = useCallback((_: any, node: any) => {
    setNodePositions(prev => {
      const next = { ...prev, [node.id]: node.position };
      localStorage.setItem("scada_node_positions", JSON.stringify(next));
      return next;
    });
  }, []);

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

  // Filtrar dispositivos en base a planta, sección y sistema
  const filteredDispositivos = useMemo(() => {
    return dispositivos.filter(d => {
      if (selectedPlanta !== 'todas') {
        const seccionObj = secciones.find(s => String(s.id) === String(d.seccion));
        if (seccionObj && String(seccionObj.fabrica) !== selectedPlanta) {
          return false;
        }
      }
      if (selectedSeccion !== 'todas') {
        if (String(d.seccion) !== selectedSeccion) {
          return false;
        }
      }
      if (selectedSistema !== 'todas') {
        if (String(d.sistema) !== selectedSistema) {
          return false;
        }
      }
      return true;
    });
  }, [dispositivos, selectedPlanta, selectedSeccion, selectedSistema, secciones]);
  
  const allNodes = useMemo(() => {
    const initialNodes = createInitialNodes(storageUnits, dispositivos);
    return initialNodes.map(node => ({
      ...node,
      position: nodePositions[node.id] || node.position
    }));
  }, [storageUnits, dispositivos, nodePositions]);

  const filteredData = useMemo(() => {
    const isGlobal = selectedPlanta === 'todas' && selectedSeccion === 'todas' && selectedSistema === 'todas';

    // Dispositivos devueltos por la BD en base al filtro seleccionado
    const dbMatchIds = filteredDispositivos.map(d => d.numero_serie);
    const initialNodesIds = new Set(createInitialNodes(storageUnits, []).map(n => n.id));

    // Determinar si la selección corresponde a la Planta Principal / Línea Mezclador 1
    const sysObj = selectedSistema !== 'todas' ? sistemas.find(s => String(s.id) === selectedSistema) : null;
    const sysName = (sysObj?.nombre || '').toLowerCase();

    const isDemoLineSelected = isGlobal || 
      sysName.includes('mezcl') || 
      sysName.includes('preparac') || 
      sysName.includes('salida') || 
      sysName.includes('fluido') ||
      dbMatchIds.some(id => initialNodesIds.has(id));

    let finalNodes: Node[] = [];

    if (isDemoLineSelected) {
      if (isGlobal) {
        finalNodes = allNodes;
      } else {
        let systemMatchIds: string[] = [];
        if (sysName.includes('preparac') || sysName.includes('llenado')) {
          systemMatchIds = systemDefinitions['sistema-preparacion'].nodeIds;
        } else if (sysName.includes('mezcl') || sysName.includes('solido') || sysName.includes('sólido')) {
          systemMatchIds = systemDefinitions['sistema-mezclado'].nodeIds;
        } else if (sysName.includes('salida') || sysName.includes('empaque') || sysName.includes('almacen')) {
          systemMatchIds = systemDefinitions['sistema-salida'].nodeIds;
        } else {
          systemMatchIds = Array.from(initialNodesIds);
        }

        const validIds = new Set([...dbMatchIds, ...systemMatchIds]);
        if (validIds.has('sensor_nivel_bombo1')) validIds.add('tank-1');
        if (validIds.has('sensor_nivel_bombo2')) validIds.add('tank-2');
        if (validIds.has('sensor_nivel_mezcla')) validIds.add('tank-3');

        finalNodes = allNodes.filter(n => validIds.has(n.id));
      }
    } else {
      finalNodes = allNodes.filter(n => dbMatchIds.includes(n.id));
    }

    if (finalNodes.length === 0) {
      finalNodes = allNodes;
    }

    const nodeIds = finalNodes.map(n => n.id);
    const filteredEdges = allEdges.filter(edge => 
      nodeIds.includes(edge.source) && nodeIds.includes(edge.target)
    );

    return { nodes: finalNodes, edges: filteredEdges };
  }, [allNodes, filteredDispositivos, selectedPlanta, selectedSeccion, selectedSistema, sistemas, storageUnits]);

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredData.edges);

  useEffect(() => {
    setNodes(filteredData.nodes);
    
    const p1 = dispositivos.find(d => d.numero_serie === 'pump-1');
    const p2 = dispositivos.find(d => d.numero_serie === 'pump-2');
    const pb = dispositivos.find(d => d.numero_serie === 'bomba_mezcla');
    const pr = dispositivos.find(d => d.numero_serie === 'bomba_reposicion');
    const ev1 = dispositivos.find(d => d.numero_serie === 'electrovalvula-1');
    const ev2 = dispositivos.find(d => d.numero_serie === 'electrovalvula-2');
    
    const isP1Active = isDeviceActive(p1);
    const isP2Active = isDeviceActive(p2);
    const isPbActive = isDeviceActive(pb);
    const isPrActive = isDeviceActive(pr);
    const isEv1Active = isDeviceActive(ev1);
    const isEv2Active = isDeviceActive(ev2);
    
    const animatedEdges = filteredData.edges.map(edge => {
      let animated = false;
      if (edge.id === 'e-repo-1' || edge.id === 'e-valv-1') animated = !!(isPrActive && isEv1Active);
      if (edge.id === 'e-repo-2' || edge.id === 'e-valv-2') animated = !!(isPrActive && isEv2Active);
      if (edge.id === 'e-tank-1' || edge.id === 'e-pump-1' || edge.id === 'e-flow-1') animated = !!isP1Active;
      if (edge.id === 'e-tank-2' || edge.id === 'e-pump-2' || edge.id === 'e-flow-2') animated = !!isP2Active;
      if (edge.id === 'e-mix-1' || edge.id === 'e-mix-2') animated = !!isPbActive;
      return {
        ...edge,
        animated,
      };
    });
    
    setEdges(animatedEdges);
  }, [filteredData, dispositivos, setNodes, setEdges]);

  // Nombres para la barra jerárquica
  const nombrePlanta = selectedPlanta !== 'todas' ? plantas.find(p => String(p.id) === selectedPlanta)?.nombre || 'Planta' : 'Todas las Plantas';
  const nombreSeccion = selectedSeccion !== 'todas' ? secciones.find(s => String(s.id) === selectedSeccion)?.nombre || 'Sección' : 'Todas las Secciones';
  const nombreSistema = selectedSistema !== 'todas' ? sistemas.find(sys => String(sys.id) === selectedSistema)?.nombre || 'Sistema' : 'Todos los Sistemas';

  return (
    <div className="w-full flex flex-col space-y-2">
      {/* Barra de Jerarquía y Estado del Diagrama */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-muted/40 border border-border text-xs">
        <div className="flex items-center gap-2 font-mono text-muted-foreground">
          <span className="font-semibold text-foreground">📍 Jerarquía Actual:</span>
          <span>{nombrePlanta}</span>
          <span>&gt;</span>
          <span>{nombreSeccion}</span>
          <span>&gt;</span>
          <span className="text-primary font-bold">{nombreSistema}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            Componentes Visibles: <strong className="text-foreground">{nodes.length}</strong>
          </span>
        </div>
      </div>

      <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border bg-background/30">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.5}
          maxZoom={2}
          key="scada-react-flow"
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
    </div>
  );
};

export default ScadaFlowDiagram;
