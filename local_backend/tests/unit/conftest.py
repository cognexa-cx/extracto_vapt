"""Environment for offline unit tests (no server, no database)."""
import base64
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

os.environ.setdefault("SQL_SERVER_HOST", "localhost")
os.environ.setdefault("SQL_SERVER_DB", "test")
os.environ.setdefault("JWT_SECRET", "j" * 48)
os.environ.setdefault("IMAGE_SIGNING_SECRET", "i" * 48)
os.environ.setdefault("DEVICE_API_KEY", "d" * 40)
os.environ.setdefault("ENCRYPTION_KEY", base64.b64encode(b"\x01" * 64).decode())
os.environ.setdefault("ENVIRONMENT", "test")

# aioodbc/pyodbc need the native unixODBC library, which isn't required for
# these offline tests -- stub the module out when it can't be imported.
try:
    import aioodbc  # noqa: F401
except Exception:  # pragma: no cover
    import types
    _stub = types.ModuleType("aioodbc")
    _stub.Pool = object
    sys.modules["aioodbc"] = _stub
