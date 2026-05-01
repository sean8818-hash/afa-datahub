from fastapi import APIRouter, Query
from database import get_db

router = APIRouter()


def _run_first_success(cur, attempts):
    last_exc = None
    for sql, params in attempts:
        try:
            cur.execute(sql, params)
            return cur.fetchall()
        except Exception as exc:
            last_exc = exc
            continue
    if last_exc:
        raise last_exc
    return []


def _run_first_nonempty_success(cur, attempts):
    last_exc = None
    first_empty = None
    for sql, params in attempts:
        try:
            cur.execute(sql, params)
            rows = cur.fetchall()
            if rows:
                return rows
            if first_empty is None:
                first_empty = rows
        except Exception as exc:
            last_exc = exc
            continue
    if first_empty is not None:
        return first_empty
    if last_exc:
        raise last_exc
    return []

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


@router.get("/{athlete_id}/metrics")
def get_athlete_key_metrics(athlete_id: int, limit: int = Query(8, ge=1, le=40)):
    """Overview Key Metrics: shortname / testname / param_value / tcreated"""
    data_attempts = [
        (
            """
            SELECT
                d.param_id,
                d.param_value,
                d.tcreated,
                d.test_id
            FROM tp_mirror_data_alltest d
            WHERE d.user_id = %s
            ORDER BY d.tcreated DESC
            LIMIT %s
            """,
            (athlete_id, limit * 8),
        ),
        (
            """
            SELECT
                d.param_id,
                d.param_value,
                d.tcreated,
                d.test_id
            FROM tp_mirror_data_alljsonrpt d
            WHERE d.user_id = %s
            ORDER BY d.tcreated DESC
            LIMIT %s
            """,
            (athlete_id, limit * 8),
        ),
        (
            """
            SELECT
                d.param_id,
                d.param_value,
                d.tcreated,
                d.test_id
            FROM tp_mirror_data_alljsionrpt d
            WHERE d.user_id = %s
            ORDER BY d.tcreated DESC
            LIMIT %s
            """,
            (athlete_id, limit * 8),
        ),
        (
            """
            SELECT
                d.param_id,
                d.param_value,
                d.tcreated,
                d.test_id
            FROM mirror_data_alltest d
            WHERE d.user_id = %s
            ORDER BY d.tcreated DESC
            LIMIT %s
            """,
            (athlete_id, limit * 8),
        ),
        (
            """
            SELECT
                d.param_id,
                d.param_value,
                d.tcreated,
                d.test_id
            FROM mirror_data_alljsonrpt d
            WHERE d.user_id = %s
            ORDER BY d.tcreated DESC
            LIMIT %s
            """,
            (athlete_id, limit * 8),
        ),
        (
            """
            SELECT
                d.param_id,
                d.param_value,
                d.tcreated,
                d.test_id
            FROM mirror_data_alljsionrpt d
            WHERE d.user_id = %s
            ORDER BY d.tcreated DESC
            LIMIT %s
            """,
            (athlete_id, limit * 8),
        ),
    ]

    with get_db() as conn:
        with conn.cursor() as cur:
            rows = _run_first_nonempty_success(cur, data_attempts)

            latest_by_param = {}
            for row in rows:
                pid = row.get('param_id')
                if not pid or pid in latest_by_param:
                    continue
                latest_by_param[pid] = row
                if len(latest_by_param) >= limit:
                    break

            wanted_codes = [str(r.get('param_id')) for r in latest_by_param.values() if r.get('param_id')]
            by_exact = {}
            by_code = {}
            if wanted_codes:
                placeholders = ",".join(["%s"] * len(wanted_codes))
                param_attempts = [
                    (
                        f"""
                        SELECT code, testid, shortname, testname, unit
                        FROM tp_mirror_test_category_param
                        WHERE code IN ({placeholders})
                        """,
                        tuple(wanted_codes),
                    ),
                    (
                        f"""
                        SELECT code, testid, shortname, testname, unit
                        FROM mirror_test_category_param
                        WHERE code IN ({placeholders})
                        """,
                        tuple(wanted_codes),
                    ),
                ]
                param_rows = _run_first_success(cur, param_attempts)
                for prow in param_rows:
                    code = prow.get('code')
                    testid = prow.get('testid')
                    if code and testid is not None:
                        by_exact[(str(testid), str(code))] = prow
                    if code and str(code) not in by_code:
                        by_code[str(code)] = prow

            metrics = []
            for row in latest_by_param.values():
                test_id = row.get('test_id')
                param_id = row.get('param_id')
                meta = by_exact.get((str(test_id), str(param_id))) or by_code.get(str(param_id)) or {}
                unit = meta.get('unit')
                metrics.append(
                    {
                        'param_id': param_id,
                        'test_id': test_id,
                        'short_name': meta.get('shortname') or str(param_id),
                        'test_name': meta.get('testname') or '-',
                        'param_value': row.get('param_value'),
                        'unit': unit,
                        'tested_at': str(row.get('tcreated')) if row.get('tcreated') else '',
                    }
                )

            return {'athlete_id': athlete_id, 'metrics': metrics}
