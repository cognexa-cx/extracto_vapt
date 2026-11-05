"""
Extracto backend — fully local OCR + LLM extraction, local disk image
storage, no paid cloud APIs of any kind (no Azure Document Intelligence, no
Groq, no Azure OpenAI, no Azure Blob Storage).

Run:
    python local_app.py
    # or
    uvicorn local_app:app --host 0.0.0.0 --port 8002 --reload
"""
import os
import sys
import asyncio
import logging
from contextlib import asynccontextmanager

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from logging_setup import setup_logging
setup_logging()

logger = logging.getLogger(__name__)

import uvicorn
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from auth.rate_limit import limiter
from auth.seed import seed_admin_user
from auth.dependencies import _user_or_device_from_headers
from database.connection import init_pool, close_pool
import config  # noqa: F401 — validates env vars on import

# Sentry — only activates if SENTRY_DSN is set, so local dev without a DSN
# behaves exactly as before. Reports unhandled exceptions (and anything
# logged at ERROR+) to the "extracto-local-backend" Sentry project.
if config.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    sentry_sdk.init(
        dsn=config.SENTRY_DSN,
        environment=config.ENVIRONMENT,
        integrations=[
            FastApiIntegration(),
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        traces_sample_rate=0.0,
        send_default_pii=False,
    )
    logger.info("Sentry error monitoring initialized")

from routes import (
    local_extract_router,
    upload_router,
    history_router,
    approve_router,
    reject_router,
    manual_entry_router,
    auth_router,
)


# ─────────────────────────────────────────────────────────────────────────────
# Background task — periodic refresh_tokens cleanup
# ─────────────────────────────────────────────────────────────────────────────
_TOKEN_CLEANUP_INTERVAL_SECONDS = 24 * 60 * 60  # once a day is plenty


async def _periodic_token_cleanup():
    """Runs for the lifetime of the app, deleting expired/long-revoked
    refresh_tokens rows once a day — see auth.refresh_tokens.cleanup_
    expired_tokens for what actually gets deleted and why."""
    from auth.refresh_tokens import cleanup_expired_tokens

    while True:
        try:
            await cleanup_expired_tokens()
            logger.info("Refresh token cleanup completed")
        except Exception as e:
            logger.warning(f"Refresh token cleanup failed (will retry next interval): {e}")
        await asyncio.sleep(_TOKEN_CLEANUP_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    print("✅ SQL Server pool ready.")
    await seed_admin_user()

    cleanup_task = asyncio.create_task(_periodic_token_cleanup())

    yield

    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    await close_pool()
    print("🛑 SQL Server pool closed.")


app = FastAPI(
    title="Extracto Backend",
    description="Fully local OCR + LLM extraction (no paid cloud APIs) with local disk image storage and an MS SQL Server database.",
    version="1.0.0",
    lifespan=lifespan,
    # API docs expose the full route/schema map — hide them in production.
    docs_url=None if config.IS_PRODUCTION else "/docs",
    redoc_url=None if config.IS_PRODUCTION else "/redoc",
    openapi_url=None if config.IS_PRODUCTION else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Device-Key", "X-User-Name", "X-User-Id"],
)

# Gzip JSON responses — /history list payloads are hundreds of KB of highly
# repetitive JSON that compresses ~85%.
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response

os.makedirs(config.LOCAL_STORAGE_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────
# GET /images/{path} — serves locally-saved invoice/vehicle images. Used to
# be a raw StaticFiles mount (anyone with a URL could fetch any stored
# image, no login needed); now requires either a logged-in session/
# device-key header (for API-style callers) OR a valid, unexpired signature
# on the URL itself (for a plain <img src="..."> tag, which can't attach a
# header) — see services/storage.sign_url(), which every route returning an
# image URL to a client must call.
# ─────────────────────────────────────────────────────────────────────────
@app.get("/images/{file_path:path}", include_in_schema=False)
async def serve_image(
    file_path: str,
    exp: str | None = None,
    sig: str | None = None,
    authorization: str | None = Header(default=None),
    x_device_key: str | None = Header(default=None),
):
    from services.storage import STORAGE_ROOT, verify_signature

    authorized = verify_signature(file_path, exp, sig)
    if not authorized:
        actor = await _user_or_device_from_headers(authorization, x_device_key)
        authorized = actor is not None

    if not authorized:
        raise HTTPException(status_code=401, detail="Not authenticated")

    root = STORAGE_ROOT.resolve()
    target = (root / file_path).resolve()
    if (root not in target.parents and target != root) or not target.is_file():
        raise HTTPException(status_code=404, detail="Not found")

    return FileResponse(target)


# Serve the prebuilt admin dashboard (static/web/index.html + assets) —
# the bundle's own asset paths are rooted at /web/..., so it must be
# mounted there, not at "/".
STATIC_WEB_DIR = os.path.join(os.path.dirname(__file__), "static", "web")
app.mount("/web", StaticFiles(directory=STATIC_WEB_DIR, html=True), name="web")


# ─────────────────────────────────────────────────────────────────────────────
# Global exception handler — last line of defense against an unhandled
# exception reaching the client as a raw traceback (which leaks file paths,
# SQL fragments, library versions — free reconnaissance for an attacker).
# FastAPI's own HTTPException / RequestValidationError still take their
# normal, more specific paths; this only catches what nothing else did.
# ─────────────────────────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.method} {request.url.path}")
    detail = str(exc) if not config.IS_PRODUCTION else "Internal server error"
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": detail},
    )


app.include_router(auth_router)
app.include_router(local_extract_router)
app.include_router(upload_router)
app.include_router(history_router)
app.include_router(approve_router)
app.include_router(reject_router)
app.include_router(manual_entry_router)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Extracto Backend",
        "storage": "Local disk",
        "database": "MS SQL Server",
        "note": "Uses only local OCR/LLM combinations — no paid cloud APIs.",
        "endpoints": {
            "combinations":   "GET  /local/combinations       — list registered local OCR+LLM combinations",
            "extract":        "POST /local/extract             — run the selected local combination (preview only)",
            "upload":         "POST /upload                    — upload vehicle photos directly",
            "approve":        "POST /approve                   — save images to disk + extracted data to SQL Server",
            "reject":         "POST /reject                    — discard temp images, nothing saved",
            "history":        "GET  /history                   — list all automatic extraction records",
            "record":         "GET  /history/{id}              — get single automatic record by ID",
            "manual_approve": "POST /manual/approve             — save key/value fields + image to manual_entry_records",
            "manual_reject":  "POST /manual/reject              — discard manual entry",
            "manual_history": "GET  /manual/history             — list all manual entry records",
            "manual_record":  "GET  /manual/history/{id}        — get single manual record by ID",
            "manual_delete":  "DELETE /manual/history/{id}      — delete manual record + stored image",
        }
    }


@app.get("/health", include_in_schema=False)
async def health():
    """
    Real liveness/readiness check — actually queries SQL Server rather
    than just confirming the process is up.
    """
    from database.connection import fetchrow_query

    try:
        await fetchrow_query("SELECT 1 AS ok")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "unreachable"},
        )


if __name__ == "__main__":
    port = int(os.getenv("LOCAL_BACKEND_PORT", "8002"))
    print(f"Starting Extracto backend server on http://0.0.0.0:{port} ...")
    # --reload is a dev-only file-watcher; never run it in production.
    uvicorn.run("local_app:app", host="0.0.0.0", port=port, reload=not config.IS_PRODUCTION)
