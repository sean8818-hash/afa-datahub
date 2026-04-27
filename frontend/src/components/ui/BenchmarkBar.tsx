import type { BenchmarkLevel } from '../../types';
import './BenchmarkBar.css';

const LEVELS: BenchmarkLevel[] = ['weak', 'fair', 'average', 'good', 'excellent'];

const LABELS: Record<BenchmarkLevel, string> = {
  weak:      'Developing',
  fair:      'Good',
  average:   'Average',
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

// 上方标注文字的垂直位置，错开避免重叠
const LABEL_ROW: Record<BenchmarkLevel, number> = {
  weak:      0,
  fair:      1,
  average:   0,
  good:      1,
  excellent: 0,
};

interface Props {
  level: BenchmarkLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function BenchmarkBar({ level, showLabel = true, size = 'md' }: Props) {
  const activeIndex = LEVELS.indexOf(level);

  return (
    <div className={`benchmark benchmark--${size}`} role="img" aria-label={`Benchmark: ${LABELS[level]}`}>

      {/* 上方错开标注 */}
      {showLabel && size === 'md' && (
        <div className="benchmark-labels-top">
          {LEVELS.map((l, i) => (
            <div key={l} className="benchmark-label-col">
              <span
                className={`benchmark-label-top ${i <= activeIndex ? 'benchmark-label-top--active' : ''}`}
                style={{
                  color: i <= activeIndex ? SEG_COLORS[l] : 'transparent',
                  marginTop: LABEL_ROW[l] === 1 ? '14px' : '0px',
                  borderBottom: l === level ? `1px solid ${SEG_COLORS[l]}` : 'none',
                }}
              >
                {LABELS[l]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 分段色条 */}
      <div className="benchmark-segs">
        {LEVELS.map((l, i) => (
          <div
            key={l}
            className={`benchmark-seg ${i <= activeIndex ? 'benchmark-seg--active' : ''}`}
            style={{ background: i <= activeIndex ? SEG_COLORS[l] : 'rgba(255,255,255,0.08)' }}
          />
        ))}
      </div>

      {/* 底部端点 */}
      {size === 'md' && (
        <div className="benchmark-endpoints">
          <span style={{ color: '#22c55e' }}>Developing</span>
          <span style={{ color: '#14b8a6' }}>Good</span>
          <span style={{ color: '#ef4444' }}>Elite</span>
        </div>
      )}
    </div>
  );
}