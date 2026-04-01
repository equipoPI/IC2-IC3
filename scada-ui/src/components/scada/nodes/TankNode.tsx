import { Handle, Position } from '@xyflow/react';
import { Droplets, Thermometer } from 'lucide-react';

interface TankNodeData {
  label: string;
  level: number;
  temperature: number;
  capacity: number;
  unit: string;
  status: 'active' | 'inactive' | 'warning' | 'error';
  content?: string;
}

const TankNode = ({ data }: { data: TankNodeData }) => {
  const getLevelColor = (level: number) => {
    if (level > 80) return 'bg-warning';
    if (level > 30) return 'bg-primary';
    return 'bg-destructive';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-success';
      case 'warning': return 'border-warning';
      case 'error': return 'border-destructive';
      default: return 'border-muted';
    }
  };

  return (
    <div className={`bg-card rounded-lg border-2 ${getStatusColor(data.status)} p-3 min-w-[160px] shadow-lg`}>
      <Handle type="target" position={Position.Left} className="!bg-primary !w-3 !h-3" />
      
      <div className="text-xs font-semibold text-foreground mb-1 text-center">
        {data.label}
      </div>
      {data.content && (
        <div className="text-[10px] text-primary mb-2 text-center font-medium">
          {data.content}
        </div>
      )}
      
      {/* Tank visualization */}
      <div className="relative h-16 w-full bg-muted rounded border border-border overflow-hidden mb-2">
        <div 
          className={`absolute bottom-0 left-0 right-0 ${getLevelColor(data.level)} transition-all duration-500 opacity-80`}
          style={{ height: `${data.level}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground drop-shadow-md">
            {data.level}%
          </span>
        </div>
      </div>

      {/* Data display */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-1">
            <Droplets className="h-3 w-3" />
            <span>Vol:</span>
          </div>
          <span className="font-mono text-foreground">
            {Math.round(data.level * data.capacity / 100)} {data.unit}
          </span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-1">
            <Thermometer className="h-3 w-3" />
            <span>Temp:</span>
          </div>
          <span className="font-mono text-foreground">{data.temperature}°C</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary !w-3 !h-3" />
    </div>
  );
};

export default TankNode;
