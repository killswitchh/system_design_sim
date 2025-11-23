import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    MarkerType,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    type Connection,
    type Edge,
    type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Sidebar } from './components/Sidebar';
import { SimulationProvider } from './context/SimulationContext';
import { useSimulation, type Packet } from './hooks/useSimulation';

import { DatabaseNode, InstanceNode, LoadBalancerNode, UserNode } from './components/CustomNodes';
import TrafficEdge from './components/TrafficEdge';

const nodeTypes = {
  loadBalancer: LoadBalancerNode,
  instance: InstanceNode,
  database: DatabaseNode,
  user: UserNode,
};

const edgeTypes = {
  traffic: TrafficEdge,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// Type-based ID counters for readable IDs
const idCounters: Record<string, number> = {
  user: 0,
  loadBalancer: 0,
  instance: 0,
  database: 0,
};

const getId = (type: string) => {
  idCounters[type] = (idCounters[type] || 0) + 1;
  return `${type}_${idCounters[type]}`;
};

const App = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);

  // Simulation Hook
  const { packets } = useSimulation(nodes, edges, setNodes);

  // UX: Highlight valid targets
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        let isDimmed = false;
        if (selectedNode) {
          // If a node is selected, dim everything unless it's the selected node OR a valid target
          if (node.id !== selectedNode.id) {
            isDimmed = true;
            
            // Check if valid target
            if (selectedNode.type === 'user' && node.type === 'loadBalancer') isDimmed = false;
            if (selectedNode.type === 'loadBalancer' && node.type === 'instance') isDimmed = false;
            if (selectedNode.type === 'instance' && node.type === 'database') isDimmed = false;
          }
        }
        return {
          ...node,
          data: {
            ...node.data,
            dimmed: isDimmed,
          },
        };
      })
    );
  }, [selectedNode, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Validate connection
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (!sourceNode || !targetNode) return;

      let isValid = false;

      // User -> Load Balancer
      if (sourceNode.type === 'user' && targetNode.type === 'loadBalancer') {
        isValid = true;
      }
      // Load Balancer -> Instance
      else if (sourceNode.type === 'loadBalancer' && targetNode.type === 'instance') {
        isValid = true;
      }
      // Instance -> Database
      else if (sourceNode.type === 'instance' && targetNode.type === 'database') {
        isValid = true;
      }

      if (isValid) {
        const newEdge = {
          ...params,
          type: 'traffic',
          markerEnd: { type: MarkerType.ArrowClosed },
        };
        setEdges((eds) => addEdge(newEdge, eds));
      } else {
        // Trigger error state on target node
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === targetNode.id) {
              return { ...n, data: { ...n.data, error: true } };
            }
            return n;
          })
        );

        // Clear error after animation
        setTimeout(() => {
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === targetNode.id) {
                return { ...n, data: { ...n.data, error: false } };
              }
              return n;
            })
          );
        }, 500);
      }
    },
    [nodes, setEdges, setNodes],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = {
        x: event.clientX - 250, // Adjust for sidebar width
        y: event.clientY,
      };

      const newNode: Node = {
        id: getId(type),
        type,
        position,
        data: { label: `${type}` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedPacket(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedPacket(null);
  }, []);

  return (
    <SimulationProvider packets={packets} selectedPacket={selectedPacket} setSelectedPacket={setSelectedPacket}>
      <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
        <Sidebar />
        <div className="flex-1 h-full relative">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              className="bg-gray-950"
            >
              <Background color="#333" gap={16} />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
        <PropertiesPanel 
          selectedNode={selectedNode} 
          setNodes={setNodes} 
          selectedPacket={selectedPacket}
          nodes={nodes}
        />
      </div>
    </SimulationProvider>
  );
};

export default App;
