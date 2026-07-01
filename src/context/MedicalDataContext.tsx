import { createContext, useContext, type ReactNode } from 'react';
import type { AppData } from '../types';
import { useMedicalData } from '../hooks/useMedicalData';

interface MedicalDataContextValue {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  replaceAll: (newData: AppData) => void;
  reset: () => void;
  loaded: boolean;
}

const MedicalDataContext = createContext<MedicalDataContextValue | null>(null);

export function MedicalDataProvider({ children }: { children: ReactNode }) {
  const value = useMedicalData();
  return (
    <MedicalDataContext.Provider value={value}>{children}</MedicalDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(MedicalDataContext);
  if (!ctx) throw new Error('useAppData must be used within MedicalDataProvider');
  return ctx;
}
