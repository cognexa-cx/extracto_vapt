"""
Shared fixtures for the API test suite. These tests hit a real, already-
running Local Backend (BASE_URL, default http://localhost:8002) -- not
TestClient/in-process tests, so the server must be started separately
first, same as every other live-verification step in this project.

Auth uses the single seeded Admin account (auth/seed.py) -- Local Backend
has no /register endpoint (no multi-employee management, unlike Cloud
Backend), so there's no way to create a disposable test account here.
"""
import os

import httpx
import pytest

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8002")
SEED_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@example.com")
SEED_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "CHANGE_ME_ON_FIRST_LOGIN")
DEVICE_API_KEY = os.getenv("TEST_DEVICE_API_KEY", "CHANGE_ME_TO_A_LONG_RANDOM_SECRET")


@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        yield c


@pytest.fixture(scope="session")
def admin_token(client):
    """Logs in once for the whole test run -- POST /login is rate-limited
    per IP, so every test getting its own token would blow past that."""
    resp = client.post(
        "/api/usermanagement/login",
        json={"identifier": SEED_EMAIL, "password": SEED_PASSWORD},
    )
    resp.raise_for_status()
    body = resp.json()
    assert body["success"], f"Seed admin login failed: {body}"
    return body["data"]["token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def device_headers():
    return {"X-Device-Key": DEVICE_API_KEY}
