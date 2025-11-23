import React, { createContext, useContext } from 'react';
import type { Packet } from '../hooks/useSimulation';

interface SimulationContextType {
  packets: Packet[];
  selectedPacket: Packet | null;
  setSelectedPacket: (packet: Packet | null) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const useSimulationContext = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulationContext must be used within a SimulationProvider');
  }
  return context;
};

export const SimulationProvider = ({ 
  children, 
  packets, 
  selectedPacket, 
  setSelectedPacket 
}: React.PropsWithChildren<SimulationContextType>) => {
  return (
    <SimulationContext.Provider value={{ packets, selectedPacket, setSelectedPacket }}>
      {children}
    </SimulationContext.Provider>
  );
};
