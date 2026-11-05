"""SCR-13 — image URLs are signed with IMAGE_SIGNING_SECRET, not JWT_SECRET."""
import hashlib
import hmac
import importlib
import sys
import time

import pytest

from tests.unit.test_config_secrets import _reload


def test_signature_uses_dedicated_secret():
    import config
    from services import storage

    exp = int(time.time()) + 60
    sig = storage._signature_for("a/b.png", exp)
    expected = hmac.new(config.IMAGE_SIGNING_SECRET.encode(), f"a/b.png:{exp}".encode(), hashlib.sha256).hexdigest()
    assert sig == expected
    assert storage.verify_signature("a/b.png", str(exp), sig)
    jwt_sig = hmac.new(config.JWT_SECRET.encode(), f"a/b.png:{exp}".encode(), hashlib.sha256).hexdigest()
    assert not storage.verify_signature("a/b.png", str(exp), jwt_sig)


def test_image_secret_must_differ_from_jwt_secret(monkeypatch):
    with pytest.raises(RuntimeError, match="different from JWT_SECRET"):
        _reload(monkeypatch, JWT_SECRET="z" * 40, IMAGE_SIGNING_SECRET="z" * 40)


def test_image_secret_required(monkeypatch):
    with pytest.raises(RuntimeError, match="IMAGE_SIGNING_SECRET"):
        _reload(monkeypatch, IMAGE_SIGNING_SECRET=None)
