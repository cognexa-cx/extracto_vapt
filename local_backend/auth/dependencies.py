"""
FastAPI dependencies enforcing the auth model:

- get_current_user      — web admin routes; requires a valid, non-revoked
                           JWT issued by POST .../login or .../refresh.
- require_user_or_device — ingestion routes shared with the kiosk/tablet
                            app, which has no per-user login; accepts either
                            a valid JWT OR a per-device X-Device-Id/X-Device-Key pair.
"""
import hmac
import logging

from fastapi import Header, HTTPException, status

import config
from auth.devices import authenticate_device
from auth.security import decode_access_token
from database.connection import fetchrow_query

logger = logging.getLogger(__name__)

_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


async def _user_from_bearer(authorization: str | None) -> dict | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload:
        return None

    # Cross-check against the live token_version column, not just the
    # token's own signature/expiry — this is what makes a logout or
    # password change actually take effect immediately instead of
    # waiting out the access token's own (short, but non-zero) expiry.
    # See auth/refresh_tokens.invalidate_all_sessions.
    row = await fetchrow_query(
        "SELECT is_active, token_version, must_change_password FROM users WHERE id = ?", payload["sub"]
    )
    if not row or not row["is_active"] or row["token_version"] != payload.get("tv"):
        return None

    return {
        "id": payload["sub"],
        "email": payload["email"],
        "role": payload["role"],
        "must_change_password": bool(row["must_change_password"]),
    }


_PASSWORD_CHANGE_REQUIRED = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Password change required",
    headers={"X-Password-Change-Required": "true"},
)


async def get_current_user_allow_password_change(
    authorization: str | None = Header(default=None),
) -> dict:
    """Like get_current_user but also accepts accounts flagged
    must_change_password — used only by /me and /change-password."""
    user = await _user_from_bearer(authorization)
    if not user:
        raise _UNAUTHENTICATED
    return user


async def get_current_user(
    authorization: str | None = Header(default=None),
) -> dict:
    user = await _user_from_bearer(authorization)
    if not user:
        raise _UNAUTHENTICATED
    if user["must_change_password"]:
        raise _PASSWORD_CHANGE_REQUIRED
    return user


async def _user_or_device_from_headers(
    authorization: str | None,
    x_device_key: str | None,
    x_device_id: str | None = None,
) -> dict | None:
    """Non-raising version of the require_user_or_device check, shared with
    GET /images/{path} in local_app.py — that route needs a plain yes/no
    (it has its own separate signed-URL path for a caller with no headers
    at all, e.g. a plain <img src>), not an automatic 401."""
    user = await _user_from_bearer(authorization)
    # A flagged account is not authenticated for anything except the
    # change-password flow, so fall through to the device-key check.
    if user and not user["must_change_password"]:
        return user

    # SCR-04: per-device credential (X-Device-Id + X-Device-Key), checked
    # against the devices table: hashed, expiring, individually revocable.
    if x_device_id:
        device = await authenticate_device(x_device_id, x_device_key)
        if device:
            return {
                "id": f"device:{device['id']}",
                "email": None,
                "role": "device",
                "device_id": device["id"],
            }
        return None

    # Deprecated shared key -- only when explicitly re-enabled for migration.
    if (
        config.ALLOW_LEGACY_SHARED_DEVICE_KEY
        and config.DEVICE_API_KEY
        and x_device_key
        and hmac.compare_digest(x_device_key, config.DEVICE_API_KEY)
    ):
        logger.warning(
            "Request authenticated with the deprecated shared device key",
            extra={"event": "legacy_shared_device_key_used"},
        )
        return {"id": "device", "email": None, "role": "device"}

    return None


async def require_user_or_device(
    authorization: str | None = Header(default=None),
    x_device_key: str | None = Header(default=None),
    x_device_id: str | None = Header(default=None),
) -> dict:
    user = await _user_or_device_from_headers(authorization, x_device_key, x_device_id)
    if not user:
        raise _UNAUTHENTICATED
    return user
