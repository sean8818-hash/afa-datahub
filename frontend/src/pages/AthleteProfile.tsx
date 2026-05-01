import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MOCK_ATHLETES } from '../lib/mockData';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../hooks/useApp';
import { BenchmarkBar } from '../components/ui/BenchmarkBar';
import type { Athlete, BenchmarkLevel, PerformanceParam } from '../types';
import './AthleteProfile.css';

const TABS = ['Overview', 'Performance', 'Bio'] as const;
type Tab = typeof TABS[number];

interface KeyMetricRow {
  param_id: string;
  test_id: number | null;
  short_name: string;
  test_name: string;
  param_value: number | string | null;
  unit?: string | null;
  tested_at: string;
}

interface AthleteTestsPayload {
  athlete_id: number;
  tests: Array<{
    param_id: string;
    name: string;
    raw_display: string;
    score: number;
    tested_at: string;
  }>;
}

const MOCK_PERFORMANCE = [
  {
    category: 'EXPLOSIVE POWER',
    items: [
      { name: 'Vertical Jump', type: 'Explosive', score: 78, raw: 'Jump Height: 42cm', level: 'good' as BenchmarkLevel, note: 'Your score is very good, placing you above average for your age group.' },
      { name: 'CMJ', type: 'Reactive', score: 82, raw: 'Height: 44cm, RSI: 1.82', level: 'excellent' as BenchmarkLevel, note: 'Excellent reactive strength. You are in the top 15% of athletes.' },
    ]
  },
  {
    category: 'SPEED',
    items: [
      { name: 'Sprint 10m', type: 'Acceleration', score: 65, raw: 'Time: 1.82s', level: 'average' as BenchmarkLevel, note: 'Average acceleration. Focus on first-step quickness in training.' },
      { name: 'Sprint 30m', type: 'Max Speed', score: 60, raw: 'Time: 4.2s', level: 'average' as BenchmarkLevel, note: 'Room for improvement in top speed development.' },
    ]
  },
  {
    category: 'AGILITY',
    items: [
      { name: 'T-Test', type: 'Multi-directional', score: 55, raw: 'Time: 8.4s', level: 'average' as BenchmarkLevel, note: 'Below average agility. Recommend incorporating more change-of-direction drills.' },
    ]
  },
];

function RadarChart({ scores }: { scores: number[] }) {
  const labels = ['Power', 'Speed', 'Agility', 'Strength', 'Endurance', 'Reaction'];
  const cx = 140, cy = 140, r = 110;
  const n = labels.length;
  const angleFor = (i: number) => (i * 2 * Math.PI / n) - Math.PI / 2;
  const gridPoints = (ratio: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = angleFor(i);
      return cx + ratio * r * Math.cos(a) + ',' + (cy + ratio * r * Math.sin(a));
    }).join(' ');
  const dataPoints = scores.map((s, i) => {
    const a = angleFor(i);
    const d = (s / 100) * r;
    return (cx + d * Math.cos(a)) + ',' + (cy + d * Math.sin(a));
  }).join(' ');

  return (
    <svg width="280" height="280" viewBox="0 0 280 280">
      {[0.25, 0.5, 0.75, 1].map(ratio => (
        <polygon key={ratio} points={gridPoints(ratio)}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const a = angleFor(i);
        return <line key={i} x1={cx} y1={cy}
          x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
          stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
      })}
      <polygon points={dataPoints} fill="rgba(34,197,94,0.12)" stroke="#22c55e" strokeWidth="1.5" />
      {scores.map((s, i) => {
        const a = angleFor(i);
        const d = (s / 100) * r;
        return <circle key={i} cx={cx + d * Math.cos(a)} cy={cy + d * Math.sin(a)} r="3" fill="#22c55e" />;
      })}
      {labels.map((label, i) => {
        const a = angleFor(i);
        return (
          <text key={label}
            x={cx + (r + 16) * Math.cos(a)}
            y={cy + (r + 16) * Math.sin(a)}
            textAnchor="middle" dominantBaseline="central"
            fill="rgba(255,255,255,0.65)" fontSize="10" fontFamily="DM Sans, sans-serif">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function OverviewTab({ metrics, loading }: { metrics: KeyMetricRow[]; loading: boolean }) {
  const rows = metrics;
  const emptyRows: KeyMetricRow[] = Array.from({ length: 8 }, (_, idx) => ({
    param_id: `empty-${idx}`,
    test_id: null,
    short_name: '--',
    test_name: '--',
    param_value: '--',
    unit: null,
    tested_at: '--',
  }));

  return (
    <div className="tab-content">
      <div className="overview-top">
        <div className="overview-metrics">
          <h3 className="section-title">Key Metrics</h3>
          {loading && <div className="profile-mini-loading">Loading key metrics...</div>}
          {!loading && rows.length === 0 && <div className="profile-mini-loading">No metrics data.</div>}
          <div className="metrics-grid">
            {(rows.length > 0 ? rows : emptyRows).map((m) => (
              <div key={`${m.param_id}-${m.test_id ?? 'x'}`} className="metric-card">
                <span className="metric-label">{m.short_name}</span>
                <span className="metric-test">{m.test_name}</span>
                <span className="metric-value">{m.param_value ?? '--'}</span>
                <span className="metric-time">
                  {m.tested_at && m.tested_at !== '--' ? m.tested_at.slice(0, 10) : '--'}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="radar-wrap">
          <h3 className="section-title">Performance Radar</h3>
          <RadarChart scores={[78, 65, 55, 70, 60, 72]} />
        </div>
      </div>
      <div className="test-results">
        <h3 className="section-title">Recent Tests</h3>
        <table className="results-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Parameter</th>
              <th>Result</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {(rows.length > 0 ? rows : emptyRows).map((m) => (
              <tr key={`recent-${m.param_id}-${m.test_id ?? 'x'}`}>
                <td>{m.test_name}</td>
                <td>{m.short_name}</td>
                <td>{m.param_value ?? '--'}</td>
                <td>{m.tested_at && m.tested_at !== '--' ? m.tested_at.slice(0, 19) : '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PerformanceTab() {
  return (
    <div className="tab-content">
      {MOCK_PERFORMANCE.map(cat => (
        <div key={cat.category} className="perf-category">
          <h3 className="perf-category-title">{cat.category}</h3>
          <div className="perf-items">
            {cat.items.map(item => (
              <div key={item.name} className="perf-item">
                <div className="perf-item-header">
                  <div>
                    <span className="perf-item-name">{item.name}</span>
                    <span className="perf-item-type">{item.type}</span>
                  </div>
                  <div className="perf-item-score">{item.score}</div>
                </div>
                <div className="perf-item-raw">{item.raw}</div>
                <BenchmarkBar level={item.level} score={item.score} size="md" />
                <p className="perf-item-note">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BioTab({ athlete }: { athlete: Athlete }) {
  const fields = [
    { label: 'Full Name', value: athlete.name },
    { label: 'Nationality', value: athlete.nationality ?? '—' },
    { label: 'Date of Birth', value: athlete.birth_date ?? '—' },
    { label: 'Height', value: athlete.height_cm ? athlete.height_cm + ' cm' : '—' },
    { label: 'Weight', value: athlete.weight_kg ? athlete.weight_kg + ' kg' : '—' },
    { label: 'Position', value: athlete.position ?? '—' },
  ];
  return (
    <div className="tab-content">
      <div className="bio-grid">
        {fields.map(f => (
          <div key={f.label} className="bio-field">
            <span className="bio-label">{f.label}</span>
            <span className="bio-value">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AthleteProfile() {
  const { token } = useAuth();
  const { activeTeam } = useApp();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [teamAthletes, setTeamAthletes] = useState<Athlete[]>([]);
  const [loadingAthlete, setLoadingAthlete] = useState(false);
  const [keyMetrics, setKeyMetrics] = useState<KeyMetricRow[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const mockByName = useMemo(
    () => new Map(MOCK_ATHLETES.map((m) => [m.name.toLowerCase(), m])),
    []
  );

  useEffect(() => {
    if (!token || !activeTeam) {
      setTeamAthletes([]);
      return;
    }
    setLoadingAthlete(true);
    fetch(`/api/teams/${activeTeam.id}/players`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load athletes');
        return (await res.json()) as Athlete[];
      })
      .then((rows) => setTeamAthletes(rows))
      .catch(() => setTeamAthletes([]))
      .finally(() => setLoadingAthlete(false));
  }, [token, activeTeam]);

  useEffect(() => {
    if (!token || !id) {
      setKeyMetrics([]);
      return;
    }
    setLoadingMetrics(true);
    let cancelled = false;

    async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 15000): Promise<T> {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Request failed: ${url}`);
        return (await res.json()) as T;
      } finally {
        window.clearTimeout(timer);
      }
    }

    async function loadMetricsWithFallback() {
      // Path 1: dedicated metrics endpoint.
      try {
        const payload = await fetchJsonWithTimeout<{ metrics?: KeyMetricRow[] }>(
          `/api/tests/${id}/metrics?limit=8`,
          12000
        );
        const rows = Array.isArray(payload.metrics) ? payload.metrics : [];
        if (rows.length > 0) return rows;
      } catch {
        // Continue to fallback path.
      }

      // Path 2: rebuild from tests + params mapping.
      const [testsResult, paramsResult] = await Promise.allSettled([
        fetchJsonWithTimeout<AthleteTestsPayload>(`/api/tests/${id}?limit=30`, 12000),
        fetchJsonWithTimeout<PerformanceParam[]>(`/api/performance/params?limit=500`, 12000),
      ]);

      if (testsResult.status !== 'fulfilled') return [];

      const testsPayload = testsResult.value;
      const paramsPayload = paramsResult.status === 'fulfilled' ? paramsResult.value : [];
      const paramByCode = new Map(paramsPayload.map((p) => [p.code, p]));

      const dedup = new Map<string, KeyMetricRow>();
      (testsPayload.tests ?? []).forEach((t) => {
        if (!t.param_id || dedup.has(t.param_id)) return;
        const meta = paramByCode.get(t.param_id);
        dedup.set(t.param_id, {
          param_id: t.param_id,
          test_id: null,
          short_name: meta?.shortname || t.param_id,
          test_name: meta?.test_name || t.name || '-',
          param_value: t.raw_display || String(t.score ?? ''),
          unit: meta?.unit || null,
          tested_at: t.tested_at || '',
        });
      });
      return Array.from(dedup.values()).slice(0, 8);
    }

    (async () => {
      try {
        const rows = await loadMetricsWithFallback();
        if (!cancelled) {
          setKeyMetrics(rows);
        }
      } catch {
        if (!cancelled) {
          setKeyMetrics([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingMetrics(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, id]);

  const routeId = Number(id);
  const stateAthlete = (location.state as { athlete?: Athlete } | null)?.athlete;
  const athlete = useMemo(() => {
    const fromState = stateAthlete && stateAthlete.id === routeId ? stateAthlete : null;
    const fromTeam = teamAthletes.find((a) => a.id === routeId) ?? null;
    const fromMockById = MOCK_ATHLETES.find((a) => a.id === routeId) ?? null;
    const base = fromState ?? fromTeam ?? fromMockById;
    if (!base) return null;
    const fromMockByName = mockByName.get((base.name ?? '').toLowerCase());
    return {
      ...base,
      position: base.position ?? fromMockByName?.position ?? 'Athlete',
      readiness_score: base.readiness_score ?? fromMockByName?.readiness_score ?? 65,
      readiness_level: base.readiness_level ?? fromMockByName?.readiness_level ?? 'average',
      benchmark_level: base.benchmark_level ?? fromMockByName?.benchmark_level ?? 'average',
      last_test_date: base.last_test_date ?? fromMockByName?.last_test_date,
      nationality: base.nationality ?? fromMockByName?.nationality,
      height_cm: base.height_cm ?? fromMockByName?.height_cm,
      weight_kg: base.weight_kg ?? fromMockByName?.weight_kg,
    } satisfies Athlete;
  }, [stateAthlete, routeId, teamAthletes, mockByName]);

  if (!athlete && loadingAthlete) {
    return <div className="profile-not-found"><p>Loading athlete...</p></div>;
  }

  if (!athlete) return (
    <div className="profile-not-found">
      <p>Athlete not found</p>
      <button onClick={() => navigate('/')}>Back</button>
    </div>
  );

  const score = athlete.readiness_score ?? 0;
  const scoreColor = score >= 81 ? '#ef4444'
    : score >= 61 ? '#f97316'
    : score >= 41 ? '#eab308'
    : score >= 21 ? '#14b8a6'
    : '#22c55e';
  const circ = 2 * Math.PI * 36;
  const progress = (score / 100) * circ;

  const heightStr = athlete.height_cm ? athlete.height_cm + 'cm' : null;
  const weightStr = athlete.weight_kg ? athlete.weight_kg + 'kg' : null;

  return (
    <div className="profile">
      <div className="profile-header">
        <button className="profile-back" onClick={() => navigate(-1)}>Back</button>
        <div className="profile-hero">
          <div className="profile-avatar">
            {athlete.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{athlete.name}</h1>
            <div className="profile-meta">
              {athlete.position && <span className="profile-tag">{athlete.position}</span>}
              {athlete.nationality && <span className="profile-tag">{athlete.nationality}</span>}
              {heightStr && <span className="profile-tag">{heightStr}</span>}
              {weightStr && <span className="profile-tag">{weightStr}</span>}
            </div>
          </div>
          <svg width="90" height="90" viewBox="0 0 90 90" style={{ flexShrink: 0 }}>
            <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
            <circle cx="45" cy="45" r="36" fill="none" stroke={scoreColor} strokeWidth="5"
              strokeDasharray={progress + ' ' + circ} strokeLinecap="round"
              transform="rotate(-90 45 45)"/>
            <text x="45" y="41" textAnchor="middle" dominantBaseline="central"
              fill={scoreColor} fontSize="18" fontWeight="700" fontFamily="DM Mono, monospace">
              {score}
            </text>
            <text x="45" y="58" textAnchor="middle"
              fill="rgba(255,255,255,0.55)" fontSize="9" fontFamily="DM Sans, sans-serif">
              Readiness
            </text>
          </svg>
        </div>
        <div className="profile-tabs">
          {TABS.map(tab => (
            <button key={tab}
              className={'profile-tab' + (activeTab === tab ? ' profile-tab--active' : '')}
              onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </div>
      {activeTab === 'Overview' && <OverviewTab metrics={keyMetrics} loading={loadingMetrics} />}
      {activeTab === 'Performance' && <PerformanceTab />}
      {activeTab === 'Bio' && <BioTab athlete={athlete} />}
    </div>
  );
}