"""
Per-device credentials for the kiosk/tablet clients (SCR-04).

Each physical device gets its own random key, shown exactly once when the
device is registered. Only a SHA-256 hash is stored (the key is 256 bits of
CSPRNG output, so a fast hash is appropriate), the device has an expiry, and
it can be revoked individually. Requests identify themselves with
`X-Device-Id` and `X-Device-Key`, and the authenticated actor carries the
device id so activity can be attributed to a specific device.
"""
import hashlib
import hmac
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from database.connection import execute_query, fetch_query, fetchrow_query

logger = logging.getLogger(__name__)

DEFAULT_VALIDITY_DAYS = 365
MAX_VALIDITY_DAYS = 730
_LAST_USED_UPDATE_SECONDS = 300


def hash_device_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


async def register_device(name: str, valid_days: int = DEFAULT_VALIDITY_DAYS) -> dict:
    """Create a device and return its id and RAW key (the only time the raw
    key exists outside the device)."""
    if not 1 <= valid_days <= MAX_VALIDITY_DAYS:
        raise ValueError(f"valid_days must be between 1 and {MAX_VALIDITY_DAYS}")
    device_id = str(uuid.uuid4())
    raw_key = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=valid_days)
    await execute_query(
        "INSERT INTO devices (id, name, key_hash, expires_at) VALUES (?, ?, ?, ?)",
        device_id, name.strip(), hash_device_key(raw_key), expires_at,
    )
    logger.info("Device registered", extra={"event": "device_registered", "device_id": device_id})
    return {"device_id": device_id, "device_key": raw_key, "expires_at": expires_at.isoformat()}


async def revoke_device(device_id: str) -> bool:
    row = await fetchrow_query("SELECT id FROM devices WHERE id = ?", device_id)
    if not row:
        return False
    await execute_query(
        "UPDATE devices SET revoked_at = GETUTCDATE() WHERE id = ? AND revoked_at IS NULL",
        device_id,
    )
    logger.info("Device revoked", extra={"event": "device_revoked", "device_id": device_id})
    return True


async def list_devices() -> list[dict]:
    """Never returns key material."""
    return await fetch_query(
        "SELECT id, name, created_at, expires_at, revoked_at, last_used_at "
        "FROM devices ORDER BY created_at DESC"
    )


def _as_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def authenticate_device(device_id: str | None, presented_key: str | None) -> dict | None:
    """Return the device row if the credential is valid, active and unexpired."""
    if not device_id or not presented_key:
        return None
    row = await fetchrow_query(
        "SELECT id, name, key_hash, expires_at, revoked_at, last_used_at FROM devices WHERE id = ?",
        device_id,
    )
    # Hash + constant-time compare even when the device is unknown, so
    # timing doesn't reveal which device ids exist.
    expected = row["key_hash"] if row else "0" * 64
    ok = hmac.compare_digest(hash_device_key(presented_key), expected)
    if not row or not ok:
        return None
    now = datetime.now(timezone.utc)
    if row["revoked_at"] is not None or _as_utc(row["expires_at"]) <= now:
        return None

    last = row["last_used_at"]
    if last is None or (now - _as_utc(last)).total_seconds() > _LAST_USED_UPDATE_SECONDS:
        try:
            await execute_query(
                "UPDATE devices SET last_used_at = GETUTCDATE() WHERE id = ?", device_id
            )
        except Exception:  # bookkeeping must never fail a request
            logger.warning("Could not update device last_used_at")
    return row
