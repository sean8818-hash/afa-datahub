import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './AppLayout.css';

export function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <Topbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
