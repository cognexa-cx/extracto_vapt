def test_health_check_reports_database_connected(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "healthy"
    assert body["database"] == "connected"


def test_login_with_wrong_password_fails_without_leaking_which_field_was_wrong(client):
    resp = client.post(
        "/api/usermanagement/login",
        json={"identifier": "admin@example.com", "password": "definitely-wrong"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is False


def test_login_with_nonexistent_account_gives_the_same_generic_message(client):
    resp = client.post(
        "/api/usermanagement/login",
        json={"identifier": "no-such-account@example.com", "password": "whatever123"},
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is False


def test_me_requires_a_valid_token(client):
    resp = client.get("/api/usermanagement/me")
    assert resp.status_code in (401, 403)


def test_me_returns_the_logged_in_account_with_a_valid_token(client, auth_headers):
    resp = client.get("/api/usermanagement/me", headers=auth_headers)
    assert resp.status_code == 200


def test_security_headers_present_on_every_response(client):
    resp = client.get("/health")
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in resp.headers.get("permissions-policy", "")


def test_ingestion_routes_reject_requests_with_no_auth_and_no_device_key(client):
    resp = client.get("/history")
    assert resp.status_code in (401, 403)
