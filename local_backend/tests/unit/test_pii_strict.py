"""SCR-14 — decrypt_row fails closed."""
import pytest

import config
from services import pii
from services.pii import PIIIntegrityError, decrypt_row, encrypt_row_fields


def test_roundtrip():
    enc = encrypt_row_fields("users", email="a@b.com", name="A")
    assert decrypt_row("users", {"id": "1", **enc}) == {"id": "1", "email": "a@b.com", "name": "A"}


def test_undecryptable_value_raises():
    with pytest.raises(PIIIntegrityError):
        decrypt_row("users", {"email": "plaintext@legacy.com"})


def test_ciphertext_from_another_column_raises():
    enc = encrypt_row_fields("users", name="Alice")
    with pytest.raises(PIIIntegrityError):
        decrypt_row("users", {"email": enc["name"]})


def test_empty_and_missing_values_are_skipped():
    assert decrypt_row("users", {"email": "", "name": None, "id": "1"}) == {"email": "", "name": None, "id": "1"}


def test_legacy_escape_hatch_passes_through(monkeypatch):
    monkeypatch.setattr(config, "PII_ALLOW_LEGACY_PLAINTEXT", True)
    assert decrypt_row("users", {"email": "plaintext@legacy.com"})["email"] == "plaintext@legacy.com"
