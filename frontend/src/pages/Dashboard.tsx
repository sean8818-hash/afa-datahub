import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { useAuth } from '../hooks/useAuth';
import { BenchmarkBar } from '../components/ui/BenchmarkBar';
import { MOCK_ATHLETES } from '../lib/mockData';
import type { Athlete } from '../types';
import './Dashboard.css';

type Filter = 'all' | 'attention' | 'good';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function daysSince(dateStr?: string) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function deriveProfileFromId(id: number) {
  const score = 40 + (id * 13 % 56); // 40..95 deterministic pseudo profile
  const benchmark = score >= 85 ? 'excellent'
    : score >= 70 ? 'good'
    : score >= 55 ? 'average'
    : score >= 45 ? 'fair'
    : 'weak';
  return {
    readiness_score: score,
    readiness_level: benchmark,
    benchmark_level: benchmark,
    needs_attention: score < 55,
    position: 'Athlete',
  } as const;
}

function ReadinessRing({ score }: { score: number }) {
  const r = 18, cx = 22, cy = 22;
  const circ = 2 * Math.PI * r;
  const progress = (score / 100) * circ;
  const color = score >= 81 ? '#ef4444'
    : score >= 61 ? '#f97316'
    : score >= 41 ? '#eab308'
    : score >= 21 ? '#14b8a6'
    : '#22c55e';

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-label={`Readiness ${score}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${progress} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}/>
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="10" fontWeight="600" fontFamily="DM Mono, monospace">{score}</text>
    </svg>
  );
}

function AthleteCard({ athlete, onClick }: { athlete: Athlete; onClick: () => void }) {
  return (
    <button className="athlete-card" onClick={onClick}>
      {athlete.needs_attention && <span className="card-alert-dot" />}
      <div className="card-header">
        <div className="card-avatar">{getInitials(athlete.name)}</div>
        <div className="card-identity">
          <span className="card-name">{athlete.name}</span>
          <span className="card-position">{athlete.position}</span>
        </div>
        <div className="card-readiness">
          {athlete.readiness_score != null && <ReadinessRing score={athlete.readiness_score} />}
        </div>
      </div>
      <div className="card-body">
        <div className="card-benchmark-wrap">
          <span className="card-label">BENCHMARK</span>
          {athlete.benchmark_level && (
            <BenchmarkBar
              level={athlete.benchmark_level}
              score={athlete.readiness_score}
              size="md"
            />
          )}
        </div>
        <div className="card-meta">
          <span className="card-label">LAST TEST</span>
          <span className="card-value">{daysSince(athlete.last_test_date)}</span>
        </div>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { token } = useAuth();
  const { activeTeam } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [alertOpen, setAlertOpen] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [athletesError, setAthletesError] = useState<string | null>(null);
  const mockByName = useMemo(
    () => new Map(MOCK_ATHLETES.map((m) => [m.name.toLowerCase(), m])),
    []
  );

  useEffect(() => {
    if (!token || !activeTeam) {
      setAthletes([]);
      setAthletesError(null);
      setLoadingAthletes(false);
      return;
    }
    setLoadingAthletes(true);
    setAthletesError(null);
    fetch(`/api/teams/${activeTeam.id}/players`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load athletes');
        return (await res.json()) as Athlete[];
      })
      .then((rows) => {
        const enriched = rows.map((row) => {
          const fromMock = mockByName.get((row.name ?? '').toLowerCase());
          if (fromMock) {
            return {
              ...row,
              position: row.position ?? fromMock.position,
              readiness_score: row.readiness_score ?? fromMock.readiness_score,
              readiness_level: row.readiness_level ?? fromMock.readiness_level,
              benchmark_level: row.benchmark_level ?? fromMock.benchmark_level,
              last_test_date: row.last_test_date ?? fromMock.last_test_date,
              needs_attention: row.needs_attention ?? fromMock.needs_attention,
            };
          }
          const fallback = deriveProfileFromId(row.id);
          return {
            ...row,
            ...fallback,
            position: row.position ?? fallback.position,
          };
        });
        setAthletes(enriched);
      })
      .catch((err) => setAthletesError(err instanceof Error ? err.message : 'Failed to load athletes'))
      .finally(() => setLoadingAthletes(false));
  }, [token, activeTeam, mockByName]);

  if (!activeTeam) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1 className="dashboard-title">No team available</h1>
        </div>
      </div>
    );
  }

  const attentionAthletes = athletes.filter(a => a.needs_attention);
  const filtered = filter === 'all' ? athletes
    : filter === 'attention' ? athletes.filter(a => a.needs_attention)
    : athletes.filter(a => !a.needs_attention);

  return (
    <div className="dashboard">
      {attentionAthletes.length > 0 && (
        <div className="alert-bar">
          <button className="alert-toggle" onClick={() => setAlertOpen(o => !o)}>
            <span className="alert-dot" />
            <span className="alert-text">
              {attentionAthletes.length} athlete{attentionAthletes.length > 1 ? 's' : ''} need attention today
            </span>
            <span className="alert-chevron">{alertOpen ? '▴' : '▾'}</span>
          </button>
          {alertOpen && (
            <div className="alert-details">
              {attentionAthletes.map(a => (
                <button key={a.id} className="alert-item" onClick={() => navigate(`/athletes/${a.id}`)}>
                  <span className="alert-item-name">{a.name}</span>
                  <span className="alert-item-info">Readiness {a.readiness_score} · {a.position}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="dashboard-header">
        <h1 className="dashboard-title">
          {activeTeam.name}
          <span className="dashboard-count">{athletes.length}</span>
        </h1>
        <div className="filter-tabs">
          {([
            ['all', `All (${athletes.length})`],
            ['attention', `Needs Attention (${attentionAthletes.length})`],
            ['good', `Good (${athletes.length - attentionAthletes.length})`],
          ] as [Filter, string][]).map(([key, label]) => (
            <button key={key}
              className={`filter-tab ${filter === key ? 'filter-tab--active' : ''}`}
              onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="athlete-grid">
        {loadingAthletes && <div className="dashboard-empty">Loading athletes...</div>}
        {athletesError && <div className="dashboard-empty">{athletesError}</div>}
        {!loadingAthletes && !athletesError && filtered.length === 0 && (
          <div className="dashboard-empty">No athletes in this team yet.</div>
        )}
        {filtered.map(athlete => (
          <AthleteCard key={athlete.id} athlete={athlete}
            onClick={() => navigate(`/athletes/${athlete.id}`)} />
        ))}
      </div>
    </div>
  );
}