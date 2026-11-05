import logging
from fastapi import APIRouter, Depends, Form, Request
from pydantic import BaseModel

from auth.dependencies import require_user_or_device
from auth.rate_limit import limiter
from services import session_store

logger = logging.getLogger(__name__)
router = APIRouter()


class RejectResponse(BaseModel):
    success: bool
    message: str = ""


@router.post(
    "/reject",
    response_model=RejectResponse,
    summary="Reject — discard the pending session, nothing saved",
    description=(
        "Called when the user rejects the extracted data. "
        "Deletes the pending session. Nothing is written to blob storage "
        "or the permanent extraction_records table."
    )
)
@limiter.limit("30/minute")
async def reject(request: Request, session_id: str = Form(...), _actor: dict = Depends(require_user_or_device)):
    await session_store.delete_session(session_id)
    logger.info(
        "Session rejected",
        extra={"event": "record_rejected", "session_id": session_id},
    )
    return RejectResponse(success=True, message="Session discarded.")
