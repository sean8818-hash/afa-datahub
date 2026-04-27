import type { BenchmarkLevel } from '../../types';
import './BenchmarkBar.css';

const LEVELS: BenchmarkLevel[] = ['weak', 'fair', 'average', 'good', 'excellent'];
const LABELS: Record<BenchmarkLevel, string> = {
  weak: 'Weak', fair: 'Fair', average: 'Average', good: 'Good', excellent: 'Excellent',
};

interface Props {
  level: BenchmarkLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function BenchmarkBar({ level, showLabel = true, size = 'md' }: Props) {
  const activeIndex = LEVELS.indexOf(level);

  return (
    <div className={`benchmark benchmark--${size}`}>
      <div className="benchmark-track" role="img" aria-label={`Benchmark: ${LABELS[level]}`}>
        {LEVELS.map((l, i) => (
          <div
            key={l}
            className={`benchmark-seg benchmark-seg--${l} ${i <= activeIndex ? 'benchmark-seg--active' : ''}`}
          />
        ))}
      </div>
      {showLabel && (
        <span className={`benchmark-label benchmark-label--${level}`}>
          {LABELS[level]}
        </span>
      )}
    </div>
  );
}
