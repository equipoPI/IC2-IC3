import { Handle, Position } from '@xyflow/react';
import { RotateCw, Thermometer } from 'lucide-react';

interface MixerNodeData {
  label: string;
  isRunning: boolean;
  speed: number;
  temperature: number;
  procesoEstado?: number;
  tiempoRestanteStr?: string;
}

const MixerNode = ({ data }: { data: MixerNodeData }) => {
  return (
    <div className={`bg-card rounded-lg border-2 ${data.procesoEstado === 3 ? 'border-amber-500' : data.isRunning ? 'border-info' : 'border-muted'} p-3 min-w-[135px] shadow-lg relative`}>
      <Handle type="target" position={Position.Left} id="target-left" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Left} id="source-left" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />

      <Handle type="target" position={Position.Top} id="target-top" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Top} id="source-top" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />
      
      <div className="text-xs font-semibold text-foreground mb-2 text-center">
        {data.label}
      </div>

      {/* Mixer visualization */}
      <div className="flex justify-center mb-2">
        <div className="relative w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center">
          <RotateCw 
            className={`h-8 w-8 ${data.procesoEstado === 3 ? 'text-amber-400' : data.isRunning ? 'text-info animate-spin' : 'text-muted-foreground'}`}
            style={{ animationDuration: '1.5s' }}
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col items-center gap-1 mb-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          data.procesoEstado === 3
            ? 'bg-amber-500/20 text-amber-400 border border-amber-600/50 animate-pulse'
            : data.isRunning 
            ? 'bg-info/20 text-info' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {data.procesoEstado === 3 ? '⏸️ PAUSADO' : data.isRunning ? 'ACTIVO' : 'DETENIDO'}
        </span>
        {data.tiempoRestanteStr && (
          <span className="text-[10px] font-mono font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-cyan-700/60 animate-pulse shadow-sm">
            ⏱️ {data.tiempoRestanteStr}
          </span>
        )}
      </div>



      <Handle type="source" position={Position.Right} id="source-right" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Right} id="target-right" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />

      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />
    </div>
  );
};

export default MixerNode;
