from fastapi import APIRouter, Query
from database import get_db

router = APIRouter()

BENCHMARK_PARAMS = {
    'A00001': {'name': 'Vertical Jump', 'category': 'EXPLOSIVE POWER', 'unit': 'cm', 'type': 'Explosive'},
    'A00037': {'name': 'CMJ',           'category': 'EXPLOSIVE POWER', 'unit': 'cm', 'type': 'Reactive'},
    'A00011': {'name': 'RSI',           'category': 'EXPLOSIVE POWER', 'unit': '',   'type': 'Reactive'},
    'A00004': {'name': 'Sprint 10m',    'category': 'SPEED',           'unit': 's',  'type': 'Acceleration'},
    'A00005': {'name': 'Sprint 30m',    'category': 'SPEED',           'unit': 's',  'type': 'Max Speed'},
    'A00263': {'name': 'Agility T-Test','category': 'AGILITY',         'unit': 's',  'type': 'Multi-directional'},
    'A00278': {'name': 'Grip Strength', 'category': 'STRENGTH',        'unit': 'kg', 'type': 'Isometric'},
}

def benchmark_level(score):
    if score is None: return None
    if score <= 20: return 'weak'
    if score <= 40: return 'fair'
    if score <= 60: return 'average'
    if score <= 80: return 'good'
    return 'excellent'

@router.get("/{athlete_id}")
def get_athlete_tests(athlete_id: int, limit: int = Query(10)):
    """获取运动员测试成绩"""
    with get_db() as conn:
        with conn.cursor() as cur:
            param_ids = list(BENCHMARK_PARAMS.keys())
            placeholders = ','.join(['%s'] * len(param_ids))

            cur.execute(f"""
                SELECT 
                    d.param_id,
                    d.param_value,
                    d.param_level,
                    d.tcreated,
                    d.test_id,
                    d.group_id
                FROM tp_mirror_data_alltest d
                WHERE d.user_id = %s
                  AND d.param_id IN ({placeholders})
                ORDER BY d.tcreated DESC
                LIMIT %s
            """, [athlete_id] + param_ids + [limit * len(param_ids)])

            rows = cur.fetchall()

            # 按 param_id 取最新一条
            latest = {}
            for row in rows:
                pid = row['param_id']
                if pid not in latest:
                    latest[pid] = row

            # 组装结果
            results = []
            categories = {}
            for param_id, meta in BENCHMARK_PARAMS.items():
                if param_id not in latest:
                    continue
                row = latest[param_id]
                value = float(row['param_value'])
                level = row['param_level'] or 50
                score = int(float(level)) if level else 50
                bench = benchmark_level(score)

                item = {
                    'param_id':   param_id,
                    'name':       meta['name'],
                    'category':   meta['category'],
                    'type':       meta['type'],
                    'raw_value':  value,
                    'raw_unit':   meta['unit'],
                    'raw_display':f"{value}{meta['unit']}",
                    'score':      score,
                    'benchmark_level': bench,
                    'tested_at':  str(row['tcreated'])[:10],
                }

                cat = meta['category']
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(item)
                results.append(item)

            return {
                'athlete_id': athlete_id,
                'tests':      results,
                'by_category': categories,
            }
