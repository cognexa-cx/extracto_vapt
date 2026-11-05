"""
Shared server-side upload validation — content-type, real-image-content, and
size checks applied to every image upload route (extract, upload, manual
entry). Each check matters independently: content-type validation alone
doesn't stop a huge file OR a non-image file with a spoofed Content-Type
header; a client-side size check alone is trivially bypassed by anyone not
using the real frontend.
"""
import io
import warnings

from fastapi import UploadFile
from PIL import Image

import config


class UploadTooLargeError(ValueError):
    """Raised by read_limited_upload as soon as the body exceeds the limit."""


_READ_CHUNK_BYTES = 64 * 1024


async def read_limited_upload(upload: UploadFile, max_bytes: int | None = None) -> bytes:
    """Read an upload in bounded chunks, aborting as soon as `max_bytes` is
    exceeded (SCR-10). Unlike `await upload.read()`, an oversized body is
    never fully buffered by this application, and the limit is applied to
    the bytes actually received, not the client-controlled Content-Length.
    Also enforce a request-body limit at the reverse proxy/gateway (e.g.
    nginx client_max_body_size) so the framework does not spool huge
    bodies to disk before this code runs."""
    limit = config.MAX_UPLOAD_SIZE_BYTES if max_bytes is None else max_bytes
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await upload.read(_READ_CHUNK_BYTES)
        if not chunk:
            break
        total += len(chunk)
        if total > limit:
            raise UploadTooLargeError(
                f"File '{upload.filename}' exceeds the {limit // (1024 * 1024)}MB limit."
            )
        chunks.append(chunk)
    return b"".join(chunks)


# SCR-11: make Pillow's own decompression-bomb guard use the configured
# ceiling process-wide, so the OCR/decoder path is protected too.
Image.MAX_IMAGE_PIXELS = config.MAX_IMAGE_PIXELS


def looks_like_real_image(file_bytes: bytes) -> bool:
    """Actually decodes the bytes as an image rather than trusting the
    client-supplied Content-Type header, which is just a string the caller
    can set to anything. Also rejects images whose dimensions exceed
    MAX_IMAGE_PIXELS and treats Pillow decompression-bomb warnings as
    errors. Catches broad Exception because a truncated/corrupt file can
    raise many Pillow errors during verify() — any of those means "don't
    trust this as an image", not "crash the request"."""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(file_bytes)) as img:
                if img.width * img.height > config.MAX_IMAGE_PIXELS:
                    return False
                img.verify()
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
