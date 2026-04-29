import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Team } from '../types';
import { useAuth } from './useAuth';

interface AppContextType {
  teams: Team[];
  teamsLoading: boolean;
  activeTeam: Team | null;
  setActiveTeam: (team: Team) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [activeTeam, setActiveTeamState] = useState<Team | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setTeams([]);
      setActiveTeamState(null);
      setTeamsLoading(false);
      return undefined;
    }

    setTeamsLoading(true);
    fetch('/api/teams', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load teams');
        return (await res.json()) as Team[];
      })
      .then((rows) => {
        if (cancelled) return;
        setTeams(rows);
        setActiveTeamState((prev) => rows.find((t) => t.id === prev?.id) ?? rows[0] ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setTeams([]);
        setActiveTeamState(null);
      })
      .finally(() => {
        if (!cancelled) {
          setTeamsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  function setActiveTeam(team: Team) {
    setActiveTeamState(team);
  }

  const value = useMemo<AppContextType>(
    () => ({
      teams,
      teamsLoading,
      activeTeam,
      setActiveTeam,
    }),
    [teams, teamsLoading, activeTeam]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
