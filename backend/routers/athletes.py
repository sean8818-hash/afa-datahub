from fastapi import APIRouter, Query
from database import get_db
from datetime import date

router = APIRouter()

def calc_age(birthday):
    if not birthday:
        return None
    today = date.today()
    return today.year - birthday.year - ((today.month, today.day) < (birthday.month, birthday.day))

def benchmark_level(score):
    if score is None:
        return None
    if score <= 20: return 'weak'
    if score <= 40: return 'fair'
    if score <= 60: return 'average'
    if score <= 80: return 'good'
    return 'excellent'

@router.get("")
def get_athletes(group_id: int = Query(None, description="队伍ID")):
    """获取运动员列表，可按队伍筛选"""
    with get_db() as conn:
        with conn.cursor() as cur:
            if group_id:
                cur.execute("""
                    SELECT 
                        u.id,
                        u.email,
                        u.height AS height_cm,
                        u.weight AS weight_kg,
                        u.birthday AS birth_date,
                        u.gender,
                        u.country AS nationality,
                        u.avatar AS avatar_url,
                        ai.name,
                        ai.position,
                        ai.team_code,
                        ga.group_id AS team_id
                    FROM tp_mirror_users u
                    LEFT JOIN tp_mirror_user_advancedinfo ai ON ai.user_id = u.id
                    LEFT JOIN tp_mirror_group_assign ga ON ga.user_id = u.id
                    WHERE ga.group_id = %s AND u.status = 1
                    ORDER BY u.id
                """, (group_id,))
            else:
                cur.execute("""
                    SELECT 
                        u.id,
                        u.email,
                        u.height AS height_cm,
                        u.weight AS weight_kg,
                        u.birthday AS birth_date,
                        u.gender,
                        u.country AS nationality,
                        u.avatar AS avatar_url,
                        ai.name,
                        ai.position,
                        ai.team_code
                    FROM tp_mirror_users u
                    LEFT JOIN tp_mirror_user_advancedinfo ai ON ai.user_id = u.id
                    WHERE u.status = 1
                    ORDER BY u.id
                    LIMIT 100
                """)
            athletes = cur.fetchall()

            # 补充 readiness 数据
            for a in athletes:
                a['age'] = calc_age(a.get('birth_date'))
                uid = a['id']

                # 获取最新 readiness 分数
                cur.execute("""
                    SELECT param_value, tcreated
                    FROM tp_mirror_data_alltest
                    WHERE user_id = %s AND param_id = 'A00012' AND group_id = 19
                    ORDER BY tcreated DESC LIMIT 1
                """, (uid,))
                row = cur.fetchone()
                if row:
                    score = int(float(row['param_value']))
                    a['readiness_score'] = score
                    a['readiness_level'] = benchmark_level(score)
                    a['last_test_date'] = str(row['tcreated'])[:10]
                else:
                    a['readiness_score'] = None
                    a['readiness_level'] = None
                    a['last_test_date'] = None

                a['benchmark_level'] = benchmark_level(a.get('readiness_score'))
                a['needs_attention'] = (a.get('readiness_score') or 100) < 60

            return athletes

@router.get("/{athlete_id}")
def get_athlete(athlete_id: int):
    """获取单个运动员详情"""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    u.id,
                    u.email,
                    u.height AS height_cm,
                    u.weight AS weight_kg,
                    u.birthday AS birth_date,
                    u.gender,
                    u.country AS nationality,
                    u.avatar AS avatar_url,
                    ai.name,
                    ai.position
                FROM tp_mirror_users u
                LEFT JOIN tp_mirror_user_advancedinfo ai ON ai.user_id = u.id
                WHERE u.id = %s
            """, (athlete_id,))
            athlete = cur.fetchone()
            if not athlete:
                return {"error": "Athlete not found"}

            athlete['age'] = calc_age(athlete.get('birth_date'))

            # readiness
            cur.execute("""
                SELECT param_value, tcreated
                FROM tp_mirror_data_alltest
                WHERE user_id = %s AND param_id = 'A00012' AND group_id = 19
                ORDER BY tcreated DESC LIMIT 1
            """, (athlete_id,))
            row = cur.fetchone()
            if row:
                score = int(float(row['param_value']))
                athlete['readiness_score'] = score
                athlete['readiness_level'] = benchmark_level(score)
                athlete['last_test_date'] = str(row['tcreated'])[:10]
            else:
                athlete['readiness_score'] = None
                athlete['readiness_level'] = None
                athlete['last_test_date'] = None

            athlete['benchmark_level'] = benchmark_level(athlete.get('readiness_score'))
            athlete['needs_attention'] = (athlete.get('readiness_score') or 100) < 60

            return athlete
