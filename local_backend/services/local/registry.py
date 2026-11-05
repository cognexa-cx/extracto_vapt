from services.local.ocr_paddle import PaddleOCRService
from services.local.llm_nuextract import NuExtractService

# Registry of available local OCR+LLM combinations, keyed by the id the
# frontend sends in the `combination` form field. To add a new combination:
#   1. Write its OCR service (perform_ocr_multi(pages: list[bytes]) -> str)
#      and/or LLM service (extract_data(ocr_text, image_bytes_list) -> (dict, str)).
#   2. Add one entry below.
# No route, frontend, or other backend code needs to change — GET
# /local/combinations picks this up automatically.
LOCAL_COMBINATIONS = {
    "combination_1": {
        "label": "PaddleOCR (PP-StructureV3) + NuExtract-3 Q4",
        "ocr": PaddleOCRService.perform_ocr_multi,
        "llm": NuExtractService.extract_data,
    },
}
