"""
Shared server-side upload validation — content-type, real-image-content, and
size checks applied to every image upload route (extract, upload, manual
entry). Each check matters independently: content-type validation alone
doesn't stop a huge file OR a non-image file with a spoofed Content-Type
header; a client-side size check alone is trivially bypassed by anyone not
using the real frontend.
"""
import io

from fastapi import UploadFile
from PIL import Image

import config


def looks_like_real_image(file_bytes: bytes) -> bool:
    """Actually decodes the bytes as an image rather than trusting the
    client-supplied Content-Type header, which is just a string the caller
    can set to anything. Catches broad Exception (not just
    UnidentifiedImageError) because a truncated/corrupt/decompression-bomb
    file can raise other Pillow errors during verify() — any of those means
    "don't trust this as an image", not "crash the request"."""
    try:
        Image.open(io.BytesIO(file_bytes)).verify()
        return True
    except Exception:
        return False


def validate_upload_size(file: UploadFile, file_bytes: bytes) -> str | None:
    """Size-only check, for routes that already validate content-type
    separately. Checked against the actual bytes read, not a
    client-reported Content-Length header (which is trivially
    spoofable)."""
    if len(file_bytes) > config.MAX_UPLOAD_SIZE_BYTES:
        size_mb = len(file_bytes) / (1024 * 1024)
        return (
            f"File '{file.filename}' is {size_mb:.1f}MB, which exceeds the "
            f"{config.MAX_UPLOAD_SIZE_MB}MB limit."
        )
    return None


def validate_image_bytes(file: UploadFile, file_bytes: bytes) -> str | None:
    """Real-content + size check for a file that's already been read into
    memory (post content-type check, if any). Use this — not just a
    Content-Type check — before writing any uploaded "image" to disk."""
    if not looks_like_real_image(file_bytes):
        return f"File '{file.filename}' does not appear to be a valid image."
    return validate_upload_size(file, file_bytes)


def validate_image_upload(file: UploadFile, file_bytes: bytes) -> str | None:
    """Full check for routes that haven't read the file yet at the point
    they call this: Content-Type as a fast pre-filter, then real content,
    then size."""
    if not file.content_type or not file.content_type.startswith("image/"):
        return (
            f"File '{file.filename}' is not a valid image. "
            f"(Content-Type: '{file.content_type}')"
        )
    return validate_image_bytes(file, file_bytes)
