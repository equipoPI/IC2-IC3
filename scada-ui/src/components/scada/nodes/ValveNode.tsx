import { Handle, Position } from '@xyflow/react';
import { ArrowRightLeft } from 'lucide-react';

interface ValveNodeData {
  label: string;
  isOpen: boolean;
  flowRate: number;
}

const ValveNode = ({ data }: { data: ValveNodeData }) => {
  return (
    <div className={`bg-card rounded-lg border-2 ${data.isOpen ? 'border-warning' : 'border-muted'} p-2 min-w-[100px] shadow-lg`}>
      <Handle type="target" position={Position.Left} className="!bg-primary !w-3 !h-3" />
      
      <div className="text-xs font-semibold text-foreground mb-1 text-center">
        {data.label}
      </div>

      {/* Valve visualization */}
      <div className="flex justify-center mb-1">
        <div className={`relative w-8 h-8 flex items-center justify-center`}>
          <div className={`absolute w-6 h-1 ${data.isOpen ? 'bg-warning' : 'bg-muted'} rounded transition-all duration-300`} 
               style={{ transform: data.isOpen ? 'rotate(0deg)' : 'rotate(90deg)' }} />
          <ArrowRightLeft className={`h-4 w-4 ${data.isOpen ? 'text-warning' : 'text-muted-foreground'}`} />
        </div>
      </div>

      {/* Status */}
      <div className="text-center mb-1">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          data.isOpen 
            ? 'bg-warning/20 text-warning' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {data.isOpen ? 'ABIERTA' : 'CERRADA'}
        </span>
      </div>

      {/* Flow rate */}
      <div className="text-center text-xs text-muted-foreground">
        <span className="font-mono text-foreground">{data.flowRate}</span> L/min
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary !w-3 !h-3" />
    </div>
  );
};

export default ValveNode;
