import { Handle, Position } from '@xyflow/react';
import { Cog, Zap } from 'lucide-react';

interface PumpNodeData {
  label: string;
  isRunning: boolean;
  rpm: number;
  power: number;
}

const PumpNode = ({ data }: { data: PumpNodeData }) => {
  return (
    <div className={`bg-card rounded-lg border-2 ${data.isRunning ? 'border-success' : 'border-muted'} p-3 min-w-[120px] shadow-lg relative`}>
      <Handle type="target" position={Position.Left} id="target-left" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Left} id="source-left" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />

      <Handle type="target" position={Position.Top} id="target-top" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Top} id="source-top" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />
      
      <div className="text-xs font-semibold text-foreground mb-2 text-center">
        {data.label}
      </div>

      {/* Pump icon with animation */}
      <div className="flex justify-center mb-2">
        <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${data.isRunning ? 'animate-spin' : ''}`}
             style={{ animationDuration: '2s' }}>
          <Cog className={`h-6 w-6 ${data.isRunning ? 'text-success' : 'text-muted-foreground'}`} />
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex justify-center mb-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          data.isRunning 
            ? 'bg-success/20 text-success' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {data.isRunning ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* Data display */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>RPM:</span>
          <span className="font-mono text-foreground">{data.rpm}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>Pot:</span>
          </div>
          <span className="font-mono text-foreground">{data.power}%</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="source-right" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Right} id="target-right" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />

      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />
    </div>
  );
};

export default PumpNode;
