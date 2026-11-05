"""SCR-12 — stored images are encrypted at rest when a key is configured."""
import importlib
import os

import pytest



@pytest.fixture
def storage(monkeypatch, tmp_path):
    # Other tests reload `config`; always bind to the module currently in use.
    config = importlib.import_module("config")
    monkeypatch.setattr(config, "LOCAL_STORAGE_DIR", str(tmp_path))
    from services import storage as s
    importlib.reload(s)
    s._cfg = config
    return s


def test_plaintext_when_no_key(storage, monkeypatch, tmp_path):
    monkeypatch.setattr(storage._cfg, "STORAGE_ENCRYPTION_KEY", None)
    storage._write_file("a/x.png", b"IMG")
    assert (tmp_path / "a" / "x.png").read_bytes() == b"IMG"


def test_encrypted_at_rest_and_roundtrip(storage, monkeypatch, tmp_path):
    monkeypatch.setattr(storage._cfg, "STORAGE_ENCRYPTION_KEY", os.urandom(32))
    storage._write_file("a/x.png", b"SECRET-IMAGE")
    on_disk = (tmp_path / "a" / "x.png").read_bytes()
    assert b"SECRET-IMAGE" not in on_disk and on_disk.startswith(b"EXENC1")
    assert storage.decrypt_file_bytes(on_disk, "a/x.png") == b"SECRET-IMAGE"


def test_nonce_is_fresh_per_file(storage, monkeypatch):
    monkeypatch.setattr(storage._cfg, "STORAGE_ENCRYPTION_KEY", os.urandom(32))
    assert storage.encrypt_file_bytes(b"same", "p") != storage.encrypt_file_bytes(b"same", "p")


def test_moved_or_tampered_file_is_rejected(storage, monkeypatch):
    monkeypatch.setattr(storage._cfg, "STORAGE_ENCRYPTION_KEY", os.urandom(32))
    blob = storage.encrypt_file_bytes(b"data", "a/x.png")
    with pytest.raises(ValueError):
        storage.decrypt_file_bytes(blob, "b/y.png")
    with pytest.raises(ValueError):
        storage.decrypt_file_bytes(blob[:-1] + bytes([blob[-1] ^ 1]), "a/x.png")


def test_legacy_plaintext_still_served(storage, monkeypatch):
    monkeypatch.setattr(storage._cfg, "STORAGE_ENCRYPTION_KEY", os.urandom(32))
    assert storage.decrypt_file_bytes(b"\x89PNG legacy", "a/x.png") == b"\x89PNG legacy"
