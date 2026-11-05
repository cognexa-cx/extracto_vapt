import os

# Local backend settings — all optional with safe defaults. None of these are
# validated at startup (unlike config.py's cloud vars), so a deployment that
# never uses the local backend keeps booting exactly as before even if none
# of this is set.

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_NUEXTRACT_MODEL = os.getenv("OLLAMA_NUEXTRACT_MODEL", "nuextract3:q4")

PADDLEOCR_LANG = os.getenv("PADDLEOCR_LANG", "en")
# "gpu:0" runs PP-StructureV3 on the first CUDA GPU (requires
# paddlepaddle-gpu, not the CPU-only paddlepaddle package); "cpu" falls
# back to CPU-only inference.
PADDLEOCR_DEVICE = os.getenv("PADDLEOCR_DEVICE", "gpu:0")
