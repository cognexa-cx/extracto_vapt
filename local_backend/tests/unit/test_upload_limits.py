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
