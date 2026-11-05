"""
Structured local logging — every OCR/LLM call, extraction, and
approve/reject decision is logged as one JSON line to disk, plus a
human-readable line on the console. No external service involved.

Log file: {LOG_DIR}/extracto.log (rotates at 10MB, keeps 5 backups)

Reading the logs:
    # tail -f, pretty-printed
    Get-Content logs\\extracto.log -Wait -Tail 20 | ConvertFrom-Json | Format-List

    # every failed extraction today
    Get-Content logs\\extracto.log | ConvertFrom-Json | Where-Object {
        $_.event -eq "extraction_failed"
    }
"""
import json
import logging
import logging.handlers
import os
from datetime import datetime, timezone

LOG_DIR = os.getenv("LOG_DIR", "./logs")
LOG_FILE = os.path.join(LOG_DIR, "extracto.log")

# Every attribute a plain logging.LogRecord already carries — anything else
# found on a record was passed in via logger.info(..., extra={...}) and
# should be surfaced as its own field in the JSON line.
_STANDARD_RECORD_KEYS = set(logging.LogRecord("", 0, "", 0, "", (), None).__dict__.keys()) | {
    "message", "asctime",
}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in _STANDARD_RECORD_KEYS and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str, ensure_ascii=False)


def setup_logging() -> None:
    """Call once, at process startup, before the app starts serving."""
    os.makedirs(LOG_DIR, exist_ok=True)

    file_handler = logging.handlers.RotatingFileHandler(
        LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(JsonFormatter())
    file_handler.setLevel(logging.INFO)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)-8s %(name)s: %(message)s")
    )
    console_handler.setLevel(logging.INFO)

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()
    root.addHandler(file_handler)
    root.addHandler(console_handler)

    # These are noisy at INFO (one line per HTTP request / file-change poll)
    # and add nothing the structured events below don't already capture.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    logging.getLogger(__name__).info(
        "Structured logging initialised", extra={"event": "logging_initialised", "log_file": os.path.abspath(LOG_FILE)}
    )
