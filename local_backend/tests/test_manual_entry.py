"""Manual entry approve/reject/history/delete. No LLM/OCR call is involved
in this path (unlike /local/extract), so a full real round-trip here costs
nothing but a local-disk write -- unlike local extraction, which needs
Ollama + PaddleOCR actually installed and running wherever this suite runs,
and is deliberately left untested here."""
import io
import json

import pytest
from PIL import Image


def _real_png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), color="red").save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def created_manual_record(client, device_headers):
    resp = client.post(
        "/manual/approve",
        headers=device_headers,
        data={"fields": json.dumps([{"key": "Pytest Key", "value": "Pytest Value"}])},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    record_id = body["extraction_id"]
    yield body
    client.delete(f"/manual/history/{record_id}", headers=device_headers)


def test_approve_rejects_all_blank_keys(client, device_headers):
    resp = client.post(
        "/manual/approve",
        headers=device_headers,
        data={"fields": json.dumps([{"key": "  ", "value": "orphaned value"}])},
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is False


def test_approve_rejects_malformed_fields_json(client, device_headers):
    resp = client.post(
        "/manual/approve",
        headers=device_headers,
        data={"fields": "not valid json"},
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is False


def test_full_round_trip_without_image(client, device_headers, created_manual_record):
    record_id = created_manual_record["extraction_id"]

    resp = client.get(f"/manual/history/{record_id}", headers=device_headers)
    assert resp.status_code == 200
    fields = resp.json()["fields"]
    assert {"key": "Pytest Key", "value": "Pytest Value"} in fields

    resp = client.get("/manual/history", headers=device_headers)
    assert resp.status_code == 200
    assert any(r["id"] == record_id for r in resp.json()["records"])


def test_approve_with_a_real_image_saves_to_local_disk(client, device_headers):
    resp = client.post(
        "/manual/approve",
        headers=device_headers,
        data={"fields": json.dumps([{"key": "Has Image", "value": "yes"}])},
        files={"image": ("test.png", io.BytesIO(_real_png_bytes()), "image/png")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["image_url"]
    client.delete(f"/manual/history/{body['extraction_id']}", headers=device_headers)


def test_approve_rejects_a_fake_image_content_type_mismatch(client, device_headers):
    resp = client.post(
        "/manual/approve",
        headers=device_headers,
        data={"fields": json.dumps([{"key": "Fake Image", "value": "yes"}])},
        files={"image": ("fake.png", io.BytesIO(b"not actually a png"), "image/png")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert any("Skipping upload" in m for m in body["validation_messages"])
    assert not body.get("image_url")
    client.delete(f"/manual/history/{body['extraction_id']}", headers=device_headers)


def test_reject_is_a_no_op_that_always_succeeds(client, device_headers):
    resp = client.post("/manual/reject", headers=device_headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_delete_of_nonexistent_record_is_404(client, device_headers):
    resp = client.delete("/manual/history/00000000-0000-0000-0000-000000000000", headers=device_headers)
    assert resp.status_code == 404


def test_get_of_nonexistent_record_is_404(client, device_headers):
    resp = client.get("/manual/history/00000000-0000-0000-0000-000000000000", headers=device_headers)
    assert resp.status_code == 404


def test_manual_routes_require_auth_or_device_key(client):
    resp = client.get("/manual/history")
    assert resp.status_code in (401, 403)
