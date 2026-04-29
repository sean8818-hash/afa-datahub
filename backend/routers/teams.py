from typing import Any, Dict, Iterable

from fastapi import APIRouter, Depends, HTTPException, status
from database import get_db
from security import get_current_admin

router = APIRouter()

def _admin_id_from_token(current_admin: Dict[str, Any]) -> int:
    raw = current_admin.get("sub")
    try:
        return int(raw)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token payload",
        ) from exc


def _run_first_success(cur, attempts: Iterable[tuple[str, tuple[Any, ...]]]):
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


@router.get("")
def get_teams(current_admin: Dict[str, Any] = Depends(get_current_admin)):
    """根据已登录 admin 返回可访问团队列表"""
    admin_id = _admin_id_from_token(current_admin)

    attempts = [
        (
            """
            SELECT
                t.id AS id,
                t.team_name AS name,
                t.code AS code,
                COUNT(DISTINCT tm.member_id) AS athlete_count
            FROM tp_mirror_admin_team t
            LEFT JOIN tp_mirror_admin_team_members tm
                ON tm.team_id = t.id
               AND COALESCE(tm.del_flag, 0) = 0
            WHERE t.user_id = %s
              AND COALESCE(t.del_flag, 0) = 0
            GROUP BY t.id, t.team_name, t.code
            ORDER BY t.id
            """,
            (admin_id,),
        ),
        (
            """
            SELECT
                t.team_id AS id,
                t.team_name AS name,
                t.team_code AS code,
                COUNT(DISTINCT tm.member_id) AS athlete_count
            FROM mirror_admin_team t
            LEFT JOIN mirror_admin_team_members tm ON tm.team_id = t.team_id
            WHERE t.admin_id = %s
            GROUP BY t.team_id, t.team_name, t.team_code
            ORDER BY t.team_id
            """,
            (admin_id,),
        ),
        (
            """
            SELECT
                t.id AS id,
                t.name AS name,
                t.code AS code,
                COUNT(DISTINCT tm.member_id) AS athlete_count
            FROM mirror_admin_team t
            LEFT JOIN mirror_admin_team_members tm ON tm.team_id = t.id
            WHERE t.admin_id = %s
            GROUP BY t.id, t.name, t.code
            ORDER BY t.id
            """,
            (admin_id,),
        ),
        (
            """
            SELECT
                t.id AS id,
                t.team_name AS name,
                t.code AS code,
                COUNT(DISTINCT tm.member_id) AS athlete_count
            FROM tp_mirror_admin_team t
            LEFT JOIN tp_mirror_admin_team_members tm ON tm.team_id = t.id
            WHERE t.user_id = %s
            GROUP BY t.id, t.team_name, t.code
            ORDER BY t.id
            """,
            (admin_id,),
        ),
    ]

    with get_db() as conn:
        with conn.cursor() as cur:
            rows = _run_first_success(cur, attempts)
            return [
                {
                    "id": row.get("id"),
                    "name": row.get("name") or f"Team {row.get('id')}",
                    "code": row.get("code"),
                    "athlete_count": row.get("athlete_count", 0),
                }
                for row in rows
            ]


@router.get("/{team_id}/players")
def get_team_players(
    team_id: int,
    current_admin: Dict[str, Any] = Depends(get_current_admin),
):
    """根据 team 返回该 admin 可访问成员列表"""
    admin_id = _admin_id_from_token(current_admin)

    attempts = [
        (
            """
            SELECT
                u.id,
                COALESCE(NULLIF(u.name, ''), u.email) AS name,
                NULL AS position,
                u.avatar AS avatar_url,
                tm.team_id AS team_id
            FROM tp_mirror_admin_team_members tm
            JOIN tp_mirror_admin_team t ON t.id = tm.team_id
            JOIN tp_mirror_users u ON u.id = tm.member_id
            WHERE tm.team_id = %s
              AND t.user_id = %s
              AND COALESCE(tm.del_flag, 0) = 0
              AND COALESCE(t.del_flag, 0) = 0
            ORDER BY u.id
            """,
            (team_id, admin_id),
        ),
        (
            """
            SELECT
                u.id,
                COALESCE(ai.name, u.email) AS name,
                ai.position,
                u.avatar AS avatar_url,
                tm.team_id AS team_id
            FROM mirror_admin_team_members tm
            JOIN mirror_admin_team t ON t.team_id = tm.team_id
            JOIN tp_mirror_users u ON u.id = tm.member_id
            LEFT JOIN tp_mirror_user_advancedinfo ai ON ai.user_id = u.id
            WHERE tm.team_id = %s AND t.admin_id = %s
            ORDER BY u.id
            """,
            (team_id, admin_id),
        ),
        (
            """
            SELECT
                u.id,
                COALESCE(ai.name, u.email) AS name,
                ai.position,
                u.avatar AS avatar_url,
                tm.team_id AS team_id
            FROM mirror_admin_team_members tm
            JOIN mirror_admin_team t ON t.id = tm.team_id
            JOIN mirror_users u ON u.id = tm.member_id
            LEFT JOIN mirror_user_advancedinfo ai ON ai.user_id = u.id
            WHERE tm.team_id = %s AND t.admin_id = %s
            ORDER BY u.id
            """,
            (team_id, admin_id),
        ),
        (
            """
            SELECT
                u.id,
                COALESCE(ai.name, u.email) AS name,
                ai.position,
                u.avatar AS avatar_url,
                tm.team_id AS team_id
            FROM tp_mirror_admin_team_members tm
            JOIN tp_mirror_admin_team t ON t.id = tm.team_id
            JOIN tp_mirror_users u ON u.id = tm.member_id
            LEFT JOIN tp_mirror_user_advancedinfo ai ON ai.user_id = u.id
            WHERE tm.team_id = %s AND t.user_id = %s
            ORDER BY u.id
            """,
            (team_id, admin_id),
        ),
    ]

    with get_db() as conn:
        with conn.cursor() as cur:
            rows = _run_first_success(cur, attempts)
            return [
                {
                    "id": row.get("id"),
                    "name": row.get("name") or f"Player {row.get('id')}",
                    "position": row.get("position"),
                    "avatar_url": row.get("avatar_url"),
                    "team_id": row.get("team_id", team_id),
                }
                for row in rows
            ]
