import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './hooks/useApp';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import { Placeholder } from './pages/Placeholder';
import AthleteProfile from './pages/AthleteProfile';
import Login from './pages/Login';
import PerformancePage from './pages/Performance';

function ProtectedRoutes() {
  const { initialized, isAuthenticated } = useAuth();

  if (!initialized) {
    return <div className="app-loading">Loading...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/athletes" element={<Placeholder title="Athletes" description="Full athlete roster with search and filters. Coming in stage 2." icon="◈" />} />
          <Route path="/athletes/:id" element={<AthleteProfile />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/performanc" element={<Navigate to="/performance" replace />} />
          <Route path="/readness" element={<Navigate to="/readiness" replace />} />
          <Route path="/readiness" element={<Placeholder title="Readiness" description="Daily readiness check results. Coming in stage 2." icon="◎" />} />
          <Route path="/health" element={<Placeholder title="Health" description="BIA body composition and health data. Coming in stage 2." icon="♡" />} />
          <Route path="/reports" element={<Placeholder title="Reports" description="General Fitness, Talent Matrix, Readiness, and single-test reports. Coming in stage 3." icon="▣" />} />
          <Route path="/settings" element={<Placeholder title="Settings" description="System configuration and user management." icon="⊙" />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}