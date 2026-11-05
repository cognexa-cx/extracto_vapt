import time
import uuid
import logging
from fastapi import APIRouter, Depends, File, Request, UploadFile, Form
from typing import List, Optional

from auth.dependencies import require_user_or_device
from auth.rate_limit import limiter
from models import ExtractionResponse
from services import session_store
from services.local.registry import LOCAL_COMBINATIONS
from services.upload_validation import validate_image_bytes

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/local")

MAX_INVOICE_PAGES = 6


def validate_image_file(file: UploadFile) -> List[str]:
    errors = []
    if not file.content_type or not file.content_type.startswith("image/"):
        errors.append(
            f"File '{file.filename}' is not a valid image. "
            f"(Content-Type: '{file.content_type}')"
        )
    return errors


@router.get(
    "/combinations",
    summary="List available local OCR + LLM combinations",
    description="Returns every combination currently registered in services/local/registry.py, so the frontend never has to hardcode ids/labels.",
)
async def list_combinations():
    return {
        "success": True,
        "combinations": [
            {"id": combo_id, "label": combo["label"]}
            for combo_id, combo in LOCAL_COMBINATIONS.items()
        ],
    }


@router.post(
    "/extract",
    response_model=ExtractionResponse,
    summary="Local-backend equivalent of POST /extract — runs the selected local OCR + LLM combination",
    description=(
        "Same request shape as POST /extract, plus a `combination` form field "
        "selecting which registered local OCR+LLM pair to run. Uses no paid "
        "cloud APIs. Writes to the same pending_sessions mechanism as the "
        "cloud path, so POST /approve and POST /reject work unchanged."
    ),
)
@limiter.limit("20/minute")
async def local_extract(
    request: Request,
    challan_images:      List[UploadFile] = File(...),
    vehicle_front_image: UploadFile = File(...),
    vehicle_back_image:  UploadFile = File(...),
    direction: Optional[str] = Form(default="inward"),
    combination: Optional[str] = Form(default="combination_1"),
    _actor: dict = Depends(require_user_or_device),
):
    validation_messages = []

    combo = LOCAL_COMBINATIONS.get(combination)
    if not combo:
        available = ", ".join(LOCAL_COMBINATIONS.keys()) or "none registered"
        return ExtractionResponse(
            success=False,
            validation_messages=[f"Unknown local combination '{combination}'. Available: {available}."],
        )

    if not challan_images:
        return ExtractionResponse(success=False, validation_messages=["At least one challan_images page is required."])
    if len(challan_images) > MAX_INVOICE_PAGES:
        return ExtractionResponse(
            success=False,
            validation_messages=[f"Too many invoice pages ({len(challan_images)}). Max is {MAX_INVOICE_PAGES}."]
        )

    for label, f in [("vehicle_front_image", vehicle_front_image), ("vehicle_back_image", vehicle_back_image)]:
        errs = validate_image_file(f)
        if errs:
            validation_messages.extend(errs)
    for i, f in enumerate(challan_images, start=1):
        errs = validate_image_file(f)
        if errs:
            validation_messages.extend([f"Page {i}: {e}" for e in errs])

    if validation_messages:
        return ExtractionResponse(success=False, validation_messages=validation_messages)

    direction = (direction or "inward").strip().lower()
    if direction not in ("inward", "outward", "returnable"):
        direction = "inward"

    logger.info(
        "Extraction request received",
        extra={
            "event": "extraction_started",
            "direction": direction,
            "combination": combination,
            "page_count": len(challan_images),
        },
    )

    try:
        challan_bytes_list = [await f.read() for f in challan_images]
        front_bytes = await vehicle_front_image.read()
        back_bytes  = await vehicle_back_image.read()

        if not any(challan_bytes_list):
            return ExtractionResponse(
                success=False,
                validation_messages=["The challan_images are empty."]
            )

        # Real-content + size check against actual bytes read — a spoofed
        # Content-Type header already passed the earlier check, so this is
        # what actually confirms these are real images, not just
        # correctly-labeled ones.
        size_errors = []
        for i, b in enumerate(challan_bytes_list, start=1):
            err = validate_image_bytes(challan_images[i - 1], b)
            if err:
                size_errors.append(f"Page {i}: {err}")
        for label, f, b in [
            ("vehicle_front_image", vehicle_front_image, front_bytes),
            ("vehicle_back_image", vehicle_back_image, back_bytes),
        ]:
            err = validate_image_bytes(f, b)
            if err:
                size_errors.append(err)
        if size_errors:
            return ExtractionResponse(success=False, validation_messages=size_errors)

        ocr_start = time.perf_counter()
        try:
            ocr_text = await combo["ocr"](challan_bytes_list)
        except Exception as e:
            logger.exception(
                "Local OCR failure",
                extra={"event": "extraction_failed", "stage": "ocr", "combination": combination, "direction": direction},
            )
            return ExtractionResponse(
                success=False,
                validation_messages=[f"Local OCR extraction failed: {str(e)}"]
            )
        ocr_seconds = time.perf_counter() - ocr_start

        if not ocr_text.strip():
            return ExtractionResponse(
                success=False,
                ocr_text="",
                validation_messages=["No text could be extracted from the challan image(s)."]
            )

        llm_start = time.perf_counter()
        try:
            extracted_data, document_type = await combo["llm"](
                ocr_text=ocr_text,
                image_bytes_list=challan_bytes_list,
            )
        except Exception as e:
            logger.exception(
                "Local LLM failure",
                extra={"event": "extraction_failed", "stage": "llm", "combination": combination, "direction": direction},
            )
            return ExtractionResponse(
                success=False,
                ocr_text=ocr_text,
                validation_messages=[f"Local LLM data extraction failed: {str(e)}"]
            )
        llm_seconds = time.perf_counter() - llm_start

        if isinstance(extracted_data, dict):
            extracted_data["timing"] = {
                "ocr_seconds": round(ocr_seconds, 2),
                "llm_seconds": round(llm_seconds, 2),
                "total_seconds": round(ocr_seconds + llm_seconds, 2),
            }

        session_id = str(uuid.uuid4())
        await session_store.save_session(session_id, {
            "direction": direction,
            "challan_pages": [
                {
                    "name": f"challan_p{i+1}_{challan_images[i].filename or f'page{i+1}.jpg'}",
                    "bytes": b,
                }
                for i, b in enumerate(challan_bytes_list)
            ],
            "front_bytes": front_bytes,
            "back_bytes":  back_bytes,
            "front_name":  f"vehicle_front_{vehicle_front_image.filename or 'front.jpg'}",
            "back_name":   f"vehicle_back_{vehicle_back_image.filename or 'back.jpg'}",
        })

        logger.info(
            "Extraction complete",
            extra={
                "event": "extraction_completed",
                "direction": direction,
                "combination": combination,
                "document_type": document_type,
                "session_id": session_id,
                "ocr_seconds": round(ocr_seconds, 2),
                "llm_seconds": round(llm_seconds, 2),
                "total_seconds": round(ocr_seconds + llm_seconds, 2),
            },
        )

        return ExtractionResponse(
            success=True,
            session_id=session_id,
            extracted_data=extracted_data,
            document_type=document_type,
            ocr_text=ocr_text,
            validation_messages=validation_messages,
        )

    except Exception as e:
        logger.exception(
            "Unexpected error in /local/extract",
            extra={"event": "extraction_failed", "stage": "unexpected", "combination": combination, "direction": direction},
        )
        return ExtractionResponse(
            success=False,
            validation_messages=[f"An unexpected error occurred: {str(e)}"]
        )
