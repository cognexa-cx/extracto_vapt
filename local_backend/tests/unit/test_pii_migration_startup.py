"""SCR-09 — a failed PII migration aborts startup."""
import asyncio

import pytest

from database import connection


class _FakePool:
    closed = False

    def close(self):
        self.closed = True

    async def wait_closed(self):
        pass


def _patch(monkeypatch, migration):
    pool = _FakePool()

    async def fake_create_pool(**kw):
        return pool

    async def noop(*a, **k):
        return None

    monkeypatch.setattr(connection.aioodbc, "create_pool", fake_create_pool, raising=False)
    monkeypatch.setattr(connection, "execute_query", noop)
    monkeypatch.setattr(connection, "run_pii_migrations", migration)
    return pool


def test_migration_failure_aborts_startup_and_closes_pool(monkeypatch):
    async def boom():
        raise ValueError("column too narrow")

    pool = _patch(monkeypatch, boom)
    with pytest.raises(RuntimeError, match="refusing startup"):
        asyncio.run(connection.init_pool())
    assert pool.closed


def test_successful_migration_starts_normally(monkeypatch):
    async def ok():
        return None

    pool = _patch(monkeypatch, ok)
    assert asyncio.run(connection.init_pool()) is pool
