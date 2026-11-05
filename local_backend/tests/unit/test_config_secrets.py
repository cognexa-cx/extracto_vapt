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
