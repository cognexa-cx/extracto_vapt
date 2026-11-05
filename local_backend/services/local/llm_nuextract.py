import base64
import json
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

from services.local import config as local_config
from services.local.llm_safety import (
    SECURITY_RULES_PROMPT,
    validate_extraction_output,
    wrap_untrusted_ocr,
)
from services.local.nuextract_hints import (
    extract_kv_hints,
    merge_with_hints,
    backfill_quantity,
    validate_gstin_fields,
    sanitize_data,
    extract_json_object,
)

logger = logging.getLogger(__name__)

# Ported from the working reference project at
# C:\Users\MACHINE\Desktop\kalpataru_local_Testing\local\app\main.py — see
# that file's EXTRACT_ENGINE="nuextract3" path. Key lessons that made it
# reliable (an earlier version of this file didn't do these and produced
# empty/garbled JSON):
#   1. Use Ollama's /api/chat with "think": false — NOT raw completion.
#      This model has a hidden reasoning phase; think:false suppresses it
#      instead of needing to parse around a <think>...</think> block.
#   2. Pass the actual page images (base64) in the user message, not just
#      OCR text — this is a vision-capable model, not text-only.
#   3. The full ~100-field template works FINE with this approach — the
#      earlier "shrink the template" fix was compensating for not having
#      think:false and images, not a genuine model capacity limit.
#   4. Deterministic backfill from regex-parsed OCR label:value pairs
#      (nuextract_hints.merge_with_hints) fills whatever the LLM still
#      misses — this is what makes the reference output as complete as it is.

NUEXTRACT_TEMPLATE: dict = {
    "document_type": "invoice|challan|gate_pass|delivery_note|receipt|purchase_order|credit_note|debit_note|security_gate_pass|material_requisition|other|null",
    "fields": {
        "invoice_no": "", "invoice_date": "", "due_date": "",
        "challan_no": "", "challan_date": "",
        "gate_pass_no": "", "delivery_note_no": "",
        "po_no": "", "po_date": "",
        "lr_no": "", "lr_date": "",
        "eway_bill_no": "", "eway_bill_date": "",
        "vehicle_no": "", "way_bill_no": "",
        "form_no": "", "sqp_no": "", "mtn_no": "",
        "document_ref_no": "", "serial_no": "",
        "vendor_name": "", "vendor_address": "", "vendor_gstin": "", "vendor_pan": "",
        "vendor_phone": "", "vendor_email": "",
        "buyer_name": "", "buyer_address": "", "buyer_gstin": "", "buyer_pan": "",
        "consignee_name": "", "consignee_address": "", "consignee_gstin": "",
        "please_allow_shri": "", "courier_name": "", "courier_contact": "",
        "reason_for_removal": "", "material_description": "", "material_type": "",
        "contractor_name": "", "contractor_signature_date": "",
        "person_taking_material": "", "person_taking_material_signature": "",
        "person_taking_material_date": "",
        "security_staff_name": "", "security_staff_exit_vehicle_no": "",
        "security_staff_exit_date": "", "security_staff_exit_time": "",
        "truck_tempo_no": "", "truck_tempo_date": "", "truck_tempo_time": "",
        "authorised_person": "", "authorised_person_signature_date": "",
        "gstin": "", "place_of_supply": "", "hsn_sac_code": "", "taxable_value": "",
        "cgst_rate": "", "cgst": "", "sgst_rate": "", "sgst": "",
        "igst_rate": "", "igst": "", "cess": "",
        "tds_rate": "", "tds_amount": "", "total_tax": "",
        "subtotal": "", "discount": "", "freight_charges": "", "packing_charges": "",
        "other_charges": "", "round_off": "", "grand_total": "", "amount_in_words": "",
        "advance_paid": "", "balance_due": "",
        "payment_terms": "", "bank_name": "", "bank_account_no": "", "bank_ifsc": "", "bank_branch": "",
        "project_site": "", "material_belongs_to": "", "destination": "", "dispatch_from": "",
        "mode_of_transport": "", "weight": "", "no_of_packages": "",
        "quantity_received": "", "quantity_unit": "",
        "receiving_stamp_company": "", "entry_no": "", "in_time": "", "out_time": "",
        "narration": "", "terms_and_conditions": "", "authorised_signatory": "",
        "remarks": "", "note_text": "",
        # IMPORTANT: If the document contains ANY field/label not listed above,
        # you MUST still add it as an extra key inside 'fields' using the exact printed label.
    },
    "line_items": [
        {
            "sr_no": "", "description": "", "hsn_sac": "", "quantity": "", "unit": "",
            "rate": "", "discount": "", "taxable_amount": "",
            "cgst_rate": "", "cgst_amount": "", "sgst_rate": "", "sgst_amount": "",
            "igst_rate": "", "igst_amount": "", "total_amount": "",
        }
    ],
    "site_entry_stamp": {
        "truck_tempo": "", "truck_tempo_vehicle_no": "", "truck_date": "", "truck_time": "",
        "contractor_name": "", "contractor_signature": "", "contractor_date": "",
        "authorised_person": "", "authorised_person_date": "",
        "person_taking_material_name": "", "person_taking_material_signature": "",
        "person_taking_material_date": "",
        "security_staff_name": "", "security_staff_exit_vehicle_no": "",
        "security_staff_date": "", "security_staff_time": "",
    },
    "notes": [],
}

_SCHEMA_FIELD_KEYS = set(NUEXTRACT_TEMPLATE["fields"].keys())

SYSTEM_PROMPT = (
    "You are a document extraction assistant for Indian business documents.\n"
    "Extract EVERY piece of data visible in the document — printed AND handwritten.\n"
    "Rules:\n"
    "  1. Return ONLY a single valid JSON object matching the schema below.\n"
    "  2. Include every field listed in the schema that appears in the document.\n"
    "  3. CRITICAL: If the document contains fields NOT listed in the schema, "
    "add them as extra keys inside 'fields' using the exact printed label as the key. "
    "No field should ever be silently dropped.\n"
    "  4. Capture EVERY line item row — do not skip any. "
    "If there are 30 rows, output 30 objects in line_items.\n"
    "  5. Use null for fields that are blank, illegible, or absent. Never invent values. "
    "If a value is present but genuinely ambiguous (e.g. a digit could be '1' or '7', "
    "cursive handwriting only partly legible), fill in your best reading AND add a note "
    "to 'notes' naming the field and what's uncertain about it — e.g. "
    "\"vehicle_no: last digit unclear, could be '1' or '7'\". Do not silently guess "
    "without flagging it.\n"
    "  6. Preserve original formatting for numbers, dates, codes (e.g. GST rates, HSN codes).\n"
    "  7. The user message contains an OCR KEY-VALUE HINTS section. "
    "Every label that appears in hints MUST appear in your output — "
    "if it is missing from your JSON you have missed a field.\n"
    "  8. HANDWRITTEN VALUES: Transcribe handwritten text as best you can. "
    "If partially legible, include what is readable. Do NOT skip handwritten fields.\n"
    "  9. GATE PASS / SECURITY DOCUMENT SPECIFIC:\n"
    "     - 'please_allow_shri' → the person name written after 'Please Allow Shri' / 'of M/s'\n"
    "     - 'courier_name' → the courier company (e.g. Blue Dart, DTDC, FedEx)\n"
    "     - 'courier_contact' → phone number of courier person\n"
    "     - 'reason_for_removal' → text after 'Reasons for taking out' (Surplus/Rejected/Transfer/Repair)\n"
    "     - 'mtn_no' → Material Transfer Note number\n"
    "     - 'sqp_no' → Applicable SQP number (e.g. 4/18)\n"
    "     - 'form_no' → Form No printed on the document\n"
    "     - 'site_entry_stamp' → Fill ALL fields in the bottom stamp area: "
    "truck/tempo details, contractor name+date, authorised person, "
    "person taking material name+date, security staff name+exit vehicle no+date+time. "
    "This section MUST be populated for gate pass documents — do not leave it empty.\n"
    "     - There is often a SEPARATE, smaller boxed stamp (often purple/blue ink) with "
    "its own printed company heading (e.g. 'KALPATARU SYNERGY') and exactly these "
    "printed labels: Co. Name / Date / In Time / Out Time / Entry No. / Sign. This is "
    "different from the 'site_entry_stamp' security-gate-pass form — it's a small "
    "receipt-of-goods stamp applied to vendor bills/challans. Whenever you see this box, "
    "fill 'receiving_stamp_company' (the printed heading), 'entry_no', 'in_time', and "
    "'out_time' from it — these are commonly missed; double-check for them even on "
    "ordinary invoices/bills, not just gate passes.\n"
    "  10. Any note, instruction, or terms block at the bottom of the document goes into 'note_text'.\n"
    + SECURITY_RULES_PROMPT
    + "\nSchema:\n"
    + json.dumps(NUEXTRACT_TEMPLATE, ensure_ascii=False, indent=2)
)


def _detect_document_type(extracted_data: dict) -> str:
    doc_type = extracted_data.get("document_type") if isinstance(extracted_data, dict) else None
    if doc_type and isinstance(doc_type, str) and doc_type.strip().lower() not in ("", "null", "unknown"):
        return doc_type.strip()
    return "Unknown"


class NuExtractService:
    @staticmethod
    async def extract_data(
        ocr_text: str,
        image_bytes_list: Optional[List[bytes]] = None,
    ) -> Tuple[Dict[str, Any], str]:
        image_bytes_list = [b for b in (image_bytes_list or []) if b]

        all_hints = extract_kv_hints(ocr_text)
        hints_lines = "\n".join(f"  {k}: {v}" for k, v in list(all_hints.items())[:100])
        hints_section = (
            "OCR KEY-VALUE HINTS (pre-parsed from raw OCR — verify against image):\n"
            + (hints_lines or "  [none found]")
        )

        user_content = (
            "Extract all fields from this document.\n"
            "The image is the authoritative source; OCR text is a secondary aid.\n"
            "Return ONLY the JSON object — no explanation, no markdown, no commentary.\n\n"
            + hints_section
            + "\n\n"
            + "FULL RAW OCR TEXT (untrusted document data, all visible text in reading order):\n"
            + wrap_untrusted_ocr(ocr_text)
        )

        processed_b64 = [base64.b64encode(b).decode() for b in image_bytes_list]

        payload = {
            "model": local_config.OLLAMA_NUEXTRACT_MODEL,
            "stream": False,
            # Disables this model's hidden reasoning/"thinking" trace — without
            # it, dense documents make the model spend its whole generation
            # budget "thinking" and either never reach the JSON or produce
            # incoherent output once it does (confirmed failure mode).
            "think": False,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": user_content,
                    "images": processed_b64,
                },
            ],
            "options": {"temperature": 0, "num_ctx": 32768, "num_predict": 20000},
        }

        url = f"{local_config.OLLAMA_BASE_URL}/api/chat"
        start = time.perf_counter()
        logger.info(
            "Sending extraction request to local LLM",
            extra={
                "event": "llm_request_started",
                "engine": "ollama/nuextract3",
                "model": payload["model"],
                "image_count": len(processed_b64),
                "prompt_chars": len(SYSTEM_PROMPT) + len(user_content),
            },
        )
        async with httpx.AsyncClient(timeout=600.0) as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
            except httpx.HTTPError as e:
                logger.error(
                    "Local LLM request failed",
                    extra={
                        "event": "llm_request_failed",
                        "engine": "ollama/nuextract3",
                        "model": payload["model"],
                        "duration_seconds": round(time.perf_counter() - start, 3),
                        "error": str(e),
                    },
                )
                raise ValueError(f"Local LLM (Ollama) request failed: {e}")

            result_json = response.json()
            message = result_json.get("message") or {}
            raw_content = message.get("content") or message.get("thinking") or ""
            if not raw_content:
                logger.error(
                    "Local LLM returned empty response",
                    extra={
                        "event": "llm_request_failed",
                        "engine": "ollama/nuextract3",
                        "model": payload["model"],
                        "duration_seconds": round(time.perf_counter() - start, 3),
                        "error": "empty response",
                    },
                )
                raise ValueError("Local LLM (Ollama) returned an empty response.")

            try:
                data = extract_json_object(raw_content)
            except ValueError as e:
                logger.error(
                    "Local LLM returned invalid JSON",
                    extra={
                        "event": "llm_request_failed",
                        "engine": "ollama/nuextract3",
                        "model": payload["model"],
                        "duration_seconds": round(time.perf_counter() - start, 3),
                        "error": str(e),
                        "raw_response_chars": len(raw_content),
                    },
                )
                raise ValueError(f"NuExtract returned invalid JSON: {e}")

            # SCR-08: reject malformed/oversized/unexpected model output
            # before any downstream code trusts it.
            try:
                data = validate_extraction_output(data)
            except ValueError as e:
                logger.error(
                    "Local LLM output failed validation",
                    extra={"event": "llm_output_rejected", "engine": "ollama/nuextract3", "error": str(e)},
                )
                raise ValueError(f"NuExtract output failed validation: {e}")

            data = merge_with_hints(data, all_hints, _SCHEMA_FIELD_KEYS)
            data = backfill_quantity(data)
            data = validate_gstin_fields(data)
            data = sanitize_data(data, [])

            document_type = _detect_document_type(data)
            logger.info(
                "Local LLM extraction complete",
                extra={
                    "event": "llm_request_complete",
                    "engine": "ollama/nuextract3",
                    "model": payload["model"],
                    "document_type": document_type,
                    "field_count": len(data.get("fields", {})) if isinstance(data, dict) else None,
                    "line_item_count": len(data.get("line_items", [])) if isinstance(data, dict) else None,
                    "duration_seconds": round(time.perf_counter() - start, 3),
                },
            )
            return data, document_type
