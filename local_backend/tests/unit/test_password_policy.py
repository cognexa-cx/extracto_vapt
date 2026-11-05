"""Unit tests for SCR-02 — password-change enforcement (offline)."""
import asyncio

import pytest
from fastapi import HTTPException

from auth import dependencies, seed
from auth.security import hash_password, validate_new_password


def test_policy_rejects_weak_and_placeholder_passwords():
    assert validate_new_password("short1", "old") is not None
    assert validate_new_password("CHANGE_ME_ON_FIRST_LOGIN", "x") is not None
    assert validate_new_password("onlyletterslongenough", "x") is not None
    assert validate_new_password("samesamesame123", "samesamesame123") is not None
    assert validate_new_password("a-Strong-pass-2026", "old") is None


def test_flagged_account_is_blocked_from_privileged_routes(monkeypatch):
    async def fake_user(_auth):
        return {"id": "u", "email": "e", "role": "Admin", "must_change_password": True}

    monkeypatch.setattr(dependencies, "_user_from_bearer", fake_user)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(dependencies.get_current_user("Bearer x"))
    assert exc.value.status_code == 403
    # ...but may still reach the change-password flow
    assert asyncio.run(dependencies.get_current_user_allow_password_change("Bearer x"))["id"] == "u"
    # and does not authenticate ingestion routes
    assert asyncio.run(dependencies._user_or_device_from_headers("Bearer x", None)) is None


def test_startup_locks_admin_with_placeholder_password(monkeypatch):
    executed = []

    async def fake_fetch(sql, *params):
        return [
            {"id": "a1", "password_hash": hash_password("CHANGE_ME_ON_FIRST_LOGIN"), "must_change_password": False},
            {"id": "a2", "password_hash": hash_password("a-Strong-pass-2026"), "must_change_password": False},
        ]

    async def fake_exec(sql, *params):
        executed.append((sql, params))

    async def fake_invalidate(uid):
        executed.append(("invalidate", (uid,)))

    monkeypatch.setattr(seed, "fetch_query", fake_fetch)
    monkeypatch.setattr(seed, "execute_query", fake_exec)
    monkeypatch.setattr(seed, "invalidate_all_sessions", fake_invalidate)
    asyncio.run(seed._enforce_password_change_if_admin_uses_a_placeholder_password())

    assert ("UPDATE users SET must_change_password = 1 WHERE id = ?", ("a1",)) in executed
    assert ("invalidate", ("a1",)) in executed
    assert not any(p == ("a2",) for _, p in executed)
