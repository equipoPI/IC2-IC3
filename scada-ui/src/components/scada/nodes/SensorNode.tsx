import { Handle, Position } from '@xyflow/react';
import { Thermometer, Gauge, Waves, Activity, Droplets } from 'lucide-react';

interface SensorNodeData {
  label: string;
  value: number;
  unit: string;
  type: 'temperature' | 'pressure' | 'flow' | 'level';
  status: 'normal' | 'warning' | 'error';
}

const SensorNode = ({ data }: { data: SensorNodeData }) => {
  const getIcon = () => {
    switch (data.type) {
      case 'temperature': return <Thermometer className="h-4 w-4 text-amber-400" />;
      case 'pressure': return <Gauge className="h-4 w-4 text-purple-400" />;
      case 'flow': return <Waves className="h-4 w-4 text-cyan-400" />;
      case 'level': return <Droplets className="h-4 w-4 text-emerald-400" />;
      default: return <Activity className="h-4 w-4 text-cyan-400" />;
    }
  };

  const getStatusColor = () => {
    switch (data.status) {
      case 'normal': return 'border-success text-success';
      case 'warning': return 'border-warning text-warning';
      case 'error': return 'border-destructive text-destructive';
      default: return 'border-muted text-muted-foreground';
    }
  };

  const getBgColor = () => {
    switch (data.status) {
      case 'normal': return 'bg-success/10';
      case 'warning': return 'bg-warning/10';
      case 'error': return 'bg-destructive/10';
      default: return 'bg-muted/10';
    }
  };

  return (
    <div className={`bg-card rounded-lg border-2 ${getStatusColor().split(' ')[0]} p-2 min-w-[110px] shadow-lg relative`}>
      <Handle type="target" position={Position.Left} id="target-left" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Left} id="source-left" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />

      <Handle type="target" position={Position.Top} id="target-top" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Top} id="source-top" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />
      
      <div className="text-xs font-semibold text-foreground mb-1 text-center">
        {data.label}
      </div>

      {/* Sensor icon */}
      <div className="flex justify-center mb-1">
        <div className={`w-8 h-8 rounded-full ${getBgColor()} flex items-center justify-center`}>
          {getIcon()}
        </div>
      </div>

      {/* Value display */}
      <div className="text-center">
        <span className={`text-lg font-bold font-mono ${getStatusColor().split(' ')[1]}`}>
          {data.value}
        </span>
        <span className="text-xs text-muted-foreground ml-1 font-semibold">{data.unit || (data.type === 'level' ? 'cm' : 'L/min')}</span>
      </div>

      {/* Status indicator */}
      <div className="flex justify-center mt-1">
        <div className={`w-2 h-2 rounded-full ${
          data.status === 'normal' ? 'bg-success' :
          data.status === 'warning' ? 'bg-warning animate-pulse' :
          'bg-destructive animate-pulse'
        }`} />
      </div>

      <Handle type="source" position={Position.Right} id="source-right" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Right} id="target-right" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />

      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="!bg-cyan-400 !w-3 !h-3 opacity-0" />
    </div>
  );
};

export default SensorNode;
