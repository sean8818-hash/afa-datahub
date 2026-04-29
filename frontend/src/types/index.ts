export type BenchmarkLevel = 'weak' | 'fair' | 'average' | 'good' | 'excellent';

export interface Team {
  id: number;
  name: string;
  sport?: string;
  code?: string;
  athlete_count?: number;
}

export interface Athlete {
  id: number;
  name: string;
  email?: string;
  team_id: number;
  position?: string;
  avatar_url?: string;
  birth_date?: string;
  nationality?: string;
  height_cm?: number;
  weight_kg?: number;
  readiness_score?: number;
  readiness_level?: BenchmarkLevel;
  benchmark_level?: BenchmarkLevel;
  last_test_date?: string;
  needs_attention?: boolean;
}

export interface TestResult {
  id: number;
  athlete_id: number;
  test_name: string;
  category: string;
  score: number;
  raw_value?: number;
  raw_unit?: string;
  benchmark_level?: BenchmarkLevel;
  tested_at: string;
}

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
}

export interface PerformanceParam {
  id: number;
  test_id?: number;
  test_name?: string;
  tags?: string;
  category?: string;
  code: string;
  shortname?: string;
  format?: string;
  unit?: string;
}
