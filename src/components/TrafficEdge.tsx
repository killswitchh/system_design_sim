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
        const isHealthCheck = packet.type === 'health-check' || packet.type === 'health-check-response';
        const isReverse = packet.type === 'health-check-response';
        
        // For reverse packets, we need to swap source and target
        const actualSourceX = isReverse ? targetX : sourceX;
        const actualSourceY = isReverse ? targetY : sourceY;
        const actualTargetX = isReverse ? sourceX : targetX;
        const actualTargetY = isReverse ? sourceY : targetY;
        const actualSourcePos = isReverse ? targetPosition : sourcePosition;
        const actualTargetPos = isReverse ? sourcePosition : targetPosition;
        
        // For reverse packets: progress goes 100->0, so we need to invert t
        // At progress=100, t=0 (at instance/start)
        // At progress=0, t=1 (at load balancer/end)
        const t = isReverse ? (100 - packet.progress) / 100 : packet.progress / 100;
        
        const dist = Math.sqrt(Math.pow(actualTargetX - actualSourceX, 2) + Math.pow(actualTargetY - actualSourceY, 2));
        
        // Control points
        let p1x = actualSourceX;
        let p1y = actualSourceY;
        let p2x = actualTargetX;
        let p2y = actualTargetY;

        if (actualSourcePos === 'right') p1x += Math.min(dist * 0.25, 150);
        else if (actualSourcePos === 'left') p1x -= Math.min(dist * 0.25, 150);
        
        if (actualTargetPos === 'left') p2x -= Math.min(dist * 0.25, 150);
        else if (actualTargetPos === 'right') p2x += Math.min(dist * 0.25, 150);

        // Cubic Bezier
        let cx = Math.pow(1-t, 3)*actualSourceX + 3*Math.pow(1-t, 2)*t*p1x + 3*(1-t)*Math.pow(t, 2)*p2x + Math.pow(t, 3)*actualTargetX;
        let cy = Math.pow(1-t, 3)*actualSourceY + 3*Math.pow(1-t, 2)*t*p1y + 3*(1-t)*Math.pow(t, 2)*p2y + Math.pow(t, 3)*actualTargetY;

        // Offset health checks perpendicular to the edge to avoid overlap
        if (isHealthCheck) {
          const dx = targetX - sourceX;
          const dy = targetY - sourceY;
          const length = Math.sqrt(dx * dx + dy * dy);
          const perpX = -dy / length;
          const perpY = dx / length;
          const offset = 8; // pixels offset
          cx += perpX * offset;
          cy += perpY * offset;
        }

        const isSelected = selectedPacket?.id === packet.id;
        
        // Determine packet color and size based on type
        let packetColor = packet.color || '#60a5fa';
        let radius = 4;
        
        if (packet.type === 'health-check') {
          packetColor = '#f59e0b'; // Orange for health check requests
          radius = 3; // Smaller
        } else if (packet.type === 'health-check-response') {
          packetColor = '#10b981'; // Green for health check responses
          radius = 3; // Smaller
        }
        
        if (isSelected) {
          radius = 6;
        }

        return (
          <circle
            key={packet.id}
            cx={cx}
            cy={cy}
            r={radius}
            fill={isSelected ? '#facc15' : packetColor}
            stroke={isSelected ? '#fef08a' : 'none'}
            strokeWidth={2}
            className="cursor-pointer transition-all duration-75"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPacket(packet);
            }}
            style={{
                filter: isSelected ? 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.8))' : `drop-shadow(0 0 2px ${packetColor})`
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
