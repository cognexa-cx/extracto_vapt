"""SCR-15 (iat in UTC) and SCR-17 (no signed URLs in logs)."""
import importlib
import logging
import time

import jwt


def test_iat_is_true_utc_epoch_regardless_of_host_timezone(monkeypatch):
    import config
    from auth import security
    # time.tzset() does not exist on Windows; there the check still runs in
    # the host's own timezone.
    has_tzset = hasattr(time, "tzset")
    if has_tzset:
        monkeypatch.setenv("TZ", "Asia/Kolkata")
        time.tzset()
    try:
        before = int(time.time())
        token = security.create_access_token("u", "e@x.com", "Admin", 1)
        iat = jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])["iat"]
        assert before <= iat <= int(time.time()) + 1
    finally:
        if has_tzset:
            monkeypatch.delenv("TZ")
            time.tzset()


def test_delete_failure_does_not_log_signature(monkeypatch, caplog, tmp_path):
    config = importlib.import_module("config")
    monkeypatch.setattr(config, "LOCAL_STORAGE_DIR", str(tmp_path))
    from services import storage
    importlib.reload(storage)

    def boom(self, *a, **k):
        raise OSError("disk error")

    monkeypatch.setattr(storage.Path, "exists", boom)
    url = "http://h/images/a/b.png?exp=123&sig=SUPERSECRETSIG"
    with caplog.at_level(logging.WARNING):
        assert storage.StorageService.delete_blob_by_url(url) is False
    logged = " ".join(f"{r.getMessage()} {r.__dict__}" for r in caplog.records)
    assert "SUPERSECRETSIG" not in logged and "sig=" not in logged
    assert "/a/b.png" in logged


def test_signed_url_delete_strips_query_and_removes_file(monkeypatch, tmp_path):
    config = importlib.import_module("config")
    monkeypatch.setattr(config, "LOCAL_STORAGE_DIR", str(tmp_path))
    from services import storage
    importlib.reload(storage)
    (tmp_path / "a").mkdir()
    f = tmp_path / "a" / "b.png"
    f.write_bytes(b"x")
    assert storage.StorageService.delete_blob_by_url("http://h/images/a/b.png?exp=1&sig=zz") is True
    assert not f.exists()
