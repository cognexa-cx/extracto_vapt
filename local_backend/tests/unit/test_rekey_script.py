"""The re-keying helper must convert data between key sizes without loss."""
import base64
import importlib.util
import os
from pathlib import Path

import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESSIV

spec = importlib.util.spec_from_file_location(
    "rekey_pii", Path(__file__).resolve().parents[2] / "scripts" / "rekey_pii.py"
)
rekey = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rekey)


def _enc(aead, text, ctx):
    return base64.b64encode(aead.encrypt(text.encode(), [ctx.encode()])).decode()


@pytest.mark.parametrize("old_size", [32, 48, 64])
def test_old_key_sizes_convert_to_new_64_byte_key(old_size):
    old, new = AESSIV(os.urandom(old_size)), AESSIV(os.urandom(64))
    value = _enc(old, "alice@example.com", "email")
    out, status = rekey.rekey_value(value, "email", old, new)
    assert status == "rekeyed"
    assert rekey._try_decrypt(new, out, "email") == "alice@example.com"
    assert rekey._try_decrypt(old, out, "email") is None


def test_rerun_is_safe():
    old, new = AESSIV(os.urandom(32)), AESSIV(os.urandom(64))
    done = _enc(new, "x", "name")
    assert rekey.rekey_value(done, "name", old, new) == (None, "already")


def test_plaintext_and_wrong_column_are_left_alone():
    old, new = AESSIV(os.urandom(32)), AESSIV(os.urandom(64))
    assert rekey.rekey_value("plain text", "name", old, new) == (None, "unreadable")
    other_column = _enc(old, "x", "email")
    assert rekey.rekey_value(other_column, "name", old, new) == (None, "unreadable")


def test_key_validation(monkeypatch):
    monkeypatch.setenv("K", base64.b64encode(os.urandom(40)).decode())
    with pytest.raises(SystemExit):
        rekey.load_key("K", (32, 48, 64))
    monkeypatch.setenv("K", "not base64!!")
    with pytest.raises(SystemExit):
        rekey.load_key("K", (64,))
    monkeypatch.setenv("K", base64.b64encode(os.urandom(48)).decode())
    assert len(rekey.load_key("K", (32, 48, 64))) == 48
