import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Team } from '../types';
import { MOCK_TEAMS } from '../lib/mockData';

interface AppContextType {
  teams: Team[];
  activeTeam: Team;
  setActiveTeam: (team: Team) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeTeam, setActiveTeam] = useState<Team>(MOCK_TEAMS[0]);

  return (
    <AppContext.Provider value={{ teams: MOCK_TEAMS, activeTeam, setActiveTeam }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
