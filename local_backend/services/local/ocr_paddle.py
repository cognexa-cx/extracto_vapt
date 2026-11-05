import asyncio
import io
import logging
import threading
import time

from services.local import config as local_config

logger = logging.getLogger(__name__)

# The PP-StructureV3 pipeline is expensive to construct (loads several
# detection/recognition/table models), so it's built once and reused —
# never at import time, so importing this module doesn't require
# paddleocr/paddlepaddle to be installed unless the local backend is
# actually invoked. Guarded with a plain threading.Lock (not asyncio.Lock)
# since this runs inside worker threads via asyncio.to_thread, and
# perform_ocr_multi may fire several pages concurrently on the very first
# call before the pipeline exists yet.
_pipeline = None
_pipeline_lock = threading.Lock()


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        with _pipeline_lock:
            if _pipeline is None:
                from paddleocr import PPStructureV3  # lazy import — optional dependency

                logger.info(f"Loading PaddleOCR PP-StructureV3 pipeline on device={local_config.PADDLEOCR_DEVICE} (first call only)...")
                # Ported from the working reference project
                # (kalpataru_local_Testing/local/app/main.py) — disabling the
                # submodules this project doesn't need (doc orientation,
                # unwarping, seal/formula/chart recognition) cuts pipeline
                # construction from ~25s + a one-time 735MB model download
                # down to a few seconds, since those heavy models are never
                # loaded at all. Only text detection/recognition + table
                # recognition are kept.
                kwargs = dict(
                    lang=local_config.PADDLEOCR_LANG,
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_seal_recognition=False,
                    use_formula_recognition=False,
                    use_chart_recognition=False,
                    use_table_recognition=True,
                )
                try:
                    _pipeline = PPStructureV3(device=local_config.PADDLEOCR_DEVICE, **kwargs)
                except TypeError:
                    # Older/newer paddleocr versions may not accept the device kwarg.
                    _pipeline = PPStructureV3(**kwargs)
    return _pipeline


def _analyze_sync(image_bytes: bytes) -> str:
    """
    Runs PP-StructureV3 on a single page and returns its markdown output
    (text + real Markdown pipe-tables) — tables come back with columns kept
    aligned far more reliably than manual word-level clustering.
    """
    import numpy as np
    from PIL import Image

    pipeline = _get_pipeline()

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    bgr = np.array(image)[:, :, ::-1]  # PP-StructureV3 expects BGR (OpenCV convention)

    markdown_parts = []
    for res in pipeline.predict(input=bgr):
        md = res.markdown if hasattr(res, "markdown") else {}
        text = md.get("markdown_texts", "") if isinstance(md, dict) else ""
        if text:
            markdown_parts.append(text)

    return "\n\n".join(markdown_parts)


class PaddleOCRService:
    @classmethod
    async def perform_ocr(cls, image_bytes: bytes) -> str:
        start = time.perf_counter()
        try:
            text = await asyncio.to_thread(_analyze_sync, image_bytes)
        except Exception:
            logger.exception(
                "OCR page failed",
                extra={
                    "event": "ocr_page_failed",
                    "engine": "paddleocr",
                    "device": local_config.PADDLEOCR_DEVICE,
                    "image_bytes": len(image_bytes),
                    "duration_seconds": round(time.perf_counter() - start, 3),
                },
            )
            raise
        logger.info(
            "OCR page complete",
            extra={
                "event": "ocr_page_complete",
                "engine": "paddleocr",
                "device": local_config.PADDLEOCR_DEVICE,
                "image_bytes": len(image_bytes),
                "output_chars": len(text),
                "duration_seconds": round(time.perf_counter() - start, 3),
            },
        )
        return text

    @classmethod
    async def perform_ocr_multi(cls, pages: list[bytes]) -> str:
        """Runs each page concurrently and concatenates with page markers."""
        start = time.perf_counter()
        texts = await asyncio.gather(*(cls.perform_ocr(page_bytes) for page_bytes in pages))
        logger.info(
            "OCR batch complete",
            extra={
                "event": "ocr_batch_complete",
                "engine": "paddleocr",
                "page_count": len(pages),
                "duration_seconds": round(time.perf_counter() - start, 3),
            },
        )
        return "\n\n".join(f"=== PAGE {i} ===\n{text}" for i, text in enumerate(texts, start=1))
