"""
Refresh token issuance/validation/revocation — see database/connection.py's
_CREATE_REFRESH_TOKENS_TABLE_SQL for the schema and auth/security.py for
the hashing. This is the only place that talks to the refresh_tokens
table; routes/auth.py's /login, /refresh, and /logout call into here
rather than touching the table directly.
"""
from datetime import datetime, timedelta, timezone

import config
from auth.security import generate_refresh_token, hash_refresh_token
from database.connection import execute_query, fetchrow_query


async def issue_refresh_token(user_id: str) -> str:
    """Create a new refresh token row and return the RAW token (only time
    it's ever available in plaintext — the row stores only its hash)."""
    raw_token = generate_refresh_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=config.REFRESH_TOKEN_EXPIRE_DAYS)
    await execute_query(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        user_id, hash_refresh_token(raw_token), expires_at,
    )
    return raw_token


async def validate_and_rotate(raw_token: str) -> tuple[str, str] | None:
    """
    Look up a refresh token by hash; if it's valid (exists, not expired,
    not already revoked), revoke it and issue a replacement in the same
    call — rotation means a refresh token is single-use, so a stolen and
    replayed old refresh token fails (already revoked) instead of
    silently working forever.

    Returns (user_id, new_raw_refresh_token) on success, None on failure.
    """
    token_hash = hash_refresh_token(raw_token)
    row = await fetchrow_query(
        "SELECT * FROM refresh_tokens WHERE token_hash = ?", token_hash
    )
    if not row or row["revoked_at"] is not None:
        return None

    expires_at = row["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None

    await execute_query(
        "UPDATE refresh_tokens SET revoked_at = GETUTCDATE() WHERE id = ?", row["id"]
    )
    new_token = await issue_refresh_token(row["user_id"])
    return row["user_id"], new_token


async def revoke_refresh_token(raw_token: str) -> None:
    """Used by /logout — revokes just the one token/session, leaving any
    other device's session untouched."""
    await execute_query(
        "UPDATE refresh_tokens SET revoked_at = GETUTCDATE() "
        "WHERE token_hash = ? AND revoked_at IS NULL",
        hash_refresh_token(raw_token),
    )


async def revoke_all_for_user(user_id: str) -> None:
    """Used alongside bumping users.token_version — revokes every
    outstanding refresh token for this user so no device can silently get
    a fresh access token after the access tokens themselves are
    invalidated."""
    await execute_query(
        "UPDATE refresh_tokens SET revoked_at = GETUTCDATE() "
        "WHERE user_id = ? AND revoked_at IS NULL",
        user_id,
    )


async def invalidate_all_sessions(user_id: str) -> None:
    """Logout-everywhere: bump token_version (kills every access token
    already issued, since their `tv` claim now mismatches) and revoke
    every refresh token (so nothing can silently mint a new access token
    afterward either). Call this on password change."""
    await execute_query(
        "UPDATE users SET token_version = token_version + 1 WHERE id = ?", user_id
    )
    await revoke_all_for_user(user_id)


async def cleanup_expired_tokens() -> None:
    """
    Delete refresh_tokens rows that no longer serve any purpose — run
    periodically from local_app.py's lifespan, not on a request path.

    Naturally expired rows are deleted immediately; revoked rows are kept
    for REFRESH_TOKEN_REVOKED_RETENTION_DAYS before deletion (briefly
    around for incident investigation, not purged instantly or kept
    forever).
    """
    await execute_query(
        "DELETE FROM refresh_tokens WHERE expires_at < GETUTCDATE()"
    )
    await execute_query(
        "DELETE FROM refresh_tokens WHERE revoked_at IS NOT NULL "
        "AND revoked_at < DATEADD(DAY, -?, GETUTCDATE())",
        config.REFRESH_TOKEN_REVOKED_RETENTION_DAYS,
    )
