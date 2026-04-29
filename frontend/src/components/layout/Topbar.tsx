import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../hooks/useApp';
import { useAuth } from '../../hooks/useAuth';
import type { Team } from '../../types';
import './Topbar.css';

export function Topbar() {
  const { teams, teamsLoading, activeTeam, setActiveTeam } = useApp();
  const { admin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectTeam(team: Team) {
    setActiveTeam(team);
    setOpen(false);
  }

  const displayName = admin?.name || admin?.email || 'Coach';
  const avatarText = displayName.charAt(0).toUpperCase();
  const teamTitle = activeTeam?.name ?? (teamsLoading ? 'Loading teams...' : 'No team');
  const teamSubtitle = activeTeam?.sport ?? '';

  return (
    <header className="topbar">
      {/* Team switcher */}
      <div className="team-switcher" ref={dropdownRef}>
        <button
          className="team-trigger"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          disabled={!activeTeam || teams.length === 0}
        >
          <span className="team-avatar" aria-hidden="true">
            {teamTitle.charAt(0).toUpperCase()}
          </span>
          <span className="team-info">
            <span className="team-name">{teamTitle}</span>
            <span className="team-sport">{teamSubtitle}</span>
          </span>
          <span className="team-chevron" aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>

        {open && activeTeam && (
          <div className="team-dropdown" role="listbox" aria-label="Select team">
            {teams.map(team => (
              <button
                key={team.id}
                className={`team-option ${team.id === activeTeam.id ? 'team-option--active' : ''}`}
                onClick={() => selectTeam(team)}
                role="option"
              >
                <span className="team-option-avatar">{team.name.charAt(0)}</span>
                <span className="team-option-info">
                  <span className="team-option-name">{team.name}</span>
                  <span className="team-option-meta">{team.sport} · {team.athlete_count} athletes</span>
                </span>
                {team.id === activeTeam.id && (
                  <span className="team-check" aria-hidden="true">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right side actions */}
      <div className="topbar-actions">
        <div className="topbar-date">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
        <button className="topbar-btn" aria-label="Notifications">
          <span aria-hidden="true">🔔</span>
        </button>
        <button className="topbar-avatar" aria-label="Sign out" title={`Sign out (${displayName})`} onClick={logout}>
          {avatarText}
        </button>
      </div>
    </header>
  );
}
