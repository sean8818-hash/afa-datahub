from typing import Any, Dict, Iterable

from fastapi import APIRouter, Depends, Query

from database import get_db
from security import get_current_admin

router = APIRouter()


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


@router.get("/params")
def get_performance_params(
    category: str | None = Query(None),
    keyword: str | None = Query(None),
    limit: int = Query(300, ge=1, le=1000),
    _: Dict[str, Any] = Depends(get_current_admin),
):
    """返回 performance 参数配置列表（用于参数多选器）"""
    where_parts = []
    params: list[Any] = []

    if category:
        where_parts.append("category = %s")
        params.append(category)
    if keyword:
        where_parts.append("(shortname LIKE %s OR testname LIKE %s OR code LIKE %s)")
        like = f"%{keyword}%"
        params.extend([like, like, like])

    where_sql = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""

    attempts = [
        (
            f"""
            SELECT
                id, testid, testname, tags, category, code, shortname, format, unit
            FROM tp_mirror_test_category_param
            {where_sql}
            ORDER BY category, testid, id
            LIMIT %s
            """,
            tuple(params + [limit]),
        ),
        (
            f"""
            SELECT
                id, testid, testname, tags, category, code, shortname, format, unit
            FROM mirror_test_category_param
            {where_sql}
            ORDER BY category, testid, id
            LIMIT %s
            """,
            tuple(params + [limit]),
        ),
    ]

    with get_db() as conn:
        with conn.cursor() as cur:
            rows = _run_first_success(cur, attempts)
            return [
                {
                    "id": row.get("id"),
                    "test_id": row.get("testid"),
                    "test_name": row.get("testname"),
                    "tags": row.get("tags"),
                    "category": row.get("category"),
                    "code": row.get("code"),
                    "shortname": row.get("shortname"),
                    "format": row.get("format"),
                    "unit": row.get("unit"),
                }
                for row in rows
            ]
