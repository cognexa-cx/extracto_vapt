"""SCR-05 / SCR-07 / SCR-13 / SCR-16 — startup validation of secrets & limits."""
import base64
import importlib
import sys

import pytest


def _reload(monkeypatch, **env):
    for k, v in env.items():
        if v is None:
            monkeypatch.delenv(k, raising=False)
        else:
            monkeypatch.setenv(k, v)
    sys.modules.pop("config", None)
    return importlib.import_module("config")


def test_short_jwt_secret_rejected(monkeypatch):
    with pytest.raises(RuntimeError, match="JWT_SECRET must contain at least 32"):
        _reload(monkeypatch, JWT_SECRET="short")


def test_placeholder_jwt_secret_rejected(monkeypatch):
    with pytest.raises(RuntimeError, match="placeholder"):
        _reload(monkeypatch, JWT_SECRET="replace_with_a_long_random_secret")


def test_strong_jwt_secret_accepted(monkeypatch):
    assert _reload(monkeypatch, JWT_SECRET="x" * 40).JWT_SECRET == "x" * 40


@pytest.mark.parametrize("size", [32, 48, 63, 65])
def test_encryption_key_must_be_exactly_64_bytes(monkeypatch, size):
    key = base64.b64encode(b"\x02" * size).decode()
    with pytest.raises(RuntimeError, match="exactly 64 bytes"):
        _reload(monkeypatch, ENCRYPTION_KEY=key)


def test_64_byte_encryption_key_accepted(monkeypatch):
    key = base64.b64encode(b"\x02" * 64).decode()
    assert len(_reload(monkeypatch, ENCRYPTION_KEY=key).ENCRYPTION_KEY) == 64


@pytest.mark.parametrize("var,value", [
    ("ACCESS_TOKEN_EXPIRE_MINUTES", "0"),
    ("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"),
    ("REFRESH_TOKEN_EXPIRE_DAYS", "-1"),
    ("REFRESH_TOKEN_EXPIRE_DAYS", "365"),
])
def test_token_lifetimes_out_of_range_rejected(monkeypatch, var, value):
    with pytest.raises(RuntimeError, match=var):
        _reload(monkeypatch, **{var: value})


def test_default_token_lifetimes_valid(monkeypatch):
    cfg = _reload(monkeypatch, ACCESS_TOKEN_EXPIRE_MINUTES=None, REFRESH_TOKEN_EXPIRE_DAYS=None)
    assert cfg.ACCESS_TOKEN_EXPIRE_MINUTES == 30 and cfg.REFRESH_TOKEN_EXPIRE_DAYS == 30
