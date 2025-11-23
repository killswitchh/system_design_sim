import React from 'react';

export const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 text-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-bold">Components</h2>
        <p className="text-xs text-gray-400">Drag and drop to canvas</p>
      </div>
      <div className="p-4 space-y-3">
        <div
          className="bg-gray-800 p-3 rounded cursor-move hover:bg-gray-700 transition-colors border border-gray-700 flex items-center gap-2"
          onDragStart={(event) => onDragStart(event, 'loadBalancer')}
          draggable
        >
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          Load Balancer
        </div>
        <div
          className="bg-gray-800 p-3 rounded cursor-move hover:bg-gray-700 transition-colors border border-gray-700 flex items-center gap-2"
          onDragStart={(event) => onDragStart(event, 'instance')}
          draggable
        >
          <div className="w-3 h-3 rounded-sm bg-green-500"></div>
          Server Instance
        </div>
        <div
          className="bg-gray-800 p-3 rounded cursor-move hover:bg-gray-700 transition-colors border border-gray-700 flex items-center gap-2"
          onDragStart={(event) => onDragStart(event, 'database')}
          draggable
        >
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          Database
        </div>
        <div
          className="bg-gray-800 p-3 rounded cursor-move hover:bg-gray-700 transition-colors border border-gray-700 flex items-center gap-2"
          onDragStart={(event) => onDragStart(event, 'user')}
          draggable
        >
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          User
        </div>
      </div>
    </aside>
  );
};
