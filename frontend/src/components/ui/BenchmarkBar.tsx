import type { BenchmarkLevel } from '../../types';

const LEVELS: BenchmarkLevel[] = ['weak', 'fair', 'average', 'good', 'excellent'];

const LABELS: Record<BenchmarkLevel, string> = {
  weak:      'Developing',
  fair:      'Average',
  average:   'Good',
  good:      'Excellent',
  excellent: 'Elite',
};

const SEG_COLORS: Record<BenchmarkLevel, string> = {
  weak:      '#22c55e',
  fair:      '#14b8a6',
  average:   '#eab308',
  good:      '#f97316',
  excellent: '#ef4444',
};

function scoreToLevel(score: number): BenchmarkLevel {
  if (score <= 20) return 'weak';
  if (score <= 40) return 'fair';
  if (score <= 60) return 'average';
  if (score <= 80) return 'good';
  return 'excellent';
}

function scoreToPosition(score: number): number {
  return Math.min(100, Math.max(0, score));
}

interface Props {
  level: BenchmarkLevel;
  score?: number;
  size?: 'sm' | 'md';
}

export function BenchmarkBar({ level, score, size = 'md' }: Props) {
  const activeIndex = LEVELS.indexOf(level);
  const segHeight = size === 'sm' ? '4px' : '6px';

  const indicatorLevel = score != null ? scoreToLevel(score) : level;
  const indicatorPos = score != null ? scoreToPosition(score) : null;
  const indicatorColor = SEG_COLORS[indicatorLevel];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>

      {/* 上方当前等级标注 */}
      {size === 'md' && indicatorPos != null && (
        <div style={{ position: 'relative', height: '14px' }}>
          <span style={{
            position: 'absolute',
            left: `${indicatorPos}%`,
            transform: indicatorPos > 85 ? 'translateX(-100%)' : indicatorPos < 15 ? 'translateX(0%)' : 'translateX(-50%)',
            fontSize: '9px',
            fontWeight: 600,
            color: indicatorColor,
            whiteSpace: 'nowrap',
          }}>
            {LABELS[indicatorLevel]}
          </span>
        </div>
      )}

      {/* 色条 + 指示点 */}
      <div style={{ position: 'relative', width: '100%', height: segHeight }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '3px', width: '100%', height: segHeight }}>
          {LEVELS.map((l, i) => (
            <div key={l} style={{
              flex: 1,
              height: segHeight,
              borderRadius: '3px',
              background: i <= activeIndex ? SEG_COLORS[l] : 'rgba(255,255,255,0.12)',
            }} />
          ))}
        </div>

        {indicatorPos != null && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: `${indicatorPos}%`,
            transform: 'translate(-50%, -50%)',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: indicatorColor,
            border: '2px solid #fff',
            boxShadow: `0 0 6px ${indicatorColor}`,
            zIndex: 1,
          }} />
        )}
      </div>

      {/* 底部5个标签 */}
      {size === 'md' && (
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
          {LEVELS.map((l, i) => (
            <span key={l} style={{
              flex: 1,
              fontSize: '8px',
              textAlign: 'center',
              color: i <= activeIndex ? SEG_COLORS[l] : 'rgba(255,255,255,0.25)',
              fontWeight: l === level ? 600 : 400,
            }}>
              {LABELS[l]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}