from fastapi import APIRouter
from database import get_db

router = APIRouter()

READINESS_PARAMS = {
    'A00012': 'overall',
    'A00041': 'physical',
    'A00278': 'cognitive',
    'A00263': 'prepare',
}

@router.get("/{athlete_id}")
def get_readiness(athlete_id: int):
    """获取运动员 Readiness 数据"""
    with get_db() as conn:
        with conn.cursor() as cur:
            param_ids = list(READINESS_PARAMS.keys())
            placeholders = ','.join(['%s'] * len(param_ids))

            cur.execute(f"""
                SELECT param_id, param_value, tcreated
                FROM tp_mirror_data_alltest
                WHERE user_id = %s
                  AND param_id IN ({placeholders})
                  AND group_id = 19
                ORDER BY tcreated DESC
                LIMIT %s
            """, [athlete_id] + param_ids + [len(param_ids) * 10])

            rows = cur.fetchall()

            latest = {}
            for row in rows:
                pid = row['param_id']
                if pid not in latest:
                    latest[pid] = float(row['param_value'])

            result = {
                'athlete_id': athlete_id,
                'overall':    int(latest.get('A00012', 0)),
                'physical':   int(latest.get('A00041', 0)),
                'cognitive':  int(latest.get('A00278', 0)),
                'prepare':    int(latest.get('A00263', 0)),
            }

            # 历史记录
            cur.execute("""
                SELECT param_value, DATE(tcreated) as date
                FROM tp_mirror_data_alltest
                WHERE user_id = %s AND param_id = 'A00012' AND group_id = 19
                ORDER BY tcreated DESC
                LIMIT 30
            """, (athlete_id,))
            history = cur.fetchall()
            result['history'] = [
                {'date': str(h['date']), 'score': int(float(h['param_value']))}
                for h in history
            ]

            return result
