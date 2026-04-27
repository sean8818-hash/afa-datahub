from fastapi import APIRouter
from database import get_db

router = APIRouter()

@router.get("")
def get_teams():
    """获取所有队伍列表"""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    g.id,
                    g.group_name AS name,
                    g.sport_type AS sport,
                    COUNT(DISTINCT ga.user_id) AS athlete_count
                FROM tp_mirror_user_group g
                LEFT JOIN tp_mirror_group_assign ga ON ga.group_id = g.id
                WHERE g.status = 1
                GROUP BY g.id, g.group_name, g.sport_type
                ORDER BY g.id
            """)
            return cur.fetchall()
