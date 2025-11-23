import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

const NodeWrapper = ({ 
  children, 
  selected, 
  type, 
  label,
  data 
}: { 
  children: React.ReactNode; 
  selected?: boolean; 
  type: string; 
  label: string;
  data?: any;
}) => {
  const isDimmed = data?.dimmed;
  const isError = data?.error;
  const isProcessing = data?.processing;
  const processingColor = data?.processingColor || '#60a5fa';

  // Convert hex to rgba for shadow
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div
      className={`
        relative min-w-[180px] rounded-xl border-2 transition-all duration-300
        ${selected 
          ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)] bg-gray-800 scale-105 z-10' 
          : isError
            ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] bg-gray-900 animate-wiggle'
            : isProcessing
              ? `bg-gray-800 scale-[1.02]`
              : isDimmed
                ? 'border-gray-800 bg-gray-950 opacity-40 grayscale'
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'
        }
      `}
      style={isProcessing ? {
        borderColor: processingColor,
        boxShadow: `0 0 20px ${hexToRgba(processingColor, 0.6)}`
      } : undefined}
    >
      {/* Header */}
      <div className={`
        px-4 py-2 border-b text-xs font-bold uppercase tracking-wider flex items-center gap-2
        ${selected ? 'border-yellow-400/30 text-yellow-400' : 'border-gray-800 text-gray-400'}
      `}>
        <div className={`w-2 h-2 rounded-full ${selected ? 'bg-yellow-400' : 'bg-gray-600'}`} />
        {type}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="text-sm font-medium text-gray-200 mb-1">{label}</div>
        {children}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-900 transition-colors hover:!bg-yellow-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-900 transition-colors hover:!bg-yellow-400"
      />
    </div>
  );
};

export const LoadBalancerNode = ({ data, selected }: NodeProps) => (
  <NodeWrapper type="Load Balancer" label="Nginx / HAProxy" selected={selected} data={data}>
    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
      <span>Algorithm</span>
      <span className="text-gray-300">Round Robin</span>
    </div>
  </NodeWrapper>
);

export const InstanceNode = ({ data, selected }: NodeProps) => (
  <NodeWrapper type="Instance" label="EC2 / Droplet" selected={selected} data={data}>
    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
      <span>Status</span>
      <span className="text-green-400 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Healthy
      </span>
    </div>
  </NodeWrapper>
);

export const DatabaseNode = ({ data, selected }: NodeProps) => (
  <NodeWrapper type="Database" label="PostgreSQL / Redis" selected={selected} data={data}>
    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
      <span>Connections</span>
      <span className="text-gray-300">Active</span>
    </div>
  </NodeWrapper>
);

export const UserNode = ({ data, selected }: NodeProps) => (
  <NodeWrapper type="User" label="Traffic Source" selected={selected} data={data}>
    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
      <span>Rate</span>
      <span className="text-blue-400 font-mono">
        {data.rps || 1} {data.unit === 'minute' ? 'RPM' : 'RPS'}
      </span>
    </div>
  </NodeWrapper>
);
