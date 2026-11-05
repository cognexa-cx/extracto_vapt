import logging

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from auth.dependencies import get_current_user_allow_password_change
from auth.rate_limit import limiter
from auth.security import (
    create_access_token,
    hash_password,
    validate_new_password,
    verify_password,
)
from auth.refresh_tokens import (
    issue_refresh_token,
    validate_and_rotate,
    revoke_refresh_token,
    invalidate_all_sessions,
)
from database.connection import execute_query, fetchrow_query
from services.pii import decrypt_row, encrypt_for_lookup

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/usermanagement")

# Same message and status for "no such user" and "wrong password" so a
# caller can't use the response to enumerate valid emails.
_INVALID_CREDENTIALS_MESSAGE = "Invalid email or password"


class LoginRequest(BaseModel):
    identifier: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str | None = None
    role: str
    must_change_password: bool = False


class LoginResponse(BaseModel):
    success: bool
    message: str
    data: dict | None = None


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest):
    email = body.identifier.strip().lower()

    row = await fetchrow_query(
        "SELECT id, email, password_hash, name, role, is_active, token_version, must_change_password FROM users WHERE email = ?",
        encrypt_for_lookup("users", "email", email),
    )
    if row:
        row = decrypt_row("users", row)

    if not row or not row["is_active"] or not verify_password(body.password, row["password_hash"]):
        logger.info("Failed login attempt", extra={"event": "login_failed", "email": email})
        return LoginResponse(success=False, message=_INVALID_CREDENTIALS_MESSAGE)

    token = create_access_token(
        user_id=row["id"], email=row["email"], role=row["role"],
        token_version=row["token_version"],
    )
    refresh_token = await issue_refresh_token(row["id"])
    user = UserOut(
        id=row["id"], email=row["email"], name=row["name"], role=row["role"],
        must_change_password=bool(row["must_change_password"]),
    )

    logger.info("Login succeeded", extra={"event": "login_succeeded", "email": email})
    return LoginResponse(
        success=True,
        message="Login successful",
        data={"token": token, "refresh_token": refresh_token, "employee": user.model_dump()},
    )


@router.post("/refresh", response_model=LoginResponse)
@limiter.limit("30/minute")
async def refresh(request: Request, body: RefreshRequest):
    """
    Trade a still-valid refresh token for a new access token (silent
    re-auth when the short-lived access token expires). The refresh
    token itself is rotated: the one sent in is revoked and a new one
    comes back, so it's single-use.
    """
    result = await validate_and_rotate(body.refresh_token)
    if not result:
        return LoginResponse(success=False, message="Refresh token is invalid or expired")

    user_id, new_refresh_token = result
    row = await fetchrow_query(
        "SELECT id, email, role, is_active, token_version FROM users WHERE id = ?", user_id
    )
    if row:
        row = decrypt_row("users", row)
    if not row or not row["is_active"]:
        return LoginResponse(success=False, message="Account is no longer active")

    token = create_access_token(
        user_id=row["id"], email=row["email"], role=row["role"],
        token_version=row["token_version"],
    )
    return LoginResponse(
        success=True,
        message="Token refreshed",
        data={"token": token, "refresh_token": new_refresh_token},
    )


@router.post("/logout", response_model=LoginResponse)
async def logout(body: LogoutRequest | None = None):
    # Revokes the one refresh token this session was using, so it can't
    # be traded for a new access token after logout. The (already
    # short-lived) access token itself just expires naturally.
    if body and body.refresh_token:
        await revoke_refresh_token(body.refresh_token)
    return LoginResponse(success=True, message="Logged out")


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user_allow_password_change)):
    row = await fetchrow_query(
        "SELECT id, email, name, role, must_change_password FROM users WHERE id = ?",
        current_user["id"],
    )
    row = decrypt_row("users", row)
    row["must_change_password"] = bool(row["must_change_password"])
    return UserOut(**row)


@router.post("/change-password", response_model=LoginResponse)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user_allow_password_change),
):
    """
    Set a new password (SCR-02). The only privileged-adjacent route open to
    an account flagged must_change_password. On success the flag is cleared
    and every existing session is invalidated, so the caller must log in
    again with the new password.
    """
    row = await fetchrow_query(
        "SELECT password_hash FROM users WHERE id = ?", current_user["id"]
    )
    if not row or not verify_password(body.current_password, row["password_hash"]):
        return LoginResponse(success=False, message="Current password is incorrect")

    problem = validate_new_password(body.new_password, body.current_password)
    if problem:
        return LoginResponse(success=False, message=problem)

    await execute_query(
        "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
        hash_password(body.new_password), current_user["id"],
    )
    await invalidate_all_sessions(current_user["id"])
    logger.info("Password changed", extra={"event": "password_changed", "user_id": current_user["id"]})
    return LoginResponse(success=True, message="Password changed. Please log in again.")
