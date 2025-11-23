import { useEffect, useRef, useState } from 'react';
import { type Edge, type Node } from 'reactflow';

export interface Packet {
  id: string;
  sourceId: string;
  targetId: string;
  progress: number; // 0 to 100
  edgeId: string;
  type: 'request' | 'response';
  headers: Record<string, string>;
  body: string;
  color: string;
}

export const useSimulation = (nodes: Node[], edges: Edge[], setNodes: React.Dispatch<React.SetStateAction<Node[]>>) => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const lastSpawnTime = useRef<Record<string, number>>({});
  const processingNodes = useRef<Set<string>>(new Set());

  // Simulation loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      // 1. Spawn new packets from User nodes
      const userNodes = nodes.filter((n) => n.type === 'user');
      
      userNodes.forEach((user) => {
        const rate = user.data.rps || 1;
        const unit = user.data.unit || 'second';
        const rps = unit === 'minute' ? rate / 60 : rate;
        
        const intervalMs = 1000 / rps;
        const last = lastSpawnTime.current[user.id] || 0;

        if (now - last >= intervalMs) {
          // Time to spawn!
          const outgoingEdges = edges.filter((e) => e.source === user.id);
          if (outgoingEdges.length > 0) {
            const edge = outgoingEdges[Math.floor(Math.random() * outgoingEdges.length)];
            
            // Calculate initial position
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            
            if (sourceNode && targetNode) {
               const newPacket: Packet = {
                id: Math.random().toString(36).substr(2, 9),
                sourceId: edge.source,
                targetId: edge.target,
                progress: 0,
                edgeId: edge.id,
                type: 'request',
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Content-Type': 'application/json',
                    'X-Request-ID': Math.random().toString(36).substr(2, 9),
                },
                body: JSON.stringify({ timestamp: now, data: 'Hello World' }),
                color: user.data.color || '#60a5fa',
              };

              setPackets((prev) => [...prev, newPacket]);
              lastSpawnTime.current[user.id] = now;
            }
          }
        }
      });

      // 2. Move existing packets
      setPackets((prevPackets) => {
        const nextPackets: Packet[] = [];
        
        prevPackets.forEach((p) => {
          if (p.progress < 100) {
            const newProgress = p.progress + 1; // Speed
            
            const edge = edges.find(e => e.id === p.edgeId);
            const sourceNode = nodes.find(n => n.id === p.sourceId);
            const targetNode = nodes.find(n => n.id === p.targetId);

            if (edge && sourceNode && targetNode) {
                nextPackets.push({ ...p, progress: newProgress });
            }
          } else {
            // Packet arrived at target
            const targetNode = nodes.find(n => n.id === p.targetId);
            
            if (targetNode) {
              // Trigger processing state
              if (!processingNodes.current.has(targetNode.id)) {
                  processingNodes.current.add(targetNode.id);
                  
                  // Update node data to show processing visual with color
                  setNodes(nds => nds.map(n => {
                      if (n.id === targetNode.id) {
                          // Add to request log with full packet snapshot
                          const logEntry = {
                              id: p.id,
                              timestamp: Date.now(),
                              source: p.sourceId,
                              type: p.type,
                              color: p.color,
                              // Store complete packet snapshot
                              packet: {
                                  id: p.id,
                                  sourceId: p.sourceId,
                                  targetId: p.targetId,
                                  type: p.type,
                                  headers: { ...p.headers },
                                  body: p.body,
                                  color: p.color,
                              }
                          };
                          const currentLog = n.data.requestLog || [];
                          const newLog = [logEntry, ...currentLog].slice(0, 50); // Keep last 50
                          
                          return { 
                              ...n, 
                              data: { 
                                  ...n.data, 
                                  processing: true,
                                  processingColor: p.color,
                                  requestLog: newLog,
                              } 
                          };
                      }
                      return n;
                  }));

                  // Simulate processing delay then forward
                  setTimeout(() => {
                      // Clear processing state
                      processingNodes.current.delete(targetNode.id);
                      setNodes(nds => nds.map(n => {
                        if (n.id === targetNode.id) {
                            return { ...n, data: { ...n.data, processing: false, processingColor: undefined } };
                        }
                        return n;
                      }));

                      // Logic for forwarding
                      let nextTargetType = '';
                      if (targetNode.type === 'loadBalancer') nextTargetType = 'instance';
                      else if (targetNode.type === 'instance') nextTargetType = 'database';

                      if (nextTargetType) {
                        const outgoingEdges = edges.filter((e) => e.source === targetNode.id);
                        const validEdges = outgoingEdges.filter(e => {
                            const tNode = nodes.find(n => n.id === e.target);
                            return tNode?.type === nextTargetType;
                        });

                        if (validEdges.length > 0) {
                           const edge = validEdges[Math.floor(Math.random() * validEdges.length)];
                           const tNode = nodes.find(n => n.id === edge.target);
                           
                           if (tNode) {
                               setPackets(current => [...current, {
                                 id: Math.random().toString(36).substr(2, 9),
                                 sourceId: edge.source,
                                 targetId: edge.target,
                                 progress: 0,
                                 edgeId: edge.id,
                                 type: 'request',
                                 headers: { ...p.headers, 'X-Forwarded-For': p.sourceId },
                                 body: p.body,
                                 color: p.color,
                               }]);
                           }
                        }
                      }
                  }, 500); // 500ms processing time
              }
            }
          }
        });

        return nextPackets;
      });
    }, 30); // ~30fps

    return () => clearInterval(interval);
  }, [nodes, edges, setNodes]);

  return { packets };
};
