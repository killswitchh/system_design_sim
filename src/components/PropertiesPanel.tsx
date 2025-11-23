import React, { useEffect, useRef, useState } from 'react';
import type { Node } from 'reactflow';
import type { Packet } from '../hooks/useSimulation';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  selectedPacket: Packet | null;
  nodes: Node[];
}

export const PropertiesPanel = ({ selectedNode, setNodes, selectedPacket, nodes }: PropertiesPanelProps) => {
   // Get live node for real-time updates
  const liveNode = selectedNode ? nodes.find(n => n.id === selectedNode.id) : null;
  const displayNode = liveNode || selectedNode;
  const [label, setLabel] = useState('');
  const [algorithm, setAlgorithm] = useState('');
  const [dbType, setDbType] = useState('');
  const [rps, setRps] = useState(1);
  const [unit, setUnit] = useState('second');
  const [color, setColor] = useState('#60a5fa');
  const [healthCheckInterval, setHealthCheckInterval] = useState(5);
  const [isHealthy, setIsHealthy] = useState(true);
  const [width, setWidth] = useState(288);
  const [isResizing, setIsResizing] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label || '');
      setAlgorithm(selectedNode.data.algorithm || 'Round Robin');
      setDbType(selectedNode.data.dbType || 'PostgreSQL');
      setRps(selectedNode.data.rps || 1);
      setUnit(selectedNode.data.unit || 'second');
      setColor(selectedNode.data.color || '#60a5fa');
      setHealthCheckInterval(selectedNode.data.healthCheckInterval || 5);
      setIsHealthy(selectedNode.data.isHealthy !== false);
      setHasChanges(false);
      setExpandedLog(null);
    }
  }, [selectedNode]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.max(250, Math.min(600, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const saveChanges = () => {
    if (!selectedNode) return;
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              label,
              algorithm,
              dbType,
              rps,
              unit,
              color,
              healthCheckInterval,
              isHealthy,
            },
          };
        }
        return node;
      })
    );
    setHasChanges(false);
  };

  if (selectedPacket) {
    return (
      <aside 
        ref={panelRef}
        className="bg-gray-900 border-l border-gray-800 text-white flex flex-col h-full relative"
        style={{ width: `${width}px` }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors"
          onMouseDown={() => setIsResizing(true)}
        />
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold">Packet Inspector</h2>
          <p className="text-xs text-gray-400">ID: {selectedPacket.id}</p>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
            <div className="text-sm bg-gray-800 p-2 rounded">{selectedPacket.type}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Source Node</label>
            <div className="text-sm bg-gray-800 p-2 rounded">{selectedPacket.sourceId}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Target Node</label>
            <div className="text-sm bg-gray-800 p-2 rounded">{selectedPacket.targetId}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Headers</label>
            <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
              {JSON.stringify(selectedPacket.headers, null, 2)}
            </pre>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Body</label>
            <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
              {selectedPacket.body}
            </pre>
          </div>
        </div>
      </aside>
    );
  }

  if (!selectedNode) {
    return (
      <aside 
        ref={panelRef}
        className="bg-gray-900 border-l border-gray-800 text-white flex flex-col h-full relative"
        style={{ width: `${width}px` }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors"
          onMouseDown={() => setIsResizing(true)}
        />
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold">Properties</h2>
          <p className="text-xs text-gray-400">Select a component to edit</p>
        </div>
        <div className="p-4">
          <div className="text-gray-500 text-sm text-center mt-10">
            No component selected
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside 
      ref={panelRef}
      className="bg-gray-900 border-l border-gray-800 text-white flex flex-col h-full relative"
      style={{ width: `${width}px` }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-bold">Properties</h2>
        <p className="text-xs text-gray-400">Editing: {selectedNode.type}</p>
      </div>
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setHasChanges(true);
            }}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {selectedNode.type === 'loadBalancer' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Algorithm</label>
              <select
                value={algorithm}
                onChange={(e) => {
                  setAlgorithm(e.target.value);
                  setHasChanges(true);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Round Robin">Round Robin</option>
                <option value="Least Connections">Least Connections</option>
                <option value="Random">Random</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Health Check Interval</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={healthCheckInterval}
                  onChange={(e) => {
                    setHealthCheckInterval(parseInt(e.target.value));
                    setHasChanges(true);
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-gray-400 whitespace-nowrap">seconds</span>
              </div>
            </div>
          </>
        )}

        {selectedNode.type === 'instance' && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Health Status</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsHealthy(true);
                  setHasChanges(true);
                }}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  isHealthy
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                ✓ Healthy
              </button>
              <button
                onClick={() => {
                  setIsHealthy(false);
                  setHasChanges(true);
                }}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  !isHealthy
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                ✗ Unhealthy
              </button>
            </div>
          </div>
        )}

        {selectedNode.type === 'user' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Requests Rate</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={rps}
                  onChange={(e) => {
                    setRps(parseInt(e.target.value));
                    setHasChanges(true);
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <select
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value);
                    setHasChanges(true);
                  }}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="second">RPS</option>
                  <option value="minute">RPM</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Source Color</label>
              <div className="flex gap-2">
                  {['#60a5fa', '#f87171', '#4ade80', '#c084fc', '#fbbf24'].map(c => (
                      <button
                          key={c}
                          onClick={() => {
                            setColor(c);
                            setHasChanges(true);
                          }}
                          className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                      />
                  ))}
              </div>
            </div>
          </div>
        )}

        {selectedNode.type === 'database' && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Database Type</label>
            <select
              value={dbType}
              onChange={(e) => {
                setDbType(e.target.value);
                setHasChanges(true);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="MySQL">MySQL</option>
              <option value="MongoDB">MongoDB</option>
              <option value="Redis">Redis</option>
            </select>
          </div>
        )}
        
        {/* Component Log for processing nodes */}
        {(selectedNode.type === 'loadBalancer' || selectedNode.type === 'instance' || selectedNode.type === 'database') && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Component Log</label>
            <div 
              className="bg-gray-800 rounded p-2 max-h-60 overflow-y-auto space-y-1"
              onClick={(e) => {
                e.currentTarget.scrollTop = e.currentTarget.scrollHeight;
              }}
            >
              {displayNode?.data.componentLog && displayNode.data.componentLog.length > 0 ? (
                displayNode.data.componentLog.map((log: any) => {
                  const isExpanded = expandedLog === log.id;
                  
                  return (
                    <div key={log.id} className="bg-gray-750 rounded">
                      <div 
                        className="text-xs flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer"
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      >
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: log.color }}
                        />
                        <span className="text-gray-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-gray-300 flex-1">
                          {log.details || `from ${log.source}`}
                        </span>
                        <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                      
                      {isExpanded && log.packet && (
                        <div className="px-2 pb-2 space-y-2 text-xs">
                          <div className="border-t border-gray-700 pt-2">
                            <div className="text-gray-400 font-semibold mb-1">Packet Details</div>
                            <div className="space-y-1">
                              <div><span className="text-gray-500">ID:</span> <span className="text-gray-300 font-mono">{log.packet.id}</span></div>
                              <div><span className="text-gray-500">Source:</span> <span className="text-gray-300">{log.packet.sourceId}</span></div>
                              <div><span className="text-gray-500">Target:</span> <span className="text-gray-300">{log.packet.targetId}</span></div>
                              <div><span className="text-gray-500">Type:</span> <span className="text-gray-300">{log.packet.type}</span></div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-700 pt-2">
                            <div className="text-gray-400 font-semibold mb-1">Headers</div>
                            <pre className="bg-gray-900 p-2 rounded overflow-x-auto text-xs">
                              {JSON.stringify(log.packet.headers, null, 2)}
                            </pre>
                          </div>
                          
                          <div className="border-t border-gray-700 pt-2">
                            <div className="text-gray-400 font-semibold mb-1">Body</div>
                            <pre className="bg-gray-900 p-2 rounded overflow-x-auto text-xs">
                              {log.packet.body}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-gray-500 text-center py-2">No logs yet</div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Save Button */}
      {hasChanges && (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={saveChanges}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Save Changes
          </button>
        </div>
      )}
    </aside>
  );
};
