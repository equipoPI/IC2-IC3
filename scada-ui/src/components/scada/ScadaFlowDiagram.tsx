import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TankNode from './nodes/TankNode';
import PumpNode from './nodes/PumpNode';
import ValveNode from './nodes/ValveNode';
import MixerNode from './nodes/MixerNode';
import SensorNode from './nodes/SensorNode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import apiFetch from '@/lib/api';
import { Save, RotateCcw, BoxSelect, Cpu, Layers, AlertCircle } from 'lucide-react';
import { useScadaWebSocket } from '@/hooks/useScadaWebSocket';


const nodeTypes = {
  tank: TankNode,
  pump: PumpNode,
  valve: ValveNode,
  mixer: MixerNode,
  sensor: SensorNode,
};

import { machineDefinitions, getCanonicalNodeId } from './scadaConstants';

const isDeviceActive = (dev: any) => {
  if (!dev) return false;
  const val = dev.valor_lectura;
  return val === 1 || val === 1.0 || String(val) === "1" || String(val) === "1.0" || String(val).toLowerCase() === "true" || String(val).toLowerCase() === "open" || String(val).toLowerCase() === "running" || (typeof val === 'number' && val > 0);
};

interface ScadaFlowDiagramProps {
  selectedView?: string;
  selectedPlanta: string;
  selectedSeccion: string;
  selectedSistema: string;
  secciones?: any[];
  sistemas?: any[];
  plantas?: any[];
  procesoEstado?: number | null;
  procesoHoras?: number | null;
  procesoMinutos?: number | null;
}

const ScadaFlowDiagram = ({
  selectedPlanta,
  selectedSeccion,
  selectedSistema,
  secciones = [],
  sistemas = [],
  plantas = [],
  procesoEstado,
  procesoHoras,
  procesoMinutos
}: ScadaFlowDiagramProps) => {
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [unidadesAlmacenamiento, setUnidadesAlmacenamiento] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Global layout storage key for canonical diagram positions
  const storageKey = 'scada_diagram_layout';

  // Fetch real dispositivos (/sensores) and unidades de almacenamiento (/almacenamiento)
  const loadData = async () => {
    try {
      const [rDisp, rUnidades] = await Promise.all([
        apiFetch("/api/v1/dispositivos/"),
        apiFetch("/api/v1/unidades-almacenamiento/")
      ]);

      if (rDisp.ok) {
        const data = await rDisp.json();
        setDispositivos(Array.isArray(data) ? data : data.results || []);
      }
      if (rUnidades.ok) {
        const data = await rUnidades.json();
        setUnidadesAlmacenamiento(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      console.warn("Error cargando dispositivos para SCADA:", e);
    } finally {
      setLoading(false);
    }
  };

  const lastLoadTimeRef = useRef<number>(0);

  useScadaWebSocket({
    onMessage: (data) => {
      if (!data) return;
      const now = Date.now();
      if (now - lastLoadTimeRef.current > 1000) {
        lastLoadTimeRef.current = now;
        if (document.visibilityState === 'visible') {
          loadData();
        }
      }
    }
  });

  useEffect(() => {
    loadData();
    // Sondeo pasivo de respaldo cada 15s para sincronizar estado BD
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedSistema, selectedPlanta, selectedSeccion]);


  // Filtrar dispositivos estrictamente según planta, sección y sistema seleccionados
  const filteredDispositivos = useMemo(() => {
    let result = dispositivos;

    if (selectedSistema !== 'seleccionar' && selectedSistema !== 'todas') {
      const matchSys = (d: any) => {
        const sysId = typeof d.sistema === 'object' ? String(d.sistema?.id || '') : String(d.sistema || '');
        const sysName = typeof d.sistema === 'object' ? String(d.sistema?.nombre || '') : '';
        return sysId === selectedSistema || sysName === selectedSistema;
      };
      const filtered = result.filter(matchSys);
      return filtered.length > 0 ? filtered : result;
    }

    if (selectedSeccion !== 'seleccionar' && selectedSeccion !== 'todas') {
      const matchSec = (d: any) => {
        const secId = typeof d.seccion === 'object' ? String(d.seccion?.id || '') : String(d.seccion || '');
        return secId === selectedSeccion;
      };
      const filtered = result.filter(matchSec);
      return filtered.length > 0 ? filtered : result;
    }

    if (selectedPlanta !== 'seleccionar' && selectedPlanta !== 'todas') {
      const filtered = result.filter(d => {
        const seccionObj = secciones.find(s => String(s.id) === String(typeof d.seccion === 'object' ? d.seccion?.id : d.seccion));
        if (seccionObj && String(seccionObj.fabrica) === selectedPlanta) return true;
        const sistemaObj = sistemas.find(s => String(s.id) === String(typeof d.sistema === 'object' ? d.sistema?.id : d.sistema));
        return sistemaObj ? String(sistemaObj.fabrica) === selectedPlanta : false;
      });
      return filtered.length > 0 ? filtered : result;
    }

    return result;
  }, [dispositivos, selectedPlanta, selectedSeccion, selectedSistema, secciones, sistemas]);

  // Filtrar unidades de almacenamiento estrictamente por sistema, sección o planta seleccionada
  const filteredUnidades = useMemo(() => {
    let result = unidadesAlmacenamiento;

    if (selectedSistema !== 'seleccionar' && selectedSistema !== 'todas') {
      const matchSys = (u: any) => {
        const sysId = typeof u.sistema === 'object' ? String(u.sistema?.id || '') : String(u.sistema || '');
        const sysName = typeof u.sistema === 'object' ? String(u.sistema?.nombre || '') : '';
        return sysId === selectedSistema || sysName === selectedSistema;
      };
      const filtered = result.filter(matchSys);
      return filtered.length > 0 ? filtered : result;
    }

    if (selectedSeccion !== 'seleccionar' && selectedSeccion !== 'todas') {
      const matchSec = (u: any) => {
        const secId = typeof u.seccion === 'object' ? String(u.seccion?.id || '') : String(u.seccion || '');
        return secId === selectedSeccion;
      };
      const filtered = result.filter(matchSec);
      return filtered.length > 0 ? filtered : result;
    }

    if (selectedPlanta !== 'seleccionar' && selectedPlanta !== 'todas') {
      const filtered = result.filter(u => {
        const sistemaObj = sistemas.find(s => String(s.id) === String(typeof u.sistema === 'object' ? u.sistema?.id : u.sistema));
        if (sistemaObj && String(sistemaObj.fabrica) === selectedPlanta) return true;
        const seccionObj = secciones.find(s => String(s.id) === String(typeof u.seccion === 'object' ? u.seccion?.id : u.seccion));
        return seccionObj ? String(seccionObj.fabrica) === selectedPlanta : false;
      });
      return filtered.length > 0 ? filtered : result;
    }

    return result;
  }, [unidadesAlmacenamiento, selectedPlanta, selectedSeccion, selectedSistema, sistemas, secciones]);

  const isSelectionIncomplete = selectedPlanta === 'seleccionar' || selectedSeccion === 'seleccionar' || selectedSistema === 'seleccionar';

  const savedPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Generate ReactFlow Nodes from registered devices and storage units with canonical P&ID topology (15 Componentes: 12 sistema + 3 tanques)
  const initialNodes = useMemo(() => {
    const defaultLayoutPositions: Record<string, { x: number; y: number }> = {
      'bomba_reposicion': { x: 40, y: 300 },
      'electrovalvula-1': { x: 160, y: 140 },
      'electrovalvula-2': { x: 160, y: 460 },
      'sensor_nivel_bombo1': { x: 320, y: 20 },
      'tank-1': { x: 320, y: 140 },
      'sensor_nivel_bombo2': { x: 320, y: 340 },
      'tank-2': { x: 320, y: 460 },
      'pump-1': { x: 520, y: 140 },
      'pump-2': { x: 520, y: 460 },
      'sensor-3': { x: 680, y: 140 },
      'sensor_caudal_02': { x: 680, y: 460 },
      'mixer-1': { x: 840, y: 300 },
      'sensor_nivel_mezcla': { x: 1000, y: 180 },
      'tank-3': { x: 1000, y: 300 },
      'bomba_mezcla': { x: 1180, y: 300 },
    };

    // Mapear lecturas directas de sensores de nivel ultrasónicos (en cm de 28cm vacío a 4cm lleno o porcentaje directo 0-100%)
    const levelSensorsMap: Record<string, { value: number; unit?: string }> = {};
    filteredDispositivos.forEach(d => {
      const canon = getCanonicalNodeId(d);
      const val = Number(d.valor_lectura);
      if (canon === 'sensor_nivel_bombo1') levelSensorsMap['tank-1'] = { value: val, unit: d.unidad_lectura };
      else if (canon === 'sensor_nivel_bombo2') levelSensorsMap['tank-2'] = { value: val, unit: d.unidad_lectura };
      else if (canon === 'sensor_nivel_mezcla') levelSensorsMap['tank-3'] = { value: val, unit: d.unidad_lectura };
    });

    const computeTankLevel = (info?: { value: number; unit?: string }, unitObj?: any, fallback = 50) => {
      if (unitObj && unitObj.capacidad && unitObj.capacidad > 0 && unitObj.volumen_actual !== undefined && unitObj.volumen_actual !== null) {
        return Math.round(Math.max(0, Math.min(100, ((unitObj.volumen_actual || 0) / unitObj.capacidad) * 100)));
      }
      if (info !== undefined && !isNaN(info.value)) {
        const val = info.value;
        if (info.unit === '%' || (val > 35 && val <= 100)) {
          return Math.round(Math.max(0, Math.min(100, val)));
        }
        if (val > 0 && val <= 35) {
          // Sensor ultrasónico calibrado (28cm = 0%, 4cm = 100%)
          return Math.round(Math.max(0, Math.min(100, ((28.0 - val) * 100.0) / 24.0)));
        }
        if (val === 0) return 0;
        return Math.round(Math.max(0, Math.min(100, val)));
      }
      return fallback;
    };

    const findDevice = (canonicalId: string) => {
      return filteredDispositivos.find(d => getCanonicalNodeId(d) === canonicalId || d.numero_serie === canonicalId);
    };

    const findUnit = (canonicalId: string) => {
      return filteredUnidades.find(u => getCanonicalNodeId(u) === canonicalId || u.node_id === canonicalId);
    };

    const nodesList: Node[] = [];

    const showMockFallbacks = selectedSistema === 'todas' || selectedSistema === 'seleccionar';

    // 1. BOMBA REPOSICIÓN
    const devRepo = findDevice('bomba_reposicion');
    if (devRepo || showMockFallbacks) {
      const isRepoActive = isDeviceActive(devRepo);
      nodesList.push({
        id: 'bomba_reposicion',
        type: 'pump',
        position: defaultLayoutPositions['bomba_reposicion'],
        data: {
          label: devRepo?.nombre || 'Bomba Reposición',
          numero_serie: devRepo?.numero_serie || 'bomba_reposicion',
          isRunning: isRepoActive,
          rpm: isRepoActive ? 1450 : 0,
          power: isRepoActive ? 75 : 0,
          estado: devRepo?.estado || 'ONLINE',
        }
      });
    }

    // 2. ELECTROVÁLVULA 1 (Válvula Rep. A)
    const devValv1 = findDevice('electrovalvula-1');
    if (devValv1 || showMockFallbacks) {
      const isValv1Active = isDeviceActive(devValv1);
      nodesList.push({
        id: 'electrovalvula-1',
        type: 'valve',
        position: defaultLayoutPositions['electrovalvula-1'],
        data: {
          label: devValv1?.nombre || 'Válvula Rep. A',
          numero_serie: devValv1?.numero_serie || 'electrovalvula-1',
          isOpen: isValv1Active,
          flowRate: isValv1Active ? 12.5 : 0,
          estado: devValv1?.estado || 'ONLINE',
        }
      });
    }

    // 3. ELECTROVÁLVULA 2 (Válvula Rep. B)
    const devValv2 = findDevice('electrovalvula-2');
    if (devValv2 || showMockFallbacks) {
      const isValv2Active = isDeviceActive(devValv2);
      nodesList.push({
        id: 'electrovalvula-2',
        type: 'valve',
        position: defaultLayoutPositions['electrovalvula-2'],
        data: {
          label: devValv2?.nombre || 'Válvula Rep. B',
          numero_serie: devValv2?.numero_serie || 'electrovalvula-2',
          isOpen: isValv2Active,
          flowRate: isValv2Active ? 12.5 : 0,
          estado: devValv2?.estado || 'ONLINE',
        }
      });
    }

    // 4. SENSOR DE NIVEL BOMBO 1 (Ultrasónico)
    const devLvl1 = findDevice('sensor_nivel_bombo1');
    if (devLvl1 || showMockFallbacks) {
      const valLvl1 = devLvl1 ? Number(devLvl1.valor_lectura || 0) : 0;
      nodesList.push({
        id: 'sensor_nivel_bombo1',
        type: 'sensor',
        position: defaultLayoutPositions['sensor_nivel_bombo1'],
        data: {
          label: devLvl1?.nombre || 'Sensor Nivel Bombo 1',
          numero_serie: devLvl1?.numero_serie || 'sensor_nivel_bombo1',
          value: valLvl1,
          unit: 'cm',
          type: 'level',
          status: (valLvl1 > 0 && valLvl1 < 35) ? 'normal' : 'warning',
          estado: devLvl1?.estado || 'ONLINE',
        }
      });
    }

    // 5. TANQUE A (tank-1)
    const unit1 = findUnit('tank-1');
    if (unit1 || showMockFallbacks) {
      const cap1 = unit1?.capacidad || 1000;
      const level1 = computeTankLevel(levelSensorsMap['tank-1'], unit1, 50);
      nodesList.push({
        id: 'tank-1',
        type: 'tank',
        position: defaultLayoutPositions['tank-1'],
        data: {
          label: unit1?.nombre || 'Tanque A (Líquido 1)',
          node_id: 'tank-1',
          level: level1,
          temperature: unit1?.temperatura || 25,
          capacity: cap1,
          volume: Math.round((level1 / 100) * cap1),
          unit: 'ml',
          status: (unit1?.estado || 'ACTIVE').toLowerCase(),
          content: unit1?.contenido || 'Líquido 1 (ml)',
        }
      });
    }

    // 6. SENSOR DE NIVEL BOMBO 2 (Ultrasónico)
    const devLvl2 = findDevice('sensor_nivel_bombo2');
    if (devLvl2 || showMockFallbacks) {
      const valLvl2 = devLvl2 ? Number(devLvl2.valor_lectura || 0) : 0;
      nodesList.push({
        id: 'sensor_nivel_bombo2',
        type: 'sensor',
        position: defaultLayoutPositions['sensor_nivel_bombo2'],
        data: {
          label: devLvl2?.nombre || 'Sensor Nivel Bombo 2',
          numero_serie: devLvl2?.numero_serie || 'sensor_nivel_bombo2',
          value: valLvl2,
          unit: 'cm',
          type: 'level',
          status: (valLvl2 > 0 && valLvl2 < 35) ? 'normal' : 'warning',
          estado: devLvl2?.estado || 'ONLINE',
        }
      });
    }

    // 7. TANQUE B (tank-2)
    const unit2 = findUnit('tank-2');
    if (unit2 || showMockFallbacks) {
      const cap2 = unit2?.capacidad || 800;
      const level2 = computeTankLevel(levelSensorsMap['tank-2'], unit2, 45);
      nodesList.push({
        id: 'tank-2',
        type: 'tank',
        position: defaultLayoutPositions['tank-2'],
        data: {
          label: unit2?.nombre || 'Tanque B (Líquido 2)',
          node_id: 'tank-2',
          level: level2,
          temperature: unit2?.temperatura || 28,
          capacity: cap2,
          volume: Math.round((level2 / 100) * cap2),
          unit: 'ml',
          status: (unit2?.estado || 'ACTIVE').toLowerCase(),
          content: unit2?.contenido || 'Líquido 2 (ml)',
        }
      });
    }

    // 8. BOMBA A (pump-1 / bomba1)
    const devPump1 = findDevice('pump-1');
    if (devPump1 || showMockFallbacks) {
      const isPump1Active = isDeviceActive(devPump1);
      nodesList.push({
        id: 'pump-1',
        type: 'pump',
        position: defaultLayoutPositions['pump-1'],
        data: {
          label: devPump1?.nombre || 'Bomba P1',
          numero_serie: devPump1?.numero_serie || 'bomba1',
          isRunning: isPump1Active,
          rpm: isPump1Active ? 1450 : 0,
          power: isPump1Active ? 75 : 0,
          estado: devPump1?.estado || 'ONLINE',
        }
      });
    }

    // 9. BOMBA B (pump-2 / bomba2)
    const devPump2 = findDevice('pump-2');
    if (devPump2 || showMockFallbacks) {
      const isPump2Active = isDeviceActive(devPump2);
      nodesList.push({
        id: 'pump-2',
        type: 'pump',
        position: defaultLayoutPositions['pump-2'],
        data: {
          label: devPump2?.nombre || 'Bomba P2',
          numero_serie: devPump2?.numero_serie || 'bomba2',
          isRunning: isPump2Active,
          rpm: isPump2Active ? 1450 : 0,
          power: isPump2Active ? 75 : 0,
          estado: devPump2?.estado || 'ONLINE',
        }
      });
    }

    // 10. SENSOR DE FLUJO A (sensor-3 / caudalímetro 1)
    const devFlow1 = findDevice('sensor-3');
    if (devFlow1 || showMockFallbacks) {
      const valFlow1 = devFlow1 ? Number(devFlow1.valor_lectura || 0) : 0;
      const isPump1Active = isDeviceActive(devPump1);
      nodesList.push({
        id: 'sensor-3',
        type: 'sensor',
        position: defaultLayoutPositions['sensor-3'],
        data: {
          label: devFlow1?.nombre || 'Caudalímetro 1',
          numero_serie: devFlow1?.numero_serie || 'sensor-3',
          value: valFlow1,
          unit: 'ml',
          type: 'flow',
          status: (valFlow1 > 0 || isPump1Active) ? 'normal' : 'warning',
          estado: devFlow1?.estado || 'ONLINE',
        }
      });
    }

    // 11. SENSOR DE FLUJO B (sensor_caudal_02 / caudalímetro 2)
    const devFlow2 = findDevice('sensor_caudal_02');
    if (devFlow2 || showMockFallbacks) {
      const valFlow2 = devFlow2 ? Number(devFlow2.valor_lectura || 0) : 0;
      const isPump2Active = isDeviceActive(devPump2);
      nodesList.push({
        id: 'sensor_caudal_02',
        type: 'sensor',
        position: defaultLayoutPositions['sensor_caudal_02'],
        data: {
          label: devFlow2?.nombre || 'Caudalímetro 2',
          numero_serie: devFlow2?.numero_serie || 'sensor_caudal_02',
          value: valFlow2,
          unit: 'ml',
          type: 'flow',
          status: (valFlow2 > 0 || isPump2Active) ? 'normal' : 'warning',
          estado: devFlow2?.estado || 'ONLINE',
        }
      });
    }

    // 12. MEZCLADOR (mixer-1)
    const devMixer = findDevice('mixer-1');
    if (devMixer || showMockFallbacks) {
      const isMixerActive = isDeviceActive(devMixer) || procesoEstado === 1;

      let tiempoStr = '';
      if (procesoHoras && procesoHoras > 0) {
        tiempoStr = `${procesoHoras}h ${procesoMinutos || 0}m`;
      } else if (procesoMinutos && procesoMinutos > 0) {
        tiempoStr = `${procesoMinutos} min`;
      }

      nodesList.push({
        id: 'mixer-1',
        type: 'mixer',
        position: defaultLayoutPositions['mixer-1'],
        data: {
          label: devMixer?.nombre || 'Mezclador M1',
          numero_serie: devMixer?.numero_serie || 'mixer-1',
          isRunning: isMixerActive,
          speed: isMixerActive ? 120 : 0,
          temperature: 25,
          estado: devMixer?.estado || 'ONLINE',
          procesoEstado: procesoEstado ?? undefined,
          tiempoRestanteStr: tiempoStr || undefined,
        }
      });
    }

    // 13. SENSOR DE NIVEL BOMBO MEZCLA (Ultrasónico)
    const devLvl3 = findDevice('sensor_nivel_mezcla');
    if (devLvl3 || showMockFallbacks) {
      const valLvl3 = devLvl3 ? Number(devLvl3.valor_lectura || 0) : 0;
      nodesList.push({
        id: 'sensor_nivel_mezcla',
        type: 'sensor',
        position: defaultLayoutPositions['sensor_nivel_mezcla'],
        data: {
          label: devLvl3?.nombre || 'Sensor Nivel Mezcla',
          numero_serie: devLvl3?.numero_serie || 'sensor_nivel_mezcla',
          value: valLvl3,
          unit: 'cm',
          type: 'level',
          status: (valLvl3 > 0 && valLvl3 < 35) ? 'normal' : 'warning',
          estado: devLvl3?.estado || 'ONLINE',
        }
      });
    }

    // 14. TANQUE SALIDA / MEZCLA (tank-3)
    const unit3 = findUnit('tank-3');
    if (unit3 || showMockFallbacks) {
      const cap3 = unit3?.capacidad || 1500;
      const level3 = computeTankLevel(levelSensorsMap['tank-3'], unit3, 30);
      nodesList.push({
        id: 'tank-3',
        type: 'tank',
        position: defaultLayoutPositions['tank-3'],
        data: {
          label: unit3?.nombre || 'Tanque Salida (Mezcla)',
          node_id: 'tank-3',
          level: level3,
          temperature: unit3?.temperatura || 26,
          capacity: cap3,
          volume: Math.round((level3 / 100) * cap3),
          unit: 'ml',
          status: (unit3?.estado || 'ACTIVE').toLowerCase(),
          content: unit3?.contenido || 'Mezcla Homogénea (ml)',
        }
      });
    }

    // 15. BOMBA DE MEZCLA / VACIADO (bomba_mezcla)
    const devBombaM = findDevice('bomba_mezcla');
    if (devBombaM || showMockFallbacks) {
      const isBombaMActive = isDeviceActive(devBombaM);
      nodesList.push({
        id: 'bomba_mezcla',
        type: 'pump',
        position: defaultLayoutPositions['bomba_mezcla'],
        data: {
          label: devBombaM?.nombre || 'Bomba de Mezcla',
          numero_serie: devBombaM?.numero_serie || 'bomba_mezcla',
          isRunning: isBombaMActive,
          rpm: isBombaMActive ? 1450 : 0,
          power: isBombaMActive ? 75 : 0,
          estado: devBombaM?.estado || 'ONLINE',
        }
      });
    }

    // Agregar cualquier dispositivo físico adicional registrado que no forme parte de la topología base de 15 nodos
    const coreCanonicalIds = new Set([
      'bomba_reposicion', 'electrovalvula-1', 'electrovalvula-2', 'tank-1', 'tank-2',
      'pump-1', 'pump-2', 'sensor-3', 'sensor_caudal_02', 'mixer-1', 'tank-3', 'bomba_mezcla',
      'sensor_nivel_bombo1', 'sensor_nivel_bombo2', 'sensor_nivel_mezcla'
    ]);
    const ignoredVirtualIds = new Set(['proceso', 'desechar', 'bomba1', 'bomba2']);

    let extraCount = 0;
    filteredDispositivos.forEach(dev => {
      const canon = getCanonicalNodeId(dev);
      const cat = (dev.categoria || '').toUpperCase();
      const numSerie = String(dev.numero_serie || '').toLowerCase();
      
      // Excluir dispositivos virtuales, PLCs de monitoreo o alias duplicados
      if (
        !coreCanonicalIds.has(canon) &&
        !ignoredVirtualIds.has(canon) &&
        !ignoredVirtualIds.has(numSerie) &&
        cat !== 'PLC' &&
        cat !== 'HMI' &&
        cat !== 'OTRO'
      ) {
        const isAct = isDeviceActive(dev);
        let nodeType: 'pump' | 'valve' | 'mixer' | 'sensor' = 'sensor';
        if (cat === 'BOMBA') nodeType = 'pump';
        else if (cat === 'VALVULA') nodeType = 'valve';
        else if (cat === 'MEZCLADORA') nodeType = 'mixer';

        nodesList.push({
          id: `dev_${dev.id}_${dev.numero_serie}`,
          type: nodeType,
          position: { x: 50 + (extraCount % 4) * 180, y: 550 + Math.floor(extraCount / 4) * 160 },
          data: {
            label: dev.nombre || dev.numero_serie,
            numero_serie: dev.numero_serie,
            isRunning: isAct,
            isOpen: isAct,
            value: dev.valor_lectura !== null ? Number(dev.valor_lectura) : 0,
            unit: dev.unidad_medida || 'ml',
            type: 'flow',
            status: dev.estado === 'ONLINE' ? 'normal' : 'warning',
            estado: dev.estado || 'ONLINE',
          }
        });
        extraCount++;
      }
    });

    return nodesList;
  }, [filteredDispositivos, filteredUnidades, selectedPlanta, selectedSeccion, selectedSistema]);

  // Initial edges template (15 conexiones: 12 tuberías de flujo + 3 telemetrías de nivel ultrasónico)
  const defaultInitialEdges = useMemo(() => {
    return [
      { id: 'e-repo-1', source: 'bomba_reposicion', target: 'electrovalvula-1', animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
      { id: 'e-repo-2', source: 'bomba_reposicion', target: 'electrovalvula-2', animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
      { id: 'e-valv-1', source: 'electrovalvula-1', target: 'tank-1', animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
      { id: 'e-valv-2', source: 'electrovalvula-2', target: 'tank-2', animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
      { id: 'e-lvl-1', source: 'sensor_nivel_bombo1', target: 'tank-1', animated: false, style: { stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '4,4' } },
      { id: 'e-lvl-2', source: 'sensor_nivel_bombo2', target: 'tank-2', animated: false, style: { stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '4,4' } },
      { id: 'e-tank-1', source: 'tank-1', target: 'pump-1', animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
      { id: 'e-pump-1', source: 'pump-1', target: 'sensor-3', animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
      { id: 'e-flow-1', source: 'sensor-3', target: 'mixer-1', animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
      { id: 'e-tank-2', source: 'tank-2', target: 'pump-2', animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
      { id: 'e-pump-2', source: 'pump-2', target: 'sensor_caudal_02', animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
      { id: 'e-flow-2', source: 'sensor_caudal_02', target: 'mixer-1', animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
      { id: 'e-mix-1', source: 'mixer-1', target: 'tank-3', animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
      { id: 'e-lvl-3', source: 'sensor_nivel_mezcla', target: 'tank-3', animated: false, style: { stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '4,4' } },
      { id: 'e-mix-2', source: 'tank-3', target: 'bomba_mezcla', animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
    ];
  }, []);

  const [isLocked, setIsLocked] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Helper para resolver el ID numérico del sistema a partir de selectedSistema
  const resolveSistemaId = (sysIdOrName?: string): string => {
    if (sysIdOrName && /^\d+$/.test(sysIdOrName)) return sysIdOrName;
    if (sistemas && sistemas.length > 0) {
      if (sysIdOrName && sysIdOrName !== 'todas' && sysIdOrName !== 'seleccionar') {
        const found = sistemas.find(s => 
          String(s.id) === sysIdOrName || 
          s.nombre?.toLowerCase() === sysIdOrName.toLowerCase() ||
          s.nombre?.toLowerCase().replace(/\s+/g, '_') === sysIdOrName.toLowerCase() ||
          sysIdOrName.toLowerCase().includes(s.nombre?.toLowerCase())
        );
        if (found) return String(found.id);
      }
      return String(sistemas[0].id);
    }
    return '1';
  };

  // Helper para cargar layout del backend PostgreSQL
  const loadBackendLayout = async (sistemaId: string) => {
    const targetId = resolveSistemaId(sistemaId);
    if (!targetId) return null;
    try {
      const resp = await apiFetch(`/api/v1/sistemas/${targetId}/`);
      if (resp.ok) {
        const sys = await resp.json();
        if (sys.diagrama_layout_json) {
          let parsed = sys.diagrama_layout_json;
          while (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch {
              break;
            }
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error leyendo layout de PostgreSQL backend:", e);
    }
    return null;
  };

  // Helper para guardar layout en backend PostgreSQL
  const saveBackendLayout = async (sistemaId: string, layoutData: any): Promise<boolean> => {
    const targetId = resolveSistemaId(sistemaId);
    if (!targetId) return false;
    try {
      const resp = await apiFetch(`/api/v1/sistemas/${targetId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagrama_layout_json: JSON.stringify(layoutData)
        })
      });
      return resp.ok;
    } catch (e) {
      console.warn("Error guardando layout en PostgreSQL backend:", e);
      return false;
    }
  };

  // Cargar layout (prioridad: PostgreSQL DB central -> fallback a localStorage)
  useEffect(() => {
    let isMounted = true;

    const initLayout = async () => {
      let cachedPositions: Record<string, { x: number; y: number }> = {};
      let cachedEdges: Edge[] = defaultInitialEdges;
      let loadedFromDb = false;

      // 1. Intentar cargar desde backend PostgreSQL
      const sysIdToLoad = resolveSistemaId(selectedSistema);
      if (sysIdToLoad) {
        const dbLayout = await loadBackendLayout(sysIdToLoad);
        if (dbLayout && typeof dbLayout === 'object') {
          if (dbLayout.positions && typeof dbLayout.positions === 'object') cachedPositions = dbLayout.positions;
          if (dbLayout.edges && Array.isArray(dbLayout.edges) && dbLayout.edges.length > 0) cachedEdges = dbLayout.edges;
          loadedFromDb = true;
        }
      }

      // 2. Fallback a localStorage si no hay layout guardado en BD
      if (!loadedFromDb) {
        try {
          const cached = localStorage.getItem(storageKey);
          if (cached) {
            let parsed = JSON.parse(cached);
            while (typeof parsed === 'string') {
              try { parsed = JSON.parse(parsed); } catch { break; }
            }
            if (parsed && typeof parsed === 'object') {
              if (parsed.positions) cachedPositions = parsed.positions;
              if (parsed.edges && Array.isArray(parsed.edges) && parsed.edges.length > 0) cachedEdges = parsed.edges;
            }
          }
        } catch (e) {
          console.warn("Error leyendo diagramas de localStorage:", e);
        }
      }

      if (!isMounted) return;

      savedPositionsRef.current = { ...savedPositionsRef.current, ...cachedPositions };

      const loadedNodes = initialNodes.map(node => {
        const savedPos = savedPositionsRef.current[node.id] ||
                         (node.data?.node_id && savedPositionsRef.current[node.data.node_id]) ||
                         (node.data?.numero_serie && savedPositionsRef.current[node.data.numero_serie]) ||
                         node.position;
        return {
          ...node,
          position: savedPos
        };
      });

      setNodes(loadedNodes);
      setEdges(cachedEdges);
    };

    initLayout();
    return () => { isMounted = false; };
  }, [selectedSistema, sistemas]);

  // Merge updated device telemetry into existing nodes WITHOUT resetting node positions or looping!
  useEffect(() => {
    setNodes(prevNodes => {
      if (!prevNodes || prevNodes.length === 0) {
        return initialNodes;
      }

      const freshMap = new Map(initialNodes.map(n => [n.id, n]));
      let hasAnyChange = false;

      // 1. Filtrar nodos que fueron eliminados de la BD o desasignados del sistema
      const survivingNodes = prevNodes.filter(prev => {
        const exists = freshMap.has(prev.id);
        if (!exists) hasAnyChange = true;
        return exists;
      });

      // 2. Actualizar telemetría de los nodos sobrevivientes
      const updatedNodes = survivingNodes.map(prev => {
        const fresh = freshMap.get(prev.id)!;
        const prevData = prev.data || {};
        const freshData = fresh.data || {};
        const isDataEqual = Object.keys(freshData).every(k => freshData[k] === prevData[k]) &&
                            Object.keys(prevData).every(k => prevData[k] === freshData[k]);

        const currentPos = savedPositionsRef.current[prev.id] || prev.position;

        if (isDataEqual && prev.position.x === currentPos.x && prev.position.y === currentPos.y) return prev;

        hasAnyChange = true;
        return {
          ...prev,
          position: currentPos,
          data: { ...fresh.data, _ts: Date.now() } // Keep position intact, update data and force ReactFlow node re-render
        };
      });

      // 3. Incorporar nodos dados de alta recientemente
      const prevIds = new Set(prevNodes.map(p => p.id));
      initialNodes.forEach(fresh => {
        if (!prevIds.has(fresh.id)) {
          hasAnyChange = true;
          updatedNodes.push(fresh);
        }
      });

      // Crucial: return identical array if no values changed to break infinite re-render loop
      return hasAnyChange ? updatedNodes : prevNodes;
    });
  }, [initialNodes]);

  // Animar tuberías y flujo dinámico según el estado de bombas, mezclador y válvulas
  useEffect(() => {
    const activeMap = new Map<string, boolean>();
    nodes.forEach(n => {
      const isRunning = Boolean(
        n.data?.isRunning ||
        n.data?.isOpen ||
        (n.data?.type === 'flow' && Number(n.data?.value) > 0)
      );
      activeMap.set(n.id, isRunning);
      if (n.data?.numero_serie) {
        activeMap.set(n.data.numero_serie, isRunning);
      }
      if (n.id.startsWith('dev_')) {
        const raw = n.id.replace('dev_', '').split('_')[0];
        activeMap.set(raw, isRunning);
      }
    });

    setEdges(prevEdges => {
      if (!prevEdges || prevEdges.length === 0) return prevEdges;
      let hasChanges = false;
      const updated = prevEdges.map(edge => {
        const sourceActive = activeMap.get(edge.source) || false;
        const targetActive = activeMap.get(edge.target) || false;
        let isActive = sourceActive || targetActive;
        if (edge.id === 'e-flow-1' && (activeMap.get('pump-1') || activeMap.get('sensor-3'))) isActive = true;
        if (edge.id === 'e-flow-2' && (activeMap.get('pump-2') || activeMap.get('sensor_caudal_02'))) isActive = true;
        if (edge.id === 'e-valv-1' && (activeMap.get('bomba_reposicion') || activeMap.get('electrovalvula-1'))) isActive = true;
        if (edge.id === 'e-valv-2' && (activeMap.get('bomba_reposicion') || activeMap.get('electrovalvula-2'))) isActive = true;
        if (edge.id === 'e-mix-1' && activeMap.get('mixer-1')) isActive = true;
        if (edge.id === 'e-mix-2' && activeMap.get('bomba_mezcla')) isActive = true;

        if (edge.animated !== isActive) {
          hasChanges = true;
        }

        return {
          ...edge,
          animated: isActive,
          style: {
            ...edge.style,
            stroke: isActive ? '#06b6d4' : (edge.style?.stroke || 'hsl(var(--primary))'),
            strokeWidth: isActive ? 3 : (edge.style?.strokeWidth || 2),
            filter: isActive ? 'drop-shadow(0 0 6px rgba(6,182,212,0.8))' : 'none'
          }
        };
      });
      return hasChanges ? updated : prevEdges;
    });
  }, [nodes]);

  // Handle drag stop to auto-persist node positions safely in PostgreSQL & localStorage
  const onNodeDragStop = useCallback((_: any, node: Node) => {
    savedPositionsRef.current[node.id] = node.position;

    setNodes(prev => {
      const updated = prev.map(n => n.id === node.id ? { ...n, position: node.position } : n);
      nodesRef.current = updated;

      try {
        const positions: Record<string, { x: number; y: number }> = { ...savedPositionsRef.current };
        updated.forEach(n => {
          positions[n.id] = n.position;
        });
        savedPositionsRef.current = positions;

        const dataToSave = {
          positions,
          edges: edgesRef.current,
          saved_at: new Date().toISOString()
        };

        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        const targetSysId = resolveSistemaId(selectedSistema);
        if (targetSysId) {
          saveBackendLayout(targetSysId, dataToSave);
        }
      } catch (e) {
        console.warn("Error guardando posición de nodo en drag stop:", e);
      }

      return updated;
    });
  }, [storageKey, selectedSistema, sistemas]);

  // Connect edges interactively by dragging connection lines
  const onConnect = useCallback(
    (params: Connection) => {
      let updatedEdges: Edge[] = [];
      setEdges((eds) => {
        updatedEdges = addEdge({ ...params, animated: false, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } }, eds);
        edgesRef.current = updatedEdges;
        return updatedEdges;
      });

      setTimeout(() => {
        try {
          const cached = localStorage.getItem(storageKey);
          let layout: any = {};
          if (cached) {
            try { layout = JSON.parse(cached); } catch {}
          }
          const dataToSave = { ...layout, edges: updatedEdges };
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
          if (selectedSistema && selectedSistema !== 'todas' && selectedSistema !== 'seleccionar') {
            saveBackendLayout(selectedSistema, dataToSave);
          }
        } catch (e) {}
      }, 50);
    },
    [storageKey, selectedSistema]
  );

  // Save current node positions and connection edges for this system
  const handleSaveDiagram = async () => {
    const positions: Record<string, { x: number; y: number }> = {};
    nodesRef.current.forEach(n => {
      positions[n.id] = n.position;
    });

    const dataToSave = {
      positions,
      edges: edgesRef.current,
      saved_at: new Date().toISOString()
    };

    localStorage.setItem(storageKey, JSON.stringify(dataToSave));

    let targetSysId = selectedSistema;
    if ((!targetSysId || targetSysId === 'todas' || targetSysId === 'seleccionar') && sistemas.length > 0) {
      targetSysId = String(sistemas[0].id);
    }

    if (targetSysId && targetSysId !== 'todas' && targetSysId !== 'seleccionar') {
      const ok = await saveBackendLayout(targetSysId, dataToSave);
      if (ok) {
        toast({
          title: "✅ Diagrama Guardado en Servidor (Centralizado)",
          description: `La distribución y conexiones de ${nodesRef.current.length} componentes se guardaron en la base de datos PostgreSQL.`,
        });
      } else {
        toast({
          title: "❌ Error al Guardar en Base de Datos",
          description: "No se pudo actualizar la distribución en PostgreSQL.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "✅ Diagrama Guardado Localmente",
        description: `Se guardó la distribución de ${nodesRef.current.length} componentes y ${edgesRef.current.length} conexiones.`,
      });
    }
  };

  // Reset positions to default grid layout
  const handleResetDiagram = async () => {
    localStorage.removeItem(storageKey);
    const resetNodes = initialNodes.map(node => ({ ...node }));
    setNodes(resetNodes);
    setEdges(defaultInitialEdges);

    if (selectedSistema && selectedSistema !== 'todas' && selectedSistema !== 'seleccionar') {
      await saveBackendLayout(selectedSistema, { positions: {}, edges: defaultInitialEdges });
    }

    toast({
      title: "🔄 Diagrama Reiniciado",
      description: "Se restauró la posición inicial de fábrica de los componentes.",
    });
  };

  const sysName = useMemo(() => {
    if (selectedSistema !== 'todas') {
      const sys = sistemas.find(s => String(s.id) === selectedSistema);
      return sys ? `${sys.nombre} (${sys.tipo_sistema || 'GENERAL'})` : 'Sistema Seleccionado';
    }
    if (selectedSeccion !== 'todas') {
      const sec = secciones.find(s => String(s.id) === selectedSeccion);
      return sec ? `Sección: ${sec.nombre}` : 'Sección Seleccionada';
    }
    return 'Planta General';
  }, [selectedSistema, selectedSeccion, sistemas, secciones]);

  // Delete edge when clicked on the canvas
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setEdges((eds) => {
        const updated = eds.filter((e) => e.id !== edge.id);
        try {
          const cached = localStorage.getItem(storageKey);
          const layout = cached ? JSON.parse(cached) : {};
          localStorage.setItem(storageKey, JSON.stringify({ ...layout, edges: updated }));
        } catch (e) {}
        toast({
          title: "🗑️ Conexión Eliminada",
          description: `Se eliminó la conexión entre nodos.`,
        });
        return updated;
      });
    },
    [setEdges, storageKey]
  );

  return (
    <div className="w-full h-[600px] border border-border rounded-lg overflow-hidden bg-background relative">
      {/* Floating Canvas Controls Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 shadow-lg">
        <Badge variant="outline" className="text-cyan-400 border-cyan-500/40 text-xs px-2 font-mono gap-1">
          <Cpu className="h-3.5 w-3.5" />
          {nodes.length} Componentes
        </Badge>
        


        <Button
          size="sm"
          variant="secondary"
          onClick={handleSaveDiagram}
          className="h-8 px-2.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium gap-1.5"
          title="Guardar las posiciones y conexiones actuales del diagrama"
        >
          <Save className="h-3.5 w-3.5" />
          Guardar Diagrama
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleResetDiagram}
          className="h-8 px-2.5 text-xs border-amber-500/80 bg-amber-500/20 text-amber-300 hover:bg-amber-400 hover:text-black font-semibold transition-colors shadow-sm gap-1.5"
          title="Resetear distribución a posiciones predeterminadas"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Resetear distribución</span>
        </Button>
      </div>

      {/* Prompt if selection incomplete */}
      {isSelectionIncomplete ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 text-slate-300 p-6 text-center">
          <Layers className="h-12 w-12 text-cyan-400 mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-slate-100">Selecciona un Sistema</h3>
          <p className="text-sm text-slate-400 max-w-md mt-1">
            Para evitar sobrecargar el sistema, selecciona una <strong className="text-cyan-300">Planta</strong>, <strong className="text-cyan-300">Sección</strong> y <strong className="text-cyan-300">Sistema</strong> en la barra superior para visualizar sus componentes registrados.
          </p>
        </div>
      ) : nodes.length === 0 && !loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 text-slate-300 p-6 text-center">
          <AlertCircle className="h-12 w-12 text-amber-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-100">Sin componentes dados de alta</h3>
          <p className="text-sm text-slate-400 max-w-md mt-1">
            No se encontraron sensores en <code className="text-cyan-400">/sensores</code> ni tanques en <code className="text-cyan-400">/almacenamiento</code> asignados a <strong className="text-slate-200">{sysName}</strong>.
          </p>
          <p className="text-xs text-slate-500 mt-3">
            Registra los dispositivos desde los módulos de gestión para visualizarlos y conectarlos aquí.
          </p>
        </div>
      )}

      {/* ReactFlow Canvas */}
      <ReactFlow
        nodes={isSelectionIncomplete ? [] : nodes}
        edges={isSelectionIncomplete ? [] : edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        deleteKeyCode={['Backspace', 'Delete']}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-950"
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls
          className="!bg-slate-900 !border !border-slate-700 !rounded-lg overflow-hidden shadow-xl [&>button]:!bg-slate-900 [&>button]:!border-b [&>button]:!border-slate-800 [&>button]:!text-cyan-400 [&>button:hover]:!bg-slate-800 [&_svg]:!fill-cyan-400 [&_svg]:!stroke-cyan-400"
        />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'tank') return '#0284c7';
            if (n.type === 'pump') return '#10b981';
            if (n.type === 'valve') return '#f59e0b';
            return '#6366f1';
          }}
          className="bg-slate-900/90 border-slate-700 rounded-md"
        />
      </ReactFlow>
    </div>
  );
};

export default ScadaFlowDiagram;
