import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const TOKEN_KEY = 'afasense_token';

export interface AdminUser {
  id: string | number;
  email: string;
  name: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  admin: AdminUser;
}

async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

interface AuthContextType {
  initialized: boolean;
  token: string | null;
  admin: AdminUser | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function requestMe(token: string): Promise<AdminUser> {
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Session expired');
  }
  const data = await res.json();
  return data.admin;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [initialized, setInitialized] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAdmin(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setInitialized(true);
      return undefined;
    }

    requestMe(token)
      .then((currentAdmin) => {
        if (!cancelled) {
          setAdmin(currentAdmin);
        }
      })
      .catch(() => {
        if (!cancelled) {
          logout();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInitialized(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await readJsonSafe(res);
    if (!res.ok) {
      throw new Error(data?.detail || `Login failed (${res.status})`);
    }
    if (!data) {
      throw new Error('Login failed (empty response)');
    }

    const result = data as LoginResponse;
    localStorage.setItem(TOKEN_KEY, result.access_token);
    setToken(result.access_token);
    setAdmin(result.admin);
    setInitialized(true);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      initialized,
      token,
      admin,
      isAuthenticated: Boolean(token && admin),
      login,
      logout,
    }),
    [initialized, token, admin, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
