import { Handle, Position } from '@xyflow/react';
import { RotateCw, Thermometer } from 'lucide-react';

interface MixerNodeData {
  label: string;
  isRunning: boolean;
  speed: number;
  temperature: number;
}

const MixerNode = ({ data }: { data: MixerNodeData }) => {
  return (
    <div className={`bg-card rounded-lg border-2 ${data.isRunning ? 'border-info' : 'border-muted'} p-3 min-w-[130px] shadow-lg relative`}>
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
            className={`h-8 w-8 ${data.isRunning ? 'text-info animate-spin' : 'text-muted-foreground'}`}
            style={{ animationDuration: '1.5s' }}
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex justify-center mb-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          data.isRunning 
            ? 'bg-info/20 text-info' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {data.isRunning ? 'ACTIVO' : 'DETENIDO'}
        </span>
      </div>

      {/* Data display */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Velocidad:</span>
          <span className="font-mono text-foreground">{data.speed} rpm</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-1">
            <Thermometer className="h-3 w-3" />
            <span>Temp:</span>
          </div>
          <span className="font-mono text-foreground">{data.temperature}°C</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="source-right" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Right} id="target-right" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />

      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />
    </div>
  );
};

export default MixerNode;
