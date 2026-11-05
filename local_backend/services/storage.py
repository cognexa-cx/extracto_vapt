"""
Local disk storage service — replaces the old Azure Blob Storage backend.

Same public interface as before (StorageService.save_files /
save_manual_file / delete_files_by_prefix / delete_blob_by_url / sign_url)
so routes/approve.py, routes/upload.py, routes/manual_entry.py, and
routes/history.py did not need to change at all. Files are written under
config.LOCAL_STORAGE_DIR and served back out via the /images StaticFiles
mount registered in local_app.py.

AUTOMATIC mode:
  {LOCAL_STORAGE_DIR}/automatic/{YYYY-MM-DD}/{direction}/{HH-MM-SS}-{rand}/filename

MANUAL mode:
  {LOCAL_STORAGE_DIR}/manual/{YYYY-MM-DD}/{HH-MM-SS}/filename
"""
import hashlib
import hmac
import logging
import os
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Tuple
from urllib.parse import urlencode

import config

logger = logging.getLogger(__name__)

STORAGE_ROOT = Path(config.LOCAL_STORAGE_DIR).resolve()
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────
# URL signing — GET /images/{path} (local_app.py) requires either a
# logged-in session/device key (checked via header, for API-style callers)
# OR a valid, not-yet-expired signature on the URL itself (checked via
# query string, for a plain <img src="..."> tag, which can't attach a
# header). Signed with the dedicated IMAGE_SIGNING_SECRET, deliberately NOT
# JWT_SECRET, so the two can be rotated and disclosed independently (SCR-13).
# ─────────────────────────────────────────────────────────────────────────
_SIGNATURE_TTL_SECONDS = 6 * 60 * 60  # 6h


def _signature_for(relative_path: str, expires_at: int) -> str:
    message = f"{relative_path}:{expires_at}".encode("utf-8")
    return hmac.new(
        config.IMAGE_SIGNING_SECRET.encode("utf-8"), message, hashlib.sha256
    ).hexdigest()


def verify_signature(relative_path: str, expires_at: str | None, signature: str | None) -> bool:
    if not expires_at or not signature:
        return False
    try:
        expires_at_int = int(expires_at)
    except ValueError:
        return False
    if expires_at_int < int(time.time()):
        return False
    expected = _signature_for(relative_path, expires_at_int)
    return hmac.compare_digest(expected, signature)


def safe_filename(filename: str) -> str:
    """Strip any directory components from a client-supplied filename so it
    can't be used for path traversal (e.g. '../../evil.jpg') when joined
    into a storage path below."""
    return Path(filename).name or "file"


def _public_url(relative_path: str) -> str:
    """Return the URL the frontend should use to fetch this file."""
    relative_path = relative_path.lstrip("/")
    if config.LOCAL_STORAGE_BASE_URL:
        return f"{config.LOCAL_STORAGE_BASE_URL}/images/{relative_path}"
    return f"/images/{relative_path}"


# ── At-rest encryption of stored images (SCR-12) ────────────────────────────
# File layout when enabled: MAGIC (6) | nonce (12) | AES-256-GCM ciphertext+tag.
# The relative path is bound as associated data so a file copied to another
# path fails authentication. Files without MAGIC are legacy plaintext.
_ENC_MAGIC = b"EXENC1"
_NONCE_LEN = 12


def encrypt_file_bytes(data: bytes, relative_path: str) -> bytes:
    """Return `data` unchanged when STORAGE_ENCRYPTION_KEY isn't configured."""
    if not config.STORAGE_ENCRYPTION_KEY:
        return data
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    nonce = os.urandom(_NONCE_LEN)
    ct = AESGCM(config.STORAGE_ENCRYPTION_KEY).encrypt(nonce, data, relative_path.encode("utf-8"))
    return _ENC_MAGIC + nonce + ct


def decrypt_file_bytes(blob: bytes, relative_path: str) -> bytes:
    """Decrypt a stored file; legacy plaintext (no MAGIC) is returned as-is.
    Raises ValueError if the file is encrypted but can't be authenticated."""
    if not blob.startswith(_ENC_MAGIC):
        return blob
    if not config.STORAGE_ENCRYPTION_KEY:
        raise ValueError("Stored image is encrypted but STORAGE_ENCRYPTION_KEY is not configured")
    from cryptography.exceptions import InvalidTag
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    body = blob[len(_ENC_MAGIC):]
    try:
        return AESGCM(config.STORAGE_ENCRYPTION_KEY).decrypt(
            body[:_NONCE_LEN], body[_NONCE_LEN:], relative_path.encode("utf-8")
        )
    except InvalidTag as e:
        raise ValueError("Stored image failed authentication") from e


def _write_file(relative_path: str, file_bytes: bytes) -> str:
    """Write bytes to STORAGE_ROOT/relative_path and return its public URL."""
    full_path = (STORAGE_ROOT / relative_path).resolve()
    # Defense in depth against path traversal: even though callers sanitize
    # filenames with safe_filename() before building relative_path, refuse
    # to write anywhere outside STORAGE_ROOT no matter how relative_path
    # was constructed.
    if STORAGE_ROOT not in full_path.parents and full_path != STORAGE_ROOT:
        raise ValueError(f"Refusing to write outside storage root: {relative_path}")
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_bytes(encrypt_file_bytes(file_bytes, Path(relative_path).as_posix().lstrip("/")))
    url = _public_url(relative_path)
    logger.info(f"Saved file: {relative_path}")
    return url


class StorageService:
    """
    Local disk storage with the same two modes the Azure Blob version had:

    AUTOMATIC mode — same day/direction/N hierarchy, under automatic/ prefix:
        {LOCAL_STORAGE_DIR}/automatic/2026-07-15/inward/1/challan_xxx.jpg

    MANUAL mode — date/time folder, under manual/ prefix:
        {LOCAL_STORAGE_DIR}/manual/2026-07-15/14-25-33/invoice.jpg
    """

    # ─────────────────────────────────────────────────────────────────────
    # AUTOMATIC mode
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def _new_auto_subfolder_name() -> str:
        """Collision-free subfolder name — time + a random suffix needs no
        coordination and can't collide under concurrent uploads."""
        return f"{datetime.now().strftime('%H-%M-%S')}-{uuid.uuid4().hex[:8]}"

    @staticmethod
    def _get_auto_direction_prefix(direction: str) -> str:
        """Return the relative folder prefix for automatic/{date}/{direction}/"""
        today = datetime.now().strftime("%Y-%m-%d")
        direction = direction.strip().lower()
        if direction not in ("inward", "outward", "returnable"):
            direction = "inward"
        return f"automatic/{today}/{direction}/"

    @classmethod
    def save_files(
        cls,
        files: List[Tuple[str, bytes]],
        direction: str,
    ) -> Tuple[str, List[str]]:
        """
        Save automatic-mode files to:
            automatic/{date}/{direction}/{HH-MM-SS}-{random}/filename

        Returns:
            (folder_prefix, list_of_public_urls)
        """
        direction_prefix = cls._get_auto_direction_prefix(direction)
        subfolder_prefix = f"{direction_prefix}{cls._new_auto_subfolder_name()}/"

        saved_urls: List[str] = []
        for original_filename, file_bytes in files:
            if not file_bytes:
                continue
            relative_path = f"{subfolder_prefix}{safe_filename(original_filename)}"
            url = _write_file(relative_path, file_bytes)
            saved_urls.append(url)

        return subfolder_prefix, saved_urls

    # ─────────────────────────────────────────────────────────────────────
    # MANUAL mode
    # ─────────────────────────────────────────────────────────────────────

    @classmethod
    def save_manual_file(
        cls,
        filename: str,
        file_bytes: bytes,
    ) -> Tuple[str, str]:
        """
        Save a manual-entry invoice image to:
            manual/{YYYY-MM-DD}/{HH-MM-SS}/filename

        Returns:
            (folder_prefix, public_url)
        """
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H-%M-%S")
        folder_prefix = f"manual/{date_str}/{time_str}/"
        relative_path = f"{folder_prefix}{safe_filename(filename)}"

        url = _write_file(relative_path, file_bytes)
        return folder_prefix, url

    # ─────────────────────────────────────────────────────────────────────
    # Delete helpers
    # ─────────────────────────────────────────────────────────────────────

    @classmethod
    def delete_files_by_prefix(cls, folder_prefix: str) -> List[str]:
        """Delete every file under a given folder prefix. Returns the list of
        relative paths deleted."""
        if not folder_prefix:
            return []
        target_dir = (STORAGE_ROOT / folder_prefix).resolve()
        if STORAGE_ROOT not in target_dir.parents and target_dir != STORAGE_ROOT:
            logger.warning(f"Refusing to delete outside storage root: {folder_prefix}")
            return []
        deleted: List[str] = []
        if not target_dir.exists():
            return deleted
        for file_path in target_dir.rglob("*"):
            if file_path.is_file():
                relative = file_path.relative_to(STORAGE_ROOT).as_posix()
                file_path.unlink()
                deleted.append(relative)
                logger.info(f"Deleted file: {relative}")
        return deleted

    @classmethod
    def delete_blob_by_url(cls, url: str) -> bool:
        """Delete a single file given its public URL (kept as 'delete_blob_by_url'
        for interface compatibility with the code that calls it)."""
        if not url:
            return False
        try:
            marker = "/images/"
            idx = url.find(marker)
            if idx == -1:
                return False
            relative_path = url[idx + len(marker):]
            file_path = (STORAGE_ROOT / relative_path).resolve()
            if STORAGE_ROOT not in file_path.parents and file_path != STORAGE_ROOT:
                logger.warning(f"Refusing to delete outside storage root: {relative_path}")
                return False
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted file by URL: {relative_path}")
                return True
            return False
        except Exception as e:
            logger.warning(f"Could not delete file from URL {url}: {e}")
            return False

    @staticmethod
    def sign_url(url: str | None) -> str | None:
        """Appends a short-lived signature so a plain <img src="..."> tag
        (which can't send an Authorization header) can still load the image
        through the authenticated GET /images/{path} route — every route
        that returns an image URL to a client must call this."""
        if not url:
            return url
        marker = "/images/"
        idx = url.find(marker)
        if idx == -1:
            return url
        from urllib.parse import unquote
        relative_path = unquote(url[idx + len(marker):])
        expires_at = int(time.time()) + _SIGNATURE_TTL_SECONDS
        signature = _signature_for(relative_path, expires_at)
        query = urlencode({"exp": expires_at, "sig": signature})
        separator = "&" if "?" in url else "?"
        return f"{url}{separator}{query}"
