"""SCR-06 — ENVIRONMENT must be explicit and from the allow-list."""
import importlib
import sys

import pytest


def _reload_config(monkeypatch, value):
    if value is None:
        monkeypatch.delenv("ENVIRONMENT", raising=False)
    else:
        monkeypatch.setenv("ENVIRONMENT", value)
    sys.modules.pop("config", None)
    return importlib.import_module("config")


def test_missing_environment_fails_startup(monkeypatch):
    with pytest.raises(RuntimeError, match="ENVIRONMENT must be explicitly"):
        _reload_config(monkeypatch, None)


def test_unknown_environment_fails_startup(monkeypatch):
    with pytest.raises(RuntimeError, match="Invalid ENVIRONMENT"):
        _reload_config(monkeypatch, "prod")


def test_production_is_recognised_case_insensitively(monkeypatch):
    cfg = _reload_config(monkeypatch, " Production ")
    assert cfg.IS_PRODUCTION is True
