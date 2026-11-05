import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

BASE_REQUIRED_VARS = [
    # MS SQL Server (SSMS) — same database Cloud Backend uses
    "SQL_SERVER_HOST",
    "SQL_SERVER_DB",
    # Auth
    "JWT_SECRET",
    "DEVICE_API_KEY",
    # PII field-level encryption (users/extraction_records/manual_entry_records
    # etc.) — see services/encryption.py.
    "ENCRYPTION_KEY",
]

missing_vars = [var for var in BASE_REQUIRED_VARS if not os.getenv(var)]
if missing_vars:
    raise RuntimeError(
        f"Missing required environment variable(s): {', '.join(missing_vars)}. "
        "Please check your .env file."
    )

# ── MS SQL Server (SSMS) ─────────────────────────────────────────────────────
SQL_SERVER_HOST     = os.getenv("SQL_SERVER_HOST", "localhost")
SQL_SERVER_PORT     = int(os.getenv("SQL_SERVER_PORT", "1433"))
SQL_SERVER_DB       = os.getenv("SQL_SERVER_DB", "extracto_db")
SQL_SERVER_USER     = os.getenv("SQL_SERVER_USER", "")
SQL_SERVER_PASSWORD = os.getenv("SQL_SERVER_PASSWORD", "")
SQL_SERVER_DRIVER   = os.getenv("SQL_SERVER_DRIVER", "ODBC Driver 17 for SQL Server")

# ── Runtime environment ───────────────────────────────────────────────────────
# "production" disables uvicorn's --reload (file-watcher, dev-only) and makes
# the global exception handler hide internal error details from responses.
# Anything other than "production" is treated as development.
# SCR-06: ENVIRONMENT must be set explicitly to a known value -- a missing or
# misspelled value fails startup instead of silently falling back to
# development (which exposes API docs and detailed error text).
_ALLOWED_ENVIRONMENTS = {"development", "test", "production"}
_raw_environment = os.getenv("ENVIRONMENT")
if _raw_environment is None:
    raise RuntimeError(
        "ENVIRONMENT must be explicitly configured "
        f"(one of: {', '.join(sorted(_ALLOWED_ENVIRONMENTS))})."
    )
ENVIRONMENT = _raw_environment.strip().lower()
if ENVIRONMENT not in _ALLOWED_ENVIRONMENTS:
    raise RuntimeError(
        f"Invalid ENVIRONMENT value {_raw_environment!r} "
        f"(one of: {', '.join(sorted(_ALLOWED_ENVIRONMENTS))})."
    )
IS_PRODUCTION = ENVIRONMENT == "production"

# ── Upload limits ─────────────────────────────────────────────────────────────
# Applied server-side (not just client-side) on every image upload route —
# an unbounded upload lets a client tie up a worker/socket sending a huge
# file, and every accepted image gets forwarded to the local OCR engine, so
# oversized files are also a direct resource-exhaustion vector on a machine
# with no cloud auto-scaling behind it.
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "15"))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

# ── Local image storage ──────────────────────────────────────────────────────
# Approved-record images (invoice pages + vehicle front/back) are written to
# this directory on disk and served back out via the /images static mount in
# local_app.py — no cloud storage account involved.
LOCAL_STORAGE_DIR = os.getenv("LOCAL_STORAGE_DIR", "./storage")

# Base URL the server advertises for image links it hands back to the
# frontend (e.g. http://192.168.10.213:8002). Falls back to a relative path
# so it still works behind a reverse proxy that doesn't set this.
LOCAL_STORAGE_BASE_URL = os.getenv("LOCAL_STORAGE_BASE_URL", "").rstrip("/")

# Local OCR + LLM engine settings (Ollama / PaddleOCR) live in
# services/local/config.py, not here.

# ── Auth ──────────────────────────────────────────────────────────────────────
# Secret used to sign/verify JWTs issued by POST /api/usermanagement/login.
# Must be set to a long random value in every environment — there is no
# insecure default.
JWT_SECRET    = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"

# SCR-05: HS256 is only as strong as its secret -- refuse to start with a
# short or obviously placeholder value. Generate with
#   python -c "import secrets; print(secrets.token_urlsafe(48))"
MIN_SECRET_BYTES = 32


def _require_strong_secret(name: str, value: str) -> None:
    if len(value.encode("utf-8")) < MIN_SECRET_BYTES:
        raise RuntimeError(f"{name} must contain at least {MIN_SECRET_BYTES} random bytes.")
    if value.lower().startswith(("replace_with", "change_me", "changeme")):
        raise RuntimeError(f"{name} is still a placeholder value; generate a real random secret.")


_require_strong_secret("JWT_SECRET", JWT_SECRET)

# Access tokens are short-lived by design — POST /login and POST /refresh
# both hand back a refresh token alongside this that the frontend uses to
# get a new access token silently when this one expires, rather than
# staying logged in on one long-lived JWT with no way to revoke it. Same
# pattern as Cloud Backend. JWT_EXPIRE_HOURS is kept only so an existing
# .env doesn't error; ACCESS_TOKEN_EXPIRE_MINUTES is what
# create_access_token() actually uses.
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "8"))
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Refresh tokens are opaque random strings (not JWTs), stored server-side
# as a SHA-256 hash so a DB leak alone doesn't hand out usable tokens.
# Rotated on every use (POST /refresh revokes the one it was given and
# issues a new one) so a stolen-and-reused refresh token is detectable —
# see auth/refresh_tokens.py.
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

# How long a REVOKED (not just expired) refresh_tokens row is kept before
# the periodic cleanup deletes it — see auth/refresh_tokens.cleanup_expired_tokens.
REFRESH_TOKEN_REVOKED_RETENTION_DAYS = int(os.getenv("REFRESH_TOKEN_REVOKED_RETENTION_DAYS", "7"))

# ── PII field-level encryption ───────────────────────────────────────────────
# AES-256-SIV key (64 raw bytes, base64-encoded in the environment) for
# services/encryption.py. Generate with:
#   python -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(64)).decode())"
# Rotating this means every encrypted column becomes unreadable with the new
# key — there is no key-versioning here, so a rotation requires decrypting
# every row with the old key and re-encrypting with the new one first. This
# is a separate key from Cloud Backend's own ENCRYPTION_KEY -- a different
# app, a different key, even though the two apps share a database engine.
import base64 as _base64
try:
    ENCRYPTION_KEY = _base64.b64decode(os.environ["ENCRYPTION_KEY"], validate=True)
except Exception as _e:
    raise RuntimeError(
        f"ENCRYPTION_KEY must be valid base64 (see config.py for how to generate one): {_e}"
    )
if len(ENCRYPTION_KEY) not in (32, 48, 64):
    raise RuntimeError(
        f"ENCRYPTION_KEY must decode to 32, 48, or 64 bytes for AES-SIV, got {len(ENCRYPTION_KEY)}."
    )

# Static shared secret for the kiosk/tablet app (Kalpataru-Extracto-tab),
# which has no per-user login — it authenticates as a device via the
# X-Device-Key header instead of a JWT. See auth/dependencies.py.
DEVICE_API_KEY = os.getenv("DEVICE_API_KEY")

# Seed account created on first run if the users table is empty, so there's
# a real (bcrypt-hashed) account to log in with instead of a hardcoded
# frontend bypass. Optional — if unset, no user is seeded and an account
# must be created directly in the database.
SEED_ADMIN_EMAIL    = os.getenv("SEED_ADMIN_EMAIL")
SEED_ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD")

# Sentry error monitoring — optional. Left unset, sentry_sdk.init() is never
# called (see local_app.py) and the app behaves exactly as before Sentry existed.
SENTRY_DSN = os.getenv("SENTRY_DSN", "")

# Comma-separated list of allowed browser origins for CORS, e.g.
# "http://localhost:5173,http://192.168.10.213:5173". No wildcard support —
# credentialed CORS requires an explicit origin allow-list.
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
