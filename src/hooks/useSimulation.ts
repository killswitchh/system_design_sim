import { useEffect, useRef, useState } from 'react';
import type { Edge, Node } from 'reactflow';

export interface Packet {
  id: string;
  sourceId: string;
  targetId: string;
  progress: number;
  edgeId: string;
  type: string;
  headers: Record<string, string>;
  body: string;
  color?: string;
}

export const useSimulation = (
  nodes: Node[],
  edges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
) => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const lastSpawnTime = useRef<Record<string, number>>({});
  const processingNodes = useRef<Set<string>>(new Set());
  const lastHealthCheckRef = useRef<Record<string, number>>({});
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  
  // Keep refs updated
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Periodic health checks from load balancers
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const HEALTH_CHECK_TIMEOUT = 2000; // 2 seconds timeout
      
      nodesRef.current.forEach(node => {
        if (node.type === 'loadBalancer') {
          const lastCheck = lastHealthCheckRef.current[node.id] || 0;
          const intervalSeconds = node.data.healthCheckInterval || 5; // Default 5 seconds
          const intervalMs = intervalSeconds * 1000;
          
          // Send health checks based on configured interval
          if (now - lastCheck >= intervalMs) {
            lastHealthCheckRef.current[node.id] = now;
            
            // Find all connected instances
            const outgoingEdges = edgesRef.current.filter(e => e.source === node.id);
            const instanceEdges = outgoingEdges.filter(e => {
              const targetNode = nodesRef.current.find(n => n.id === e.target);
              return targetNode?.type === 'instance';
            });
            
            // Send health check packet to each instance and set timeout
            instanceEdges.forEach(edge => {
              const healthCheckId = `${node.id}-${edge.target}-${now}`;
              
              setPackets(current => [...current, {
                id: healthCheckId,
                sourceId: node.id,
                targetId: edge.target,
                progress: 0,
                edgeId: edge.id,
                type: 'health-check',
                headers: { 'X-Health-Check': 'true', 'X-Health-Check-ID': healthCheckId },
                body: 'ping',
                color: '#f59e0b', // Orange for health checks
              }]);
              
              // Set timeout to mark instance as unhealthy if no response
              setTimeout(() => {
                setNodes(nds => nds.map(n => {
                  if (n.id === node.id) {
                    const healthMap = n.data.instanceHealthMap || {};
                    const hasResponded = healthMap[`${edge.target}-${healthCheckId}`];
                    
                    // If no response received, mark as unhealthy
                    if (!hasResponded) {
                      const updatedHealthMap = { ...healthMap };
                      delete updatedHealthMap[`${edge.target}-${healthCheckId}`]; // Clean up check ID
                      updatedHealthMap[edge.target] = false; // Mark instance as unhealthy
                      
                      const logEntry = {
                        id: Math.random().toString(36).substr(2, 9),
                        timestamp: Date.now(),
                        action: 'HEALTH_CHECK_TIMEOUT',
                        details: `Instance ${edge.target} failed health check (timeout)`,
                        color: '#ef4444', // Red for timeout
                      };
                      const currentLog = n.data.componentLog || [];
                      return { 
                        ...n, 
                        data: { 
                          ...n.data, 
                          instanceHealthMap: updatedHealthMap,
                          componentLog: [logEntry, ...currentLog].slice(0, 100) 
                        } 
                      };
                    }
                  }
                  return n;
                }));
              }, HEALTH_CHECK_TIMEOUT);
            });
            
            // Log health check initiation
            if (instanceEdges.length > 0) {
              setNodes(nds => nds.map(n => {
                if (n.id === node.id) {
                  const logEntry = {
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: now,
                    action: 'HEALTH_CHECK_SENT',
                    details: `Sent health checks to ${instanceEdges.length} instance(s)`,
                    color: '#f59e0b',
                  };
                  const currentLog = n.data.componentLog || [];
                  return { ...n, data: { ...n.data, componentLog: [logEntry, ...currentLog].slice(0, 100) } };
                }
                return n;
              }));
            }
          }
        }
      });
    }, 1000); // Check every second

    return () => clearInterval(healthCheckInterval);
  }, [setNodes]); // Only depend on setNodes, not nodes/edges

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
          const outgoingEdges = edges.filter((e) => e.source === user.id);
          if (outgoingEdges.length > 0) {
            const edge = outgoingEdges[Math.floor(Math.random() * outgoingEdges.length)];
            
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
          // Health check responses travel backwards (100 -> 0)
          const isReverse = p.type === 'health-check-response';
          const progressDelta = isReverse ? -1 : 1;
          const isComplete = isReverse ? p.progress <= 0 : p.progress >= 100;
          
          if (!isComplete) {
            const newProgress = p.progress + progressDelta;
            
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
              // Handle health check packets
              if (p.type === 'health-check' && targetNode.type === 'instance') {
                const isHealthy = targetNode.data.isHealthy !== false;
                
                // Log health check received
                setNodes(nds => nds.map(n => {
                  if (n.id === targetNode.id) {
                    const logEntry = {
                      id: Math.random().toString(36).substr(2, 9),
                      timestamp: Date.now(),
                      action: 'HEALTH_CHECK_RECEIVED',
                      details: isHealthy ? 'Responded: OK' : 'No response (unhealthy)',
                      color: isHealthy ? '#10b981' : '#ef4444',
                    };
                    const currentLog = n.data.componentLog || [];
                    return { ...n, data: { ...n.data, componentLog: [logEntry, ...currentLog].slice(0, 100) } };
                  }
                  return n;
                }));
                
                // If healthy, send response back to load balancer
                if (isHealthy) {
                  setPackets(current => [...current, {
                    id: Math.random().toString(36).substr(2, 9),
                    sourceId: targetNode.id,
                    targetId: p.sourceId,
                    progress: 100, // Start at instance (100%) and move back to LB (0%)
                    edgeId: p.edgeId, // Use same edge, traveling backwards
                    type: 'health-check-response',
                    headers: { 
                      'X-Health-Check': 'true',
                      'X-Health-Check-ID': p.headers['X-Health-Check-ID'] || p.id
                    },
                    body: 'pong',
                    color: '#10b981', // Green for response
                  }]);
                }
                
                return; // Don't process health checks further
              }
              
              // Handle health check responses
              if (p.type === 'health-check-response' && targetNode.type === 'loadBalancer') {
                const healthCheckId = p.headers['X-Health-Check-ID'];
                
                setNodes(nds => nds.map(n => {
                  if (n.id === targetNode.id) {
                    const healthMap = n.data.instanceHealthMap || {};
                    const updatedHealthMap = { ...healthMap };
                    
                    // Mark this specific check as responded
                    if (healthCheckId) {
                      updatedHealthMap[`${p.sourceId}-${healthCheckId}`] = true;
                    }
                    
                    // Mark instance as healthy
                    updatedHealthMap[p.sourceId] = true;
                    
                    const logEntry = {
                      id: Math.random().toString(36).substr(2, 9),
                      timestamp: Date.now(),
                      action: 'HEALTH_CHECK_OK',
                      details: `Instance ${p.sourceId} is healthy`,
                      color: '#10b981',
                    };
                    const currentLog = n.data.componentLog || [];
                    return { 
                      ...n, 
                      data: { 
                        ...n.data, 
                        instanceHealthMap: updatedHealthMap,
                        componentLog: [logEntry, ...currentLog].slice(0, 100) 
                      } 
                    };
                  }
                  return n;
                }));
                
                return; // Don't process health check responses further
              }
              
              // Regular packet processing
              if (!processingNodes.current.has(targetNode.id)) {
                  processingNodes.current.add(targetNode.id);
                  
                  setNodes(nds => nds.map(n => {
                      if (n.id === targetNode.id) {
                          const logEntry = {
                              id: Math.random().toString(36).substr(2, 9),
                              timestamp: Date.now(),
                              action: 'RECEIVED',
                              details: `Received ${p.type} from ${p.sourceId}`,
                              source: p.sourceId,
                              type: p.type,
                              color: p.color,
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
                          const currentLog = n.data.componentLog || [];
                          const newLog = [logEntry, ...currentLog].slice(0, 100);
                          
                          return { 
                              ...n, 
                              data: { 
                                  ...n.data, 
                                  processing: true,
                                  processingColor: p.color,
                                  componentLog: newLog,
                              } 
                          };
                      }
                      return n;
                  }));

                  setTimeout(() => {
                      processingNodes.current.delete(targetNode.id);
                      setNodes(nds => nds.map(n => {
                        if (n.id === targetNode.id) {
                            return { ...n, data: { ...n.data, processing: false, processingColor: undefined } };
                        }
                        return n;
                      }));

                      // Forwarding logic
                      let nextTargetType = '';
                      if (targetNode.type === 'loadBalancer') nextTargetType = 'instance';
                      else if (targetNode.type === 'instance') nextTargetType = 'database';

                      if (nextTargetType) {
                        const outgoingEdges = edges.filter((e) => e.source === targetNode.id);
                        let validEdges = outgoingEdges.filter(e => {
                            const tNode = nodes.find(n => n.id === e.target);
                            return tNode?.type === nextTargetType;
                        });

                        // Filter unhealthy instances based on LB's health map
                        if (targetNode.type === 'loadBalancer' && nextTargetType === 'instance') {
                          const healthMap = targetNode.data.instanceHealthMap || {};
                          validEdges = validEdges.filter(e => {
                            const tNode = nodes.find(n => n.id === e.target);
                            // Check LB's health map first, fallback to instance's isHealthy, default to true
                            const isHealthyInMap = healthMap[e.target];
                            const instanceHealth = tNode?.data.isHealthy;
                            
                            // If LB has no health data yet, use instance's health status
                            // This allows initial traffic before first health check
                            if (isHealthyInMap === undefined) {
                              return instanceHealth !== false;
                            }
                            
                            // Use LB's tracked health status
                            return isHealthyInMap === true;
                          });
                        }

                        if (validEdges.length > 0) {
                           const edge = validEdges[Math.floor(Math.random() * validEdges.length)];
                           const tNode = nodes.find(n => n.id === edge.target);
                           
                           if (tNode) {
                               setNodes(nds => nds.map(n => {
                                 if (n.id === targetNode.id) {
                                   const logEntry = {
                                     id: Math.random().toString(36).substr(2, 9),
                                     timestamp: Date.now(),
                                     action: 'FORWARDED',
                                     details: `Forwarded to ${tNode.id}`,
                                     color: p.color,
                                   };
                                   const currentLog = n.data.componentLog || [];
                                   return { ...n, data: { ...n.data, componentLog: [logEntry, ...currentLog].slice(0, 100) } };
                                 }
                                 return n;
                               }));
                               
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
                  }, 500);
              }
            }
          }
        });

        return nextPackets;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [nodes, edges, setNodes]);

  return { packets };
};
