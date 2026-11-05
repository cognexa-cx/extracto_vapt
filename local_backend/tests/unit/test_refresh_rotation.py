"""Unit tests for SCR-01 — no server/DB needed (database layer is mocked)."""
import asyncio
from auth import refresh_tokens  # noqa: E402


def test_rotation_is_a_single_conditional_statement(monkeypatch):
    calls = []

    async def fake_fetchrow(sql, *params):
        calls.append((sql, params))
        return {"user_id": "u1"}

    monkeypatch.setattr(refresh_tokens, "fetchrow_query", fake_fetchrow)
    result = asyncio.run(refresh_tokens.validate_and_rotate("raw"))

    assert len(calls) == 1, "revoke+issue must be one atomic round trip"
    sql = calls[0][0]
    assert "revoked_at IS NULL" in sql and "OUTPUT INSERTED.user_id" in sql
    assert "BEGIN TRANSACTION" in sql and "COMMIT TRANSACTION" in sql
    assert result[0] == "u1" and result[1]


def test_rejected_when_no_row_was_consumed(monkeypatch):
    async def fake_fetchrow(sql, *params):
        return None

    monkeypatch.setattr(refresh_tokens, "fetchrow_query", fake_fetchrow)
    assert asyncio.run(refresh_tokens.validate_and_rotate("raw")) is None
