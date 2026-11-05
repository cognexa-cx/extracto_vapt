"""
Seeds a single admin account on startup, only if the users table is empty
and SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD are set — gives operators a real,
bcrypt-hashed account to log in with instead of a hardcoded frontend bypass.
"""
import logging
import uuid

import config
from auth.security import hash_password, verify_password
from database.connection import execute_query, fetchrow_query
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


async def _warn_if_admin_still_uses_a_placeholder_password() -> None:
    """
    Runs every startup regardless of whether seeding happens this time —
    catches the case (true of this project's own local deployment as of
    this fix) where the admin account was already seeded with a placeholder
    password *before* seed_admin_user() started refusing to do that. There's
    no forced-password-change route on this backend yet, so this can only
    warn loudly, not block login — but a warning on every single startup is
    hard to miss.
    """
    admin_row = await fetchrow_query(
        "SELECT TOP 1 password_hash FROM users WHERE role = 'Admin' ORDER BY created_at ASC"
    )
    if not admin_row:
        return
    candidates = {v for p in _KNOWN_PLACEHOLDER_PASSWORDS for v in _case_variants(p)}
    for candidate in candidates:
        if verify_password(candidate, admin_row["password_hash"]):
            logger.error(
                "SECURITY WARNING: the Admin account's password is still a known "
                "placeholder value. Log in and change it immediately — this "
                "warning will repeat on every startup until it's changed."
            )
            return


async def seed_admin_user() -> None:
    await _warn_if_admin_still_uses_a_placeholder_password()

    if not config.SEED_ADMIN_EMAIL or not config.SEED_ADMIN_PASSWORD:
        return

    existing_any = await fetchrow_query("SELECT TOP 1 id FROM users")
    if existing_any:
        return

    if config.SEED_ADMIN_PASSWORD.strip().lower() in {p.lower() for p in _KNOWN_PLACEHOLDER_PASSWORDS}:
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
