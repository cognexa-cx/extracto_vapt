"""Admin-only device management for per-device kiosk/tablet credentials (SCR-04)."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from auth.dependencies import get_current_user
from auth.devices import (
    DEFAULT_VALIDITY_DAYS,
    MAX_VALIDITY_DAYS,
    list_devices,
    register_device,
    revoke_device,
)
from auth.rate_limit import limiter

router = APIRouter(prefix="/api/devices")


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return current_user


class DeviceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    valid_days: int = Field(default=DEFAULT_VALIDITY_DAYS, ge=1, le=MAX_VALIDITY_DAYS)


@router.post("")
@limiter.limit("20/minute")
async def create_device(request: Request, body: DeviceCreate, _admin: dict = Depends(require_admin)):
    """Register a device. The returned device_key is shown ONCE and cannot be
    retrieved later; configure it on the device as X-Device-Key, together with
    device_id as X-Device-Id."""
    created = await register_device(body.name, body.valid_days)
    return {"success": True, "data": created}


@router.get("")
async def get_devices(_admin: dict = Depends(require_admin)):
    return {"success": True, "data": await list_devices()}


@router.post("/{device_id}/revoke")
@limiter.limit("20/minute")
async def revoke(request: Request, device_id: str, _admin: dict = Depends(require_admin)):
    if not await revoke_device(device_id):
        raise HTTPException(status_code=404, detail="Device not found")
    return {"success": True, "message": "Device revoked"}
