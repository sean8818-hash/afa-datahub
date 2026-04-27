import type { Team, Athlete } from '../types';

export const MOCK_TEAMS: Team[] = [
  { id: 1, name: 'Tune Squad', sport: 'Basketball', athlete_count: 12 },
  { id: 2, name: 'Storm FC', sport: 'Soccer', athlete_count: 18 },
  { id: 3, name: 'Thunder Elite', sport: 'Athletics', athlete_count: 8 },
];

export const MOCK_ATHLETES: Athlete[] = [
  {
    id: 1, team_id: 1, name: 'Marcus Chen', position: 'Guard',
    readiness_score: 88, readiness_level: 'good',
    benchmark_level: 'excellent', last_test_date: '2026-04-24',
    height_cm: 185, weight_kg: 82, nationality: 'CHN', needs_attention: false,
  },
  {
    id: 2, team_id: 1, name: 'James Walker', position: 'Forward',
    readiness_score: 52, readiness_level: 'fair',
    benchmark_level: 'average', last_test_date: '2026-04-20',
    height_cm: 201, weight_kg: 98, nationality: 'USA', needs_attention: true,
  },
  {
    id: 3, team_id: 1, name: 'Yuki Tanaka', position: 'Center',
    readiness_score: 76, readiness_level: 'good',
    benchmark_level: 'good', last_test_date: '2026-04-23',
    height_cm: 210, weight_kg: 112, nationality: 'JPN', needs_attention: false,
  },
  {
    id: 4, team_id: 1, name: 'Alex Rivera', position: 'Guard',
    readiness_score: 91, readiness_level: 'excellent',
    benchmark_level: 'excellent', last_test_date: '2026-04-25',
    height_cm: 178, weight_kg: 76, nationality: 'ESP', needs_attention: false,
  },
  {
    id: 5, team_id: 1, name: 'Dmitri Volkov', position: 'Forward',
    readiness_score: 43, readiness_level: 'weak',
    benchmark_level: 'fair', last_test_date: '2026-04-18',
    height_cm: 196, weight_kg: 94, nationality: 'RUS', needs_attention: true,
  },
  {
    id: 6, team_id: 1, name: 'Leon Baptiste', position: 'Guard',
    readiness_score: 70, readiness_level: 'good',
    benchmark_level: 'good', last_test_date: '2026-04-22',
    height_cm: 182, weight_kg: 79, nationality: 'FRA', needs_attention: false,
  },
  {
    id: 7, team_id: 1, name: 'Omar Hassan', position: 'Center',
    readiness_score: 65, readiness_level: 'average',
    benchmark_level: 'average', last_test_date: '2026-04-21',
    height_cm: 207, weight_kg: 115, nationality: 'EGY', needs_attention: false,
  },
  {
    id: 8, team_id: 1, name: 'Kai Nakamura', position: 'Forward',
    readiness_score: 83, readiness_level: 'good',
    benchmark_level: 'good', last_test_date: '2026-04-24',
    height_cm: 193, weight_kg: 90, nationality: 'JPN', needs_attention: false,
  },
];
