import io
import logging
from fastapi import APIRouter, File, Request, UploadFile, Form, Depends
from typing import Optional
import aioodbc
from PIL import Image, UnidentifiedImageError

from auth.dependencies import require_user_or_device
from auth.rate_limit import limiter
from models import UploadResponse
from services.storage import StorageService, safe_filename
from database.connection import get_db, execute_query, fetchrow_query
from db_models.extraction import new_extraction_record, insert_record
from services.pii import encrypt_row_fields

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15MB


def _looks_like_real_image(file_bytes: bytes) -> bool:
    """Verify the bytes actually decode as an image — content_type is
    client-supplied and trivially spoofable on its own."""
    try:
        Image.open(io.BytesIO(file_bytes)).verify()
        return True
    except (UnidentifiedImageError, OSError, ValueError):
        return False


@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload vehicle photos",
    description=(
        "Upload vehicle front and back images to local disk storage. "
        "Pass extraction_id to link them to an existing challan record."
    )
)
@limiter.limit("30/minute")
async def upload_photos(
    request: Request,
    vehicle_front_image: UploadFile = File(...),
    vehicle_back_image:  UploadFile = File(...),
    direction: Optional[str] = Form(default="inward"),
    extraction_id: Optional[str] = Form(default=None),
    pool: aioodbc.Pool = Depends(get_db),
    _actor: dict = Depends(require_user_or_device),
):
    validation_messages = []

    # Normalize direction
    direction = (direction or "inward").strip().lower()
    if direction not in ("inward", "outward"):
        validation_messages.append(f"Invalid direction '{direction}'. Defaulting to 'inward'.")
        direction = "inward"

    # Validate + read both files
    files_to_save = []
    front_original = None
    back_original  = None

    for label, photo in [
        ("vehicle_front_image", vehicle_front_image),
        ("vehicle_back_image",  vehicle_back_image)
    ]:
        if not photo.content_type or not photo.content_type.startswith("image/"):
            validation_messages.append(
                f"'{label}' is not a valid image (Content-Type: '{photo.content_type}')."
            )
            continue

        file_bytes = await photo.read()
        if not file_bytes:
            validation_messages.append(f"'{label}' is empty and was skipped.")
            continue
        if len(file_bytes) > MAX_UPLOAD_BYTES:
            validation_messages.append(
                f"'{label}' exceeds the {MAX_UPLOAD_BYTES // (1024*1024)}MB upload limit and was skipped."
            )
            continue
        if not _looks_like_real_image(file_bytes):
            validation_messages.append(
                f"'{label}' is not a valid image file (failed image decode) and was skipped."
            )
            continue

        prefixed_name = f"{label}_{safe_filename(photo.filename or 'photo.jpg')}"
        files_to_save.append((prefixed_name, file_bytes))

        if label == "vehicle_front_image":
            front_original = prefixed_name
        else:
            back_original = prefixed_name

    if not files_to_save:
        return UploadResponse(
            success=False,
            direction=direction,
            validation_messages=validation_messages or ["No valid image files were found."]
        )

    # Save files to local disk storage
    try:
        folder_path, saved_urls = StorageService.save_files(files_to_save, direction)
    except Exception as e:
        logger.exception("Storage failure in /upload")
        return UploadResponse(
            success=False,
            direction=direction,
            validation_messages=[f"Failed to upload files: {str(e)}"]
        )

    # Map URLs back to named variables
    front_url = next((u for u in saved_urls if "vehicle_front" in u), None)
    back_url  = next((u for u in saved_urls if "vehicle_back"  in u), None)

    def _basename(url: str | None) -> str | None:
        return url.rsplit("/", 1)[-1] if url else None

    front_saved_name = _basename(front_url)
    back_saved_name  = _basename(back_url)

    # Link to existing record OR create new one
    try:
        matched = False
        if extraction_id:
            row = await fetchrow_query("SELECT id FROM extraction_records WHERE id = ?", extraction_id)
            if row:
                enc = encrypt_row_fields(
                    "extraction_records",
                    vehicle_front_filename=front_saved_name,
                    vehicle_back_filename=back_saved_name,
                    vehicle_front_url=front_url,
                    vehicle_back_url=back_url,
                )
                await execute_query(
                    """
                    UPDATE extraction_records
                    SET vehicle_front_filename = ?,
                        vehicle_back_filename  = ?,
                        vehicle_front_url      = ?,
                        vehicle_back_url       = ?
                    WHERE id = ?
                    """,
                    enc.get("vehicle_front_filename"), enc.get("vehicle_back_filename"),
                    enc.get("vehicle_front_url"), enc.get("vehicle_back_url"),
                    extraction_id,
                )
                matched = True
                logger.info(f"✅ Linked vehicle images to record {extraction_id}")
            else:
                validation_messages.append(f"Warning: extraction_id '{extraction_id}' not found.")

        if not matched:
            new_record = new_extraction_record(
                direction=direction,
                success=True,
                vehicle_front_filename=front_saved_name,
                vehicle_back_filename=back_saved_name,
                folder_path=folder_path,
                vehicle_front_url=front_url,
                vehicle_back_url=back_url,
            )
            await insert_record(None, new_record)
            logger.info("✅ New vehicle upload record created")

    except Exception as e:
        logger.warning(f"DB save failed (non-critical): {e}")

    return UploadResponse(
        success=True,
        direction=direction,
        folder_path=folder_path,
        saved_files=[StorageService.sign_url(u) for u in saved_urls],
        validation_messages=validation_messages
    )