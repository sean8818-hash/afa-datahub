from fastapi import APIRouter, Query
from typing import Optional
from database import get_connection
router = APIRouter(prefix="/test-category-params", tags=["Test Category Params"])
@router.get("")
def get_test_category_params(page: int = Query(1,ge=1), page_size: int = Query(20,ge=1,le=100),
    category: Optional[str]=None, testname: Optional[str]=None):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            where, params = [], []
            if category: where.append("category = %s"); params.append(category)
            if testname: where.append("testname LIKE %s"); params.append(f"%{testname}%")
            w = ("WHERE " + " AND ".join(where)) if where else ""
            cursor.execute(f"SELECT COUNT(*) as cnt FROM tp_mirror_test_category_param {w}", params)
            total = cursor.fetchone()["cnt"]
            offset = (page-1)*page_size
            cursor.execute(f"SELECT * FROM tp_mirror_test_category_param {w} LIMIT %s OFFSET %s", params+[page_size,offset])
            data = cursor.fetchall()
        return {"data": data, "total": total, "page": page, "page_size": page_size}
    finally: conn.close()
@router.get("/categories")
def get_categories():
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT DISTINCT category FROM tp_mirror_test_category_param ORDER BY category")
            return [r["category"] for r in cursor.fetchall()]
    finally: conn.close()
