import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const NAV_ITEMS = [
  { key: 'dashboard',   label: 'Dashboard',    icon: '⬡', path: '/' },
  { key: 'athletes',    label: 'Athletes',     icon: '◈', path: '/athletes' },
  { key: 'performance', label: 'Performance',  icon: '▲', path: '/performance' },
  { key: 'readiness',   label: 'Readiness',    icon: '◎', path: '/readiness' },
  { key: 'health',      label: 'Health',       icon: '♡', path: '/health' },
  { key: 'reports',     label: 'Reports',      icon: '▣', path: '/reports' },
];

const BOTTOM_ITEMS = [
  { key: 'settings', label: 'Settings', icon: '⊙', path: '/settings' },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-mark">A</span>
        <span className="logo-text">AfaSense</span>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <ul className="nav-list">
          {NAV_ITEMS.map(item => (
            <li key={item.key}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item--active' : ''}`
                }
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <ul className="nav-list nav-list--bottom">
          {BOTTOM_ITEMS.map(item => (
            <li key={item.key}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item--active' : ''}`
                }
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
