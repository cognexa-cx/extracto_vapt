"""Only the 404 paths on unknown IDs -- a full round trip through
extraction records would mean either running the real local OCR/LLM
pipeline (Ollama + PaddleOCR, not guaranteed installed/running wherever
this suite runs) or hand-inserting a fake row, neither of which belongs
in a routine test run."""


def test_get_nonexistent_record_is_404(client, auth_headers):
    resp = client.get("/history/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_nonexistent_record_is_404(client, auth_headers):
    resp = client.delete("/history/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert resp.status_code == 404


def test_patch_nonexistent_record_is_404(client, auth_headers):
    resp = client.patch(
        "/history/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
        json={"document_type": "Test"},
    )
    assert resp.status_code == 404


def test_history_list_requires_auth(client):
    resp = client.get("/history")
    assert resp.status_code in (401, 403)


def test_history_list_returns_ok_for_an_authenticated_user(client, auth_headers):
    resp = client.get("/history", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True
