"""A value that looks encrypted but will not decrypt (wrong ENCRYPTION_KEY) must
stop the startup migration instead of being encrypted a second time."""
import asyncio

import pytest

from database import connection
from services.encryption import encrypt_field


def test_shape_check():
    assert connection._looks_like_ciphertext(encrypt_field("a@b.com", "email"))
    assert not connection._looks_like_ciphertext("a@b.com")
    assert not connection._looks_like_ciphertext("Legacy Person 1")
    assert not connection._looks_like_ciphertext("Mumbai")


def test_foreign_ciphertext_aborts_migration(monkeypatch):
    foreign = encrypt_field("x@y.com", "email")  # pretend: made with another key

    async def fake_fetch(sql, *a):
        return [{"id": "u1", "email": foreign, "name": None}]

    def fail_decrypt(value, column):
        from services.encryption import DecryptionError
        raise DecryptionError("wrong key")

    async def must_not_write(*a, **k):
        raise AssertionError("must not rewrite data")

    monkeypatch.setattr(connection, "fetch_query", fake_fetch)
    monkeypatch.setattr(connection, "execute_query", must_not_write)
    monkeypatch.setattr("services.encryption.decrypt_field", fail_decrypt)
    with pytest.raises(RuntimeError, match="Refusing to double-encrypt"):
        asyncio.run(connection._migrate_encrypt_table_pii("users", "id"))
