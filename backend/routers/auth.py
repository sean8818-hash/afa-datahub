import hashlib
import json
import os
from typing import Any, Dict, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import requests
from requests import RequestException

from database import get_db
from security import JWT_EXPIRE_MINUTES, create_access_token, get_current_admin

router = APIRouter()

LOGIN_TABLES = ("mirror_admin_login", "tp_mirror_admin_login")
EMAIL_COLUMNS = ("email", "account", "username")
PASSWORD_COLUMNS = ("password", "passwd", "pwd", "pass")
ID_COLUMNS = ("id", "admin_id", "uid")
NAME_COLUMNS = ("name", "nickname", "realname", "username")
LEGACY_LOGIN_URL = os.getenv("LEGACY_LOGIN_URL", "https://api.afasense.com/api.php").strip()
LEGACY_LOGIN_TIMEOUT = int(os.getenv("LEGACY_LOGIN_TIMEOUT", 12))
LEGACY_PASSWORD_MODE = os.getenv("LEGACY_PASSWORD_MODE", "md5_if_needed").strip().lower()
LEGACY_VERIFY_SSL = os.getenv("LEGACY_VERIFY_SSL", "false").strip().lower() == "true"


class LoginRequest(BaseModel):
    email: str
    password: str


def _find_row(cur, email: str) -> Optional[Dict[str, Any]]:
    for table in LOGIN_TABLES:
        for column in EMAIL_COLUMNS:
            try:
                cur.execute(
                    f"SELECT * FROM {table} WHERE {column} = %s LIMIT 1",
                    (email,),
                )
            except Exception:
                continue

            row = cur.fetchone()
            if row:
                row["_table_name"] = table
                row["_email_column"] = column
                return row
    return None


def _pick_value(row: Dict[str, Any], columns: Tuple[str, ...], fallback: Any = None) -> Any:
    for key in columns:
        value = row.get(key)
        if value is not None and value != "":
            return value
    return fallback


def _response_data(payload: Dict[str, Any]) -> Dict[str, Any]:
    raw = payload.get("data")
    if raw is None:
        raw = payload.get("Data")
    if isinstance(raw, dict):
        return raw
    return {}


def _is_legacy_success(payload: Dict[str, Any]) -> bool:
    code = payload.get("code")
    if code is None:
        code = payload.get("Code")

    # Legacy projects often use one of these success codes.
    if code in (0, 1, 200, "0", "1", "200", "SUCCESS", "success"):
        return True

    data = _response_data(payload)
    if data:
        return True

    msg = str(payload.get("msg") or payload.get("message") or payload.get("Message") or "")
    return "success" in msg.lower()


def _extract_admin_info(legacy_payload: Dict[str, Any], fallback_email: str) -> Dict[str, Any]:
    data = _response_data(legacy_payload)
    admin_info = data.get("AdminInfo") if isinstance(data, dict) else None
    source = admin_info if isinstance(admin_info, dict) else data

    if not isinstance(source, dict):
        source = {}

    admin_id = (
        source.get("admin_id")
        or source.get("AdminID")
        or source.get("AdminId")
        or source.get("id")
        or source.get("uid")
        or source.get("UserId")
        or 0
    )
    admin_email = (
        source.get("email")
        or source.get("Email")
        or source.get("account")
        or source.get("Account")
        or fallback_email
    )
    admin_name = (
        source.get("name")
        or source.get("Name")
        or source.get("nickname")
        or source.get("NickName")
        or admin_email
    )

    return {
        "id": admin_id,
        "email": str(admin_email),
        "name": str(admin_name),
    }


def _login_via_legacy_70067(email: str, password: str) -> Optional[Dict[str, Any]]:
    if not LEGACY_LOGIN_URL:
        return None

    is_md5_hex = len(password) == 32 and all(ch in "0123456789abcdefABCDEF" for ch in password)

    if LEGACY_PASSWORD_MODE == "raw":
        legacy_password = password
    elif LEGACY_PASSWORD_MODE == "md5_if_needed":
        legacy_password = password if is_md5_hex else hashlib.md5(password.encode("utf-8")).hexdigest()
    else:
        legacy_password = hashlib.md5(password.encode("utf-8")).hexdigest()

    legacy_payload = {
        "RequireType": 70067,
        "Email": email,
        "Password": legacy_password,
    }

    # Legacy gateway expects multipart/form-data with one field "key"
    # containing a JSON string payload.
    resp = requests.post(
        LEGACY_LOGIN_URL,
        data={"key": json.dumps(legacy_payload, ensure_ascii=False)},
        timeout=LEGACY_LOGIN_TIMEOUT,
        verify=LEGACY_VERIFY_SSL,
    )
    resp.raise_for_status()
    payload = resp.json()
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Legacy login returned invalid JSON payload",
        )
    if not _is_legacy_success(payload):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return _extract_admin_info(payload, email)


@router.post("/login")
def login(payload: LoginRequest):
    email = payload.email.strip()
    if not email or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email and password are required",
        )

    admin_id: Any = 0
    admin_email = email
    admin_name = email
    auth_source = "db_fallback"

    try:
        legacy_admin = _login_via_legacy_70067(email, payload.password)
        if legacy_admin:
            admin_id = legacy_admin["id"]
            admin_email = legacy_admin["email"]
            admin_name = legacy_admin["name"]
            auth_source = "legacy_70067"
    except HTTPException:
        raise
    except (RequestException, ValueError):
        # If remote legacy login is not reachable, fallback to local DB validation.
        pass

    # If legacy login succeeded but returned id=0, look up the real id from local DB by email.
    if auth_source == "legacy_70067" and (not admin_id or admin_id == 0):
        with get_db() as conn:
            with conn.cursor() as cur:
                for tbl in ("tp_mirror_users", "mirror_users"):
                    for col in ("email", "account"):
                        try:
                            cur.execute(
                                f"SELECT id, name FROM {tbl} WHERE {col} = %s LIMIT 1",
                                (email,),
                            )
                            row = cur.fetchone()
                            if row:
                                admin_id = row["id"]
                                if not admin_name or admin_name == email:
                                    admin_name = row.get("name") or email
                                break
                        except Exception:
                            continue
                    if admin_id:
                        break

    if auth_source == "db_fallback":
        with get_db() as conn:
            with conn.cursor() as cur:
                admin_row = _find_row(cur, email)

        if not admin_row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        password_raw = _pick_value(admin_row, PASSWORD_COLUMNS)
        if password_raw is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Password column not found in admin table",
            )

        stored = str(password_raw).strip().lower()
        provided_raw = payload.password.strip().lower()
        provided_md5 = hashlib.md5(payload.password.encode("utf-8")).hexdigest().lower()
        if stored not in (provided_raw, provided_md5):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        admin_id = _pick_value(admin_row, ID_COLUMNS, 0)
        admin_email = str(_pick_value(admin_row, ("email",), email))
        admin_name = str(_pick_value(admin_row, NAME_COLUMNS, admin_email))

    token = create_access_token(
        {
            "sub": str(admin_id),
            "email": admin_email,
            "name": admin_name,
            "source": auth_source,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": JWT_EXPIRE_MINUTES * 60,
        "admin": {
            "id": admin_id,
            "email": admin_email,
            "name": admin_name,
        },
        "source": auth_source,
    }


@router.get("/me")
def me(current_admin: Dict[str, Any] = Depends(get_current_admin)):
    return {
        "admin": {
            "id": current_admin.get("sub"),
            "email": current_admin.get("email"),
            "name": current_admin.get("name"),
        }
    }
