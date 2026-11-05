"""SCR-10 — bounded upload reads."""
import asyncio
import io

import pytest
from fastapi import UploadFile

from services.upload_validation import UploadTooLargeError, read_limited_upload


class _CountingFile(io.BytesIO):
    """Records how many bytes the reader actually pulled."""
    total_read = 0

    def read(self, n=-1):
        data = super().read(n)
        _CountingFile.total_read += len(data)
        return data


def _upload(data):
    _CountingFile.total_read = 0
    return UploadFile(file=_CountingFile(data), filename="big.jpg")


def test_small_upload_is_returned_intact():
    data = b"x" * 200_000
    assert asyncio.run(read_limited_upload(_upload(data), 1_000_000)) == data


def test_oversized_upload_aborts_early():
    up = _upload(b"x" * 10_000_000)
    with pytest.raises(UploadTooLargeError):
        asyncio.run(read_limited_upload(up, 1_000_000))
    # stopped one chunk past the limit instead of consuming all 10 MB
    assert _CountingFile.total_read <= 1_000_000 + 64 * 1024


def test_exact_limit_is_allowed():
    assert len(asyncio.run(read_limited_upload(_upload(b"x" * 1000), 1000))) == 1000


# ── SCR-11 ───────────────────────────────────────────────────────────────────
def _png(w, h):
    from PIL import Image
    buf = io.BytesIO()
    Image.new("1", (w, h)).save(buf, "PNG")  # 1-bit blank image compresses tiny
    return buf.getvalue()


def test_normal_image_accepted():
    from services.upload_validation import looks_like_real_image
    assert looks_like_real_image(_png(800, 600))


def test_image_over_pixel_ceiling_rejected(monkeypatch):
    import config
    from services import upload_validation as uv
    monkeypatch.setattr(uv.config, "MAX_IMAGE_PIXELS", 1_000_000)
    small_file_huge_canvas = _png(5000, 5000)  # 25M pixels, only a few KB
    assert len(small_file_huge_canvas) < 100_000
    assert not uv.looks_like_real_image(small_file_huge_canvas)


def test_non_image_rejected():
    from services.upload_validation import looks_like_real_image
    assert not looks_like_real_image(b"not an image")
