import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './hooks/useApp';
import { AppLayout } from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import { Placeholder } from './pages/Placeholder';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route
              path="/athletes"
              element={<Placeholder title="Athletes" description="Full athlete roster with search and filters. Coming in stage 2." icon="◈" />}
            />
            <Route
              path="/athletes/:id"
              element={<Placeholder title="Athlete Profile" description="Overview, Performance, Bio tabs. Coming in stage 2." icon="◈" />}
            />
            <Route
              path="/performance"
              element={<Placeholder title="Performance" description="Full team data table with Talent Matrix format. Coming in stage 2." icon="▲" />}
            />
            <Route
              path="/readiness"
              element={<Placeholder title="Readiness" description="Daily readiness check results. Coming in stage 2." icon="◎" />}
            />
            <Route
              path="/health"
              element={<Placeholder title="Health" description="BIA body composition and health data. Coming in stage 2." icon="♡" />}
            />
            <Route
              path="/reports"
              element={<Placeholder title="Reports" description="General Fitness, Talent Matrix, Readiness, and single-test reports. Coming in stage 3." icon="▣" />}
            />
            <Route
              path="/settings"
              element={<Placeholder title="Settings" description="System configuration and user management." icon="⊙" />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
