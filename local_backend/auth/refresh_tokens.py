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


# Single T-SQL batch that consumes the presented token and inserts its
# successor atomically (SCR-01). The UPDATE ... OUTPUT only returns a row
# for the ONE request that flips revoked_at from NULL, so two concurrent
# requests presenting the same token can never both obtain a successor.
# XACT_ABORT + an explicit transaction make the revoke and the successor
# insert commit (or roll back) together; NOCOUNT keeps the final SELECT
# as the only result set.
_ROTATE_SQL = """
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @consumed TABLE (user_id VARCHAR(100));
BEGIN TRANSACTION;
UPDATE refresh_tokens
SET revoked_at = SYSUTCDATETIME()
OUTPUT INSERTED.user_id INTO @consumed
WHERE token_hash = ?
  AND revoked_at IS NULL
  AND expires_at > SYSUTCDATETIME();
INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
SELECT user_id, ?, ? FROM @consumed;
COMMIT TRANSACTION;
SELECT user_id FROM @consumed;
"""


async def validate_and_rotate(raw_token: str) -> tuple[str, str] | None:
    """
    Atomically consume a refresh token (it must exist, be unexpired and not
    already revoked) and issue its single-use replacement — rotation means a
    stolen and replayed old refresh token fails (already revoked) instead of
    silently working forever.

    Consumption and successor insertion happen in one transaction, so two
    concurrent requests with the same token cannot both succeed.

    Returns (user_id, new_raw_refresh_token) on success, None on failure.
    """
    new_raw_token = generate_refresh_token()
    new_expires_at = datetime.now(timezone.utc) + timedelta(days=config.REFRESH_TOKEN_EXPIRE_DAYS)
    row = await fetchrow_query(
        _ROTATE_SQL,
        hash_refresh_token(raw_token),
        hash_refresh_token(new_raw_token),
        new_expires_at,
    )
    if not row:
        return None
    return row["user_id"], new_raw_token


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
