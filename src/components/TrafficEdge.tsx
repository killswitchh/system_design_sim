import { BaseEdge, type EdgeProps, getBezierPath } from 'reactflow';
import { useSimulationContext } from '../context/SimulationContext';

export default function TrafficEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { packets, selectedPacket, setSelectedPacket } = useSimulationContext();
  const edgePackets = packets.filter((p) => p.edgeId === id);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {/* Conditional animated edge - only when packets are present */}
      {edgePackets.length > 0 && (
        <BaseEdge
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            strokeDasharray: '5, 5',
            animation: 'dashdraw 0.5s linear infinite',
            stroke: '#ffffff',
            strokeWidth: 2,
          }}
        />
      )}
      
      {/* Render Packets */}
      {edgePackets.map((packet) => {
        const t = packet.progress / 100;
        const dist = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
        
        // Control points
        let p1x = sourceX;
        let p1y = sourceY;
        let p2x = targetX;
        let p2y = targetY;

        if (sourcePosition === 'right') p1x += Math.min(dist * 0.25, 150);
        else if (sourcePosition === 'left') p1x -= Math.min(dist * 0.25, 150);
        
        if (targetPosition === 'left') p2x -= Math.min(dist * 0.25, 150);
        else if (targetPosition === 'right') p2x += Math.min(dist * 0.25, 150);

        // Cubic Bezier
        const cx = Math.pow(1-t, 3)*sourceX + 3*Math.pow(1-t, 2)*t*p1x + 3*(1-t)*Math.pow(t, 2)*p2x + Math.pow(t, 3)*targetX;
        const cy = Math.pow(1-t, 3)*sourceY + 3*Math.pow(1-t, 2)*t*p1y + 3*(1-t)*Math.pow(t, 2)*p2y + Math.pow(t, 3)*targetY;

        const isSelected = selectedPacket?.id === packet.id;

        return (
          <circle
            key={packet.id}
            cx={cx}
            cy={cy}
            r={isSelected ? 6 : 4}
            fill={isSelected ? '#facc15' : packet.color || '#60a5fa'}
            stroke={isSelected ? '#fef08a' : 'none'}
            strokeWidth={2}
            className="cursor-pointer transition-all duration-75"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPacket(packet);
            }}
            style={{
                filter: isSelected ? 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.8))' : `drop-shadow(0 0 2px ${packet.color || '#60a5fa'})`
            }}
          />
        );
      })}
      
      <style>
        {`
          @keyframes dashdraw {
            from {
              stroke-dashoffset: 10;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
        `}
      </style>
    </>
  );
}
