import { Handle, Position } from '@xyflow/react';
import { Thermometer, Gauge, Waves, Activity } from 'lucide-react';

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
      case 'temperature': return <Thermometer className="h-4 w-4" />;
      case 'pressure': return <Gauge className="h-4 w-4" />;
      case 'flow': return <Waves className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
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
    <div className={`bg-card rounded-lg border-2 ${getStatusColor().split(' ')[0]} p-2 min-w-[100px] shadow-lg`}>
      <Handle type="target" position={Position.Left} className="!bg-primary !w-3 !h-3" />
      
      <div className="text-xs font-semibold text-foreground mb-1 text-center">
        {data.label}
      </div>

      {/* Sensor icon */}
      <div className="flex justify-center mb-1">
        <div className={`w-8 h-8 rounded-full ${getBgColor()} flex items-center justify-center ${getStatusColor().split(' ')[1]}`}>
          {getIcon()}
        </div>
      </div>

      {/* Value display */}
      <div className="text-center">
        <span className={`text-lg font-bold font-mono ${getStatusColor().split(' ')[1]}`}>
          {data.value}
        </span>
        <span className="text-xs text-muted-foreground ml-1">{data.unit}</span>
      </div>

      {/* Status indicator */}
      <div className="flex justify-center mt-1">
        <div className={`w-2 h-2 rounded-full ${
          data.status === 'normal' ? 'bg-success' :
          data.status === 'warning' ? 'bg-warning animate-pulse' :
          'bg-destructive animate-pulse'
        }`} />
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary !w-3 !h-3" />
    </div>
  );
};

export default SensorNode;
