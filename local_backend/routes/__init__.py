from .local_extract import router as local_extract_router
from .upload import router as upload_router
from .history import router as history_router
from .approve import router as approve_router
from .reject import router as reject_router
from .manual_entry import router as manual_entry_router
from .auth import router as auth_router
from .devices import router as devices_router

__all__ = [
    "devices_router",
    "local_extract_router",
    "upload_router",
    "history_router",
    "approve_router",
    "reject_router",
    "manual_entry_router",
    "auth_router",
]
