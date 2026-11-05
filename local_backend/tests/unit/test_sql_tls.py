"""SCR-03 — SQL Server certificate validation is on by default."""
import asyncio

import pytest

from tests.unit.test_config_secrets import _reload


def _dsn_for(monkeypatch, trust):
    cfg = _reload(monkeypatch, SQL_SERVER_TRUST_CERT=trust)
    from database import connection
    monkeypatch.setattr(connection, "config", cfg)
    captured = {}

    async def fake_create_pool(dsn, **kw):
        captured["dsn"] = dsn
        raise RuntimeError("stop")

    monkeypatch.setattr(connection.aioodbc, "create_pool", fake_create_pool, raising=False)
    with pytest.raises(RuntimeError, match="stop"):
        asyncio.run(connection.init_pool())
    return captured["dsn"]


def test_certificate_validated_by_default(monkeypatch):
    dsn = _dsn_for(monkeypatch, None)
    assert "Encrypt=yes" in dsn and "TrustServerCertificate=no" in dsn


def test_invalid_trust_value_rejected(monkeypatch):
    with pytest.raises(RuntimeError, match="SQL_SERVER_TRUST_CERT"):
        _reload(monkeypatch, SQL_SERVER_TRUST_CERT="maybe")
