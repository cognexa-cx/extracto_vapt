"""
Password hashing (bcrypt), JWT issuance/verification, and refresh-token
hashing for the web admin login. No plaintext or reversible password
storage anywhere in this module, and refresh tokens are never stored raw
either (see auth/refresh_tokens.py for where the hash below is used).
"""
import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

import config


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # Malformed/empty hash — never let this raise into an auth path.
        return False


def create_access_token(user_id: str, email: str, role: str, token_version: int) -> str:
    """
    `token_version` is compared against users.token_version on every
    request (see auth/dependencies.py) — bumping the column instantly
    invalidates every access token issued before that point, without
    needing to track/blocklist individual JWTs.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tv": token_version,
        "iat": int(time.mktime(now.timetuple())),
        "exp": now + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def generate_refresh_token() -> str:
    """A random opaque string, not a JWT — nothing to decode, its only
    job is to be looked up (by hash) in the refresh_tokens table."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(raw_token: str) -> str:
    """SHA-256 is fine here (unlike password hashing): this is a
    high-entropy 48-byte random token, not a low-entropy human password,
    so there's no brute-forceable keyspace for a slow hash to defend
    against — the entropy IS the defense."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
