"""
Seeds a single admin account on startup, only if the users table is empty
and SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD are set — gives operators a real,
bcrypt-hashed account to log in with instead of a hardcoded frontend bypass.
"""
import logging
import uuid

import config
from auth.security import hash_password, verify_password
from auth.refresh_tokens import invalidate_all_sessions
from database.connection import execute_query, fetch_query, fetchrow_query
from services.pii import encrypt_row_fields

logger = logging.getLogger(__name__)

# Known placeholder values from .env.example / earlier scaffolding, in
# their documented casing — a real deployment that never got around to
# changing SEED_ADMIN_PASSWORD would otherwise seed a well-known,
# publicly-documented password on its Admin account. Refusing to seed
# forces the operator to set a real one before the app will create the
# account at all, rather than silently seeding a password that's
# effectively public knowledge.
_KNOWN_PLACEHOLDER_PASSWORDS = {
    "CHANGE_ME_ON_FIRST_LOGIN", "changeme", "change_me", "password",
    "admin123", "Admin@123", "password123",
}


def _case_variants(value: str) -> set[str]:
    """bcrypt compares exact bytes, so a lowercase-only placeholder list
    can't catch a hash of the mixed-case original (e.g. the actual
    documented value is CHANGE_ME_ON_FIRST_LOGIN, not
    change_me_on_first_login) — check the documented casing plus the
    obvious variants instead of assuming one canonical case."""
    return {value, value.lower(), value.upper(), value.title()}


def is_placeholder_password(password: str) -> bool:
    """True if `password` is one of the known publicly-documented placeholders."""
    lowered = password.strip().lower()
    return lowered in {p.lower() for p in _KNOWN_PLACEHOLDER_PASSWORDS}


async def _enforce_password_change_if_admin_uses_a_placeholder_password() -> None:
    """
    Runs every startup regardless of whether seeding happens this time —
    catches an admin account that was seeded with a placeholder password
    before seed_admin_user() started refusing to do that (SCR-02).

    Instead of only logging, the account is flagged must_change_password and
    all of its sessions are revoked: it can no longer reach any privileged
    endpoint until POST /api/usermanagement/change-password succeeds
    (enforced server-side in auth/dependencies.py).
    """
    admin_rows = await fetch_query(
        "SELECT id, password_hash, must_change_password FROM users WHERE role = 'Admin'"
    )
    candidates = {v for p in _KNOWN_PLACEHOLDER_PASSWORDS for v in _case_variants(p)}
    for admin_row in admin_rows:
        if admin_row["must_change_password"]:
            continue
        if any(verify_password(c, admin_row["password_hash"]) for c in candidates):
            await execute_query(
                "UPDATE users SET must_change_password = 1 WHERE id = ?", admin_row["id"]
            )
            await invalidate_all_sessions(admin_row["id"])
            logger.error(
                "SECURITY: an Admin account's password is a known placeholder value. "
                "The account is now locked to the change-password endpoint until a "
                "strong password is set.",
                extra={"event": "admin_placeholder_password_locked", "user_id": admin_row["id"]},
            )


async def seed_admin_user() -> None:
    await _enforce_password_change_if_admin_uses_a_placeholder_password()

    if not config.SEED_ADMIN_EMAIL or not config.SEED_ADMIN_PASSWORD:
        return

    existing_any = await fetchrow_query("SELECT TOP 1 id FROM users")
    if existing_any:
        return

    if is_placeholder_password(config.SEED_ADMIN_PASSWORD):
        logger.error(
            "SEED_ADMIN_PASSWORD is still set to a known placeholder value "
            "(e.g. from .env.example) — refusing to seed the admin account "
            "with a publicly-documented password. Set a real, unique "
            "SEED_ADMIN_PASSWORD in .env and restart."
        )
        return

    enc = encrypt_row_fields("users", email=config.SEED_ADMIN_EMAIL.strip().lower(), name="Admin")
    await execute_query(
        """
        INSERT INTO users (id, email, password_hash, name, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        str(uuid.uuid4()),
        enc["email"],
        hash_password(config.SEED_ADMIN_PASSWORD),
        enc["name"],
        "Admin",
        True,
    )
    logger.info(f"✅ Seeded initial admin user: {config.SEED_ADMIN_EMAIL}")
