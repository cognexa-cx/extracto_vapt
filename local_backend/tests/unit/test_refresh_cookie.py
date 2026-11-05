"""Refresh token travels in an httpOnly cookie, not in JSON the page can read."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.security import hash_password
from routes import auth as auth_routes
from auth.rate_limit import limiter


@pytest.fixture
def client(monkeypatch):
    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(auth_routes.router)

    async def fake_fetchrow(sql, *params):
        return {
            "id": "u1", "email": "a@b.com", "name": "A", "role": "Admin",
            "password_hash": hash_password("a-Strong-pass-2026"), "is_active": True,
            "token_version": 1, "must_change_password": False,
        }

    async def fake_issue(user_id):
        return "RAW-REFRESH-1"

    rotated = {}

    async def fake_rotate(raw):
        rotated["seen"] = raw
        return ("u1", "RAW-REFRESH-2") if raw == "RAW-REFRESH-1" else None

    revoked = {}

    async def fake_revoke(raw):
        revoked["seen"] = raw

    monkeypatch.setattr(auth_routes, "fetchrow_query", fake_fetchrow)
    monkeypatch.setattr(auth_routes, "decrypt_row", lambda t, r: r)
    monkeypatch.setattr(auth_routes, "encrypt_for_lookup", lambda t, c, v: v)
    monkeypatch.setattr(auth_routes, "issue_refresh_token", fake_issue)
    monkeypatch.setattr(auth_routes, "validate_and_rotate", fake_rotate)
    monkeypatch.setattr(auth_routes, "revoke_refresh_token", fake_revoke)
    limiter.enabled = False
    c = TestClient(app)
    c.rotated, c.revoked = rotated, revoked
    return c


def test_login_sets_httponly_cookie_and_hides_token_from_json(client):
    r = client.post("/api/usermanagement/login", json={"identifier": "a@b.com", "password": "a-Strong-pass-2026"})
    body = r.json()
    assert body["success"] and "refresh_token" not in body["data"]
    cookie = r.headers["set-cookie"].lower()
    assert "refresh_token=raw-refresh-1" in cookie and "httponly" in cookie
    assert "path=/api/usermanagement" in cookie


def test_refresh_reads_cookie_and_rotates_it(client):
    client.cookies.set("refresh_token", "RAW-REFRESH-1", path="/api/usermanagement")
    r = client.post("/api/usermanagement/refresh")
    assert r.json()["success"] and "refresh_token" not in r.json()["data"]
    assert client.rotated["seen"] == "RAW-REFRESH-1"
    assert "refresh_token=raw-refresh-2" in r.headers["set-cookie"].lower()


def test_refresh_without_valid_cookie_fails(client):
    r = client.post("/api/usermanagement/refresh")
    assert r.json()["success"] is False


def test_logout_revokes_cookie_token_and_clears_it(client):
    client.cookies.set("refresh_token", "RAW-REFRESH-1", path="/api/usermanagement")
    r = client.post("/api/usermanagement/logout")
    assert r.json()["success"] and client.revoked["seen"] == "RAW-REFRESH-1"
    assert "max-age=0" in r.headers["set-cookie"].lower()
