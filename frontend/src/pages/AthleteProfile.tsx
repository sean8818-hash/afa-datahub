import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_ATHLETES } from '../lib/mockData';
import { BenchmarkBar } from '../components/ui/BenchmarkBar';
import type { BenchmarkLevel } from '../types';
import './AthleteProfile.css';

const TABS = ['Overview', 'Performance', 'Bio'] as const;
type Tab = typeof TABS[number];

const MOCK_METRICS = [
  { label: 'Vertical Jump', value: '42cm', score: 78, level: 'good' as BenchmarkLevel },
  { label: 'Sprint 30m', value: '4.2s', score: 65, level: 'average' as BenchmarkLevel },
  { label: 'RSI', value: '1.82', score: 82, level: 'excellent' as BenchmarkLevel },
  { label: 'Agility T-Test', value: '8.4s', score: 55, level: 'average' as BenchmarkLevel },
  { label: 'Grip Strength', value: '48kg', score: 70, level: 'good' as BenchmarkLevel },
  { label: 'VO2 Max', value: '52ml', score: 60, level: 'average' as BenchmarkLevel },
];

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

function OverviewTab() {
  return (
    <div className="tab-content">
      <div className="metrics-grid">
        {MOCK_METRICS.map(m => (
          <div key={m.label} className="metric-card">
            <span className="metric-label">{m.label}</span>
            <span className="metric-value">{m.value}</span>
            <span className="metric-score">Score {m.score}</span>
            <BenchmarkBar level={m.level} score={m.score} size="sm" />
          </div>
        ))}
      </div>
      <div className="overview-bottom">
        <div className="radar-wrap">
          <h3 className="section-title">Performance Radar</h3>
          <RadarChart scores={[78, 65, 55, 70, 60, 72]} />
        </div>
        <div className="test-results">
          <h3 className="section-title">Recent Tests</h3>
          <table className="results-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Score</th>
                <th>Result</th>
                <th>Benchmark</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_METRICS.map(m => (
                <tr key={m.label}>
                  <td>{m.label}</td>
                  <td className="td-score">{m.score}</td>
                  <td>{m.value}</td>
                  <td style={{ minWidth: '120px' }}>
                    <BenchmarkBar level={m.level} score={m.score} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

function BioTab({ athlete }: { athlete: typeof MOCK_ATHLETES[0] }) {
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
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  const athlete = MOCK_ATHLETES.find(a => a.id === Number(id));
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
      {activeTab === 'Overview' && <OverviewTab />}
      {activeTab === 'Performance' && <PerformanceTab />}
      {activeTab === 'Bio' && <BioTab athlete={athlete} />}
    </div>
  );
}