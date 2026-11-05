"""SCR-04 — per-device credentials."""
import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from auth import dependencies, devices


class FakeDB:
    """Tiny in-memory stand-in for the devices table."""
    def __init__(self):
        self.rows = {}
        self.updates = []

    async def execute(self, sql, *params):
        if sql.startswith("INSERT INTO devices"):
            did, name, kh, exp = params
            self.rows[did] = dict(id=did, name=name, key_hash=kh, expires_at=exp,
                                  revoked_at=None, last_used_at=None)
        elif "SET revoked_at" in sql:
            self.rows[params[0]]["revoked_at"] = datetime.now(timezone.utc)
        elif "SET last_used_at" in sql:
            self.updates.append(params[0])
            self.rows[params[0]]["last_used_at"] = datetime.now(timezone.utc)

    async def fetchrow(self, sql, *params):
        return self.rows.get(params[0])


@pytest.fixture
def db(monkeypatch):
    d = FakeDB()
    monkeypatch.setattr(devices, "execute_query", d.execute)
    monkeypatch.setattr(devices, "fetchrow_query", d.fetchrow)
    return d


def run(c):
    return asyncio.run(c)


def test_registered_device_authenticates_and_key_is_not_stored(db):
    created = run(devices.register_device("Gate 1 tablet"))
    stored = db.rows[created["device_id"]]
    assert created["device_key"] not in stored.values()
    assert stored["key_hash"] == devices.hash_device_key(created["device_key"])
    assert run(devices.authenticate_device(created["device_id"], created["device_key"]))["name"] == "Gate 1 tablet"


def test_each_device_gets_a_distinct_key_and_keys_do_not_cross(db):
    a = run(devices.register_device("A"))
    b = run(devices.register_device("B"))
    assert a["device_key"] != b["device_key"]
    assert run(devices.authenticate_device(a["device_id"], b["device_key"])) is None


def test_wrong_unknown_and_missing_credentials_rejected(db):
    a = run(devices.register_device("A"))
    assert run(devices.authenticate_device(a["device_id"], "wrong")) is None
    assert run(devices.authenticate_device("no-such-device", a["device_key"])) is None
    assert run(devices.authenticate_device(None, a["device_key"])) is None
    assert run(devices.authenticate_device(a["device_id"], None)) is None


def test_revocation_affects_only_that_device(db):
    a = run(devices.register_device("A"))
    b = run(devices.register_device("B"))
    assert run(devices.revoke_device(a["device_id"])) is True
    assert run(devices.authenticate_device(a["device_id"], a["device_key"])) is None
    assert run(devices.authenticate_device(b["device_id"], b["device_key"])) is not None
    assert run(devices.revoke_device("missing")) is False


def test_expired_device_rejected(db):
    a = run(devices.register_device("A"))
    db.rows[a["device_id"]]["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=1)
    assert run(devices.authenticate_device(a["device_id"], a["device_key"])) is None


def test_validity_bounds_enforced(db):
    for bad in (0, devices.MAX_VALIDITY_DAYS + 1):
        with pytest.raises(ValueError):
            run(devices.register_device("A", bad))


def test_last_used_is_throttled(db):
    a = run(devices.register_device("A"))
    run(devices.authenticate_device(a["device_id"], a["device_key"]))
    run(devices.authenticate_device(a["device_id"], a["device_key"]))
    assert len(db.updates) == 1


def test_actor_carries_device_id(db, monkeypatch):
    a = run(devices.register_device("A"))
    monkeypatch.setattr(dependencies, "authenticate_device", devices.authenticate_device)
    actor = run(dependencies._user_or_device_from_headers(None, a["device_key"], a["device_id"]))
    assert actor["role"] == "device" and actor["device_id"] == a["device_id"]
    assert run(dependencies._user_or_device_from_headers(None, "bad", a["device_id"])) is None


def test_legacy_shared_key_ignored_unless_opted_in(monkeypatch):
    config = dependencies.config  # same module object the code under test uses
    monkeypatch.setattr(config, "DEVICE_API_KEY", "s" * 40)
    monkeypatch.setattr(config, "ALLOW_LEGACY_SHARED_DEVICE_KEY", False)
    assert run(dependencies._user_or_device_from_headers(None, "s" * 40)) is None
    monkeypatch.setattr(config, "ALLOW_LEGACY_SHARED_DEVICE_KEY", True)
    assert run(dependencies._user_or_device_from_headers(None, "s" * 40))["role"] == "device"
