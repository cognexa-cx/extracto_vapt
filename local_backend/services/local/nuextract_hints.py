"""
Ported from the working reference implementation at
C:\\Users\\MACHINE\\Desktop\\kalpataru_local_Testing\\local\\app\\main.py.

Deterministic OCR-text post-processing that backfills whatever the LLM
missed. This is the single biggest reliability booster in the reference
project: instead of trusting the LLM alone to fill ~100 fields, raw OCR text
is regex-scanned for "LABEL: VALUE" pairs, mapped through a large label→field
alias table, and merged into whatever the LLM already produced — so a field
still gets filled even if the LLM's JSON generation missed or garbled it.
"""
import json
import re
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Normalised alias map: OCR label -> schema field name
# ---------------------------------------------------------------------------
FIELD_ALIASES: Dict[str, str] = {
    # Invoice identifiers
    "invoice no": "invoice_no", "invoice number": "invoice_no", "inv no": "invoice_no",
    "invoice date": "invoice_date", "inv date": "invoice_date", "date of invoice": "invoice_date",
    "due date": "due_date", "payment due": "due_date", "payment due date": "due_date",
    "challan no": "challan_no", "challan number": "challan_no", "dc no": "challan_no",
    "delivery challan no": "challan_no", "challan date": "challan_date",
    "gate pass no": "gate_pass_no", "gate pass number": "gate_pass_no", "gp no": "gate_pass_no",
    "delivery note no": "delivery_note_no", "dn no": "delivery_note_no",
    "po no": "po_no", "po number": "po_no", "purchase order no": "po_no",
    "purchase order number": "po_no", "order no": "po_no",
    "po date": "po_date", "purchase order date": "po_date",
    "lr no": "lr_no", "lr number": "lr_no", "lorry receipt no": "lr_no",
    "lorry receipt number": "lr_no", "lr date": "lr_date",
    "eway bill no": "eway_bill_no", "e-way bill no": "eway_bill_no",
    "eway bill number": "eway_bill_no", "e way bill no": "eway_bill_no",
    "eway bill date": "eway_bill_date", "e-way bill date": "eway_bill_date",
    "vehicle no": "vehicle_no", "vehicle number": "vehicle_no", "veh no": "vehicle_no",
    "way bill no": "way_bill_no", "waybill no": "way_bill_no",
    # Parties
    "vendor name": "vendor_name", "supplier name": "vendor_name", "seller name": "vendor_name",
    "supplier": "vendor_name", "seller": "vendor_name",
    "vendor address": "vendor_address", "supplier address": "vendor_address",
    "vendor gstin": "vendor_gstin", "supplier gstin": "vendor_gstin",
    "vendor pan": "vendor_pan", "supplier pan": "vendor_pan",
    "vendor phone": "vendor_phone", "supplier phone": "vendor_phone",
    "vendor email": "vendor_email", "supplier email": "vendor_email",
    "buyer name": "buyer_name", "bill to": "buyer_name", "billed to": "buyer_name",
    "buyer": "buyer_name", "customer name": "buyer_name",
    "m/s": "buyer_name", "m/s.": "buyer_name", "ms": "buyer_name",
    "buyer address": "buyer_address", "billing address": "buyer_address",
    "buyer gstin": "buyer_gstin", "customer gstin": "buyer_gstin",
    "buyer pan": "buyer_pan", "customer pan": "buyer_pan",
    "consignee name": "consignee_name", "ship to": "consignee_name",
    "consignee address": "consignee_address", "shipping address": "consignee_address",
    "consignee gstin": "consignee_gstin",
    # Tax / GST
    "gstin": "gstin", "gst no": "gstin", "gst number": "gstin", "gst reg no": "gstin",
    "place of supply": "place_of_supply", "state of supply": "place_of_supply",
    "hsn sac code": "hsn_sac_code", "hsn code": "hsn_sac_code",
    "sac code": "hsn_sac_code", "hsn": "hsn_sac_code",
    "taxable value": "taxable_value", "taxable amount": "taxable_value",
    "cgst rate": "cgst_rate", "cgst %": "cgst_rate",
    "cgst": "cgst", "cgst amount": "cgst",
    "sgst rate": "sgst_rate", "sgst %": "sgst_rate",
    "sgst": "sgst", "sgst amount": "sgst",
    "igst rate": "igst_rate", "igst %": "igst_rate",
    "igst": "igst", "igst amount": "igst",
    "cess": "cess", "cess amount": "cess",
    "tds rate": "tds_rate", "tds %": "tds_rate",
    "tds amount": "tds_amount", "tds": "tds_amount",
    "total tax": "total_tax", "tax amount": "total_tax", "total gst": "total_tax",
    # Amounts
    "subtotal": "subtotal", "sub total": "subtotal", "sub-total": "subtotal",
    "discount": "discount", "less discount": "discount",
    "freight charges": "freight_charges", "freight": "freight_charges",
    "transportation charges": "freight_charges", "transport charges": "freight_charges",
    "packing charges": "packing_charges", "packaging charges": "packing_charges",
    "other charges": "other_charges", "miscellaneous charges": "other_charges",
    "round off": "round_off", "rounding": "round_off", "round-off": "round_off",
    "grand total": "grand_total", "total amount": "grand_total", "net amount": "grand_total",
    "net payable": "grand_total", "invoice amount": "grand_total",
    "amount in words": "amount_in_words", "rupees in words": "amount_in_words",
    "total in words": "amount_in_words",
    "advance paid": "advance_paid", "advance": "advance_paid",
    "balance due": "balance_due", "balance payable": "balance_due",
    "balance amount": "balance_due", "net due": "balance_due",
    # Payment / Bank
    "payment terms": "payment_terms", "terms of payment": "payment_terms",
    "credit days": "payment_terms",
    "bank name": "bank_name", "name of bank": "bank_name",
    "bank account no": "bank_account_no", "account no": "bank_account_no",
    "account number": "bank_account_no", "a/c no": "bank_account_no",
    "bank ifsc": "bank_ifsc", "ifsc code": "bank_ifsc", "ifsc": "bank_ifsc",
    "bank branch": "bank_branch", "branch": "bank_branch", "branch name": "bank_branch",
    # Site / Logistics
    "project site": "project_site", "site": "project_site", "site name": "project_site",
    "material belongs to": "material_belongs_to", "material for": "material_belongs_to",
    "destination": "destination", "delivery destination": "destination",
    "dispatch from": "dispatch_from", "dispatched from": "dispatch_from",
    "mode of transport": "mode_of_transport", "transport mode": "mode_of_transport",
    "transport": "mode_of_transport",
    "weight": "weight", "gross weight": "weight", "net weight": "weight",
    "no of packages": "no_of_packages", "packages": "no_of_packages",
    "number of packages": "no_of_packages", "no of bags": "no_of_packages",
    "quantity received": "quantity_received", "qty received": "quantity_received",
    "received quantity": "quantity_received", "quantity": "quantity_received",
    "qty": "quantity_received", "unit": "quantity_unit",
    "entry no": "entry_no", "entry no.": "entry_no", "entry number": "entry_no",
    "in time": "in_time", "out time": "out_time",
    # Misc
    "narration": "narration", "description": "narration",
    "terms and conditions": "terms_and_conditions", "terms & conditions": "terms_and_conditions",
    "authorised signatory": "authorised_signatory", "authorized signatory": "authorised_signatory",
    "signatory": "authorised_signatory",
    "remarks": "remarks", "note": "remarks",
    # Gate pass / security document specific
    "form no": "form_no", "form number": "form_no",
    "applicable sqp": "sqp_no", "sqp no": "sqp_no", "sqp": "sqp_no",
    "mtn no": "mtn_no", "mtn number": "mtn_no", "material transfer note": "mtn_no",
    "please allow shri": "please_allow_shri", "please allow": "please_allow_shri",
    "allow shri": "please_allow_shri",
    "courier name": "courier_name", "courier": "courier_name",
    "courier contact": "courier_contact", "courier phone": "courier_contact",
    "reason for taking": "reason_for_removal", "reason for removal": "reason_for_removal",
    "reasons for taking out": "reason_for_removal",
    "contractor name": "contractor_name", "contractor": "contractor_name",
    "person taking out": "person_taking_material",
    "person taking out the material": "person_taking_material",
    "security staff": "security_staff_name",
    "security staff name": "security_staff_name",
    "truck tempo": "truck_tempo_no", "truck": "truck_tempo_no",
    "tempo": "truck_tempo_no",
    "authorised person": "authorised_person",
    "authorized person": "authorised_person",
    "note text": "note_text", "notes": "note_text",
    "material type": "material_type", "material description": "material_description",
    "serial no": "serial_no", "sr no": "serial_no",
    "document ref no": "document_ref_no", "ref no": "document_ref_no",
}


def extract_kv_hints(raw_text: str) -> Dict[str, str]:
    """Scan raw OCR text for 'LABEL : VALUE' / 'LABEL - VALUE' patterns."""
    hints: Dict[str, str] = {}
    pattern = re.compile(
        r"^([A-Za-z][A-Za-z0-9 /\-\(\)\.\&]{1,60}?)\s*[:\u2013\-]\s*(.+)$",
        re.MULTILINE,
    )
    for match in pattern.finditer(raw_text):
        label = match.group(1).strip()
        value = match.group(2).strip()
        if not value or len(value) > 250 or label.replace(" ", "").isdigit():
            continue
        norm = re.sub(r"[\s]+", " ", label).lower().strip()
        if norm not in hints:
            hints[norm] = value
    return hints


def _normalize_key(key: str) -> str:
    return re.sub(r"[\s_\-/]+", " ", key).lower().strip()


def merge_with_hints(extracted: dict, hints: Dict[str, str], schema_field_keys: set) -> dict:
    """Fill empty schema fields from OCR hints, then add unmapped hints as extra keys."""
    fields = extracted.get("fields", {})
    if not isinstance(fields, dict):
        fields = {}
    used_hints: set = set()

    for norm_label, value in hints.items():
        target_field = FIELD_ALIASES.get(norm_label)
        if not target_field:
            for sk in schema_field_keys:
                if _normalize_key(sk) == norm_label:
                    target_field = sk
                    break
        if not target_field:
            for sk in schema_field_keys:
                if norm_label in _normalize_key(sk) and len(norm_label) >= 5:
                    target_field = sk
                    break
        if target_field and target_field in schema_field_keys:
            current = fields.get(target_field)
            if not current or current in ("", None, "null"):
                fields[target_field] = value
            used_hints.add(norm_label)

    for norm_label, value in hints.items():
        if norm_label in used_hints:
            continue
        if len(norm_label) < 3 or norm_label.replace(" ", "").isdigit():
            continue
        canonical = norm_label.replace(" ", "_")
        if canonical not in fields and canonical not in schema_field_keys:
            fields[canonical] = value

    extracted["fields"] = fields
    return extracted


_GSTIN_PATTERN = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")


def validate_gstin_fields(data: dict) -> dict:
    """Null out any *_gstin field that doesn't match the real GSTIN format."""
    fields = data.get("fields")
    if not isinstance(fields, dict):
        return data
    notes = data.setdefault("notes", [])
    if not isinstance(notes, list):
        notes = []
        data["notes"] = notes
    for key, value in list(fields.items()):
        if not isinstance(value, str) or "gstin" not in key.lower():
            continue
        candidate = value.strip().upper().replace(" ", "")
        if candidate and not _GSTIN_PATTERN.match(candidate):
            notes.append(f"{key}: '{value}' does not match the standard GSTIN format — cleared, verify manually.")
            fields[key] = None
    data["fields"] = fields
    return data


_QUANTITY_PATTERN = re.compile(
    r"received\s+(?:(?P<material1>[a-zA-Z][a-zA-Z\s]{1,40}?)\s+)?"
    r"(?P<qty>\d+(?:\.\d+)?)\s*"
    r"(?P<unit>litres?|liters?|ltrs?|ltr|kgs?|kilograms?|bags?|pcs|pieces?|nos?|units?|boxes?|bundles?)"
    r"(?:\s+(?P<material2>[a-zA-Z][a-zA-Z\s]{1,40}))?\b",
    re.IGNORECASE,
)


def backfill_quantity(data: dict) -> dict:
    """If a sentence like 'Received milk 115 litre' landed whole in a free-text
    field, split the number/unit out into quantity_received/quantity_unit too."""
    fields = data.get("fields")
    if not isinstance(fields, dict) or fields.get("quantity_received"):
        return data
    for key in ("narration", "remarks", "note_text", "material_description"):
        text = fields.get(key)
        if not isinstance(text, str):
            continue
        match = _QUANTITY_PATTERN.search(text)
        if not match:
            continue
        fields["quantity_received"] = match.group("qty")
        fields["quantity_unit"] = match.group("unit").capitalize()
        material = (match.group("material1") or match.group("material2") or "").strip()
        if material and not fields.get("material_description"):
            fields["material_description"] = material
        break
    data["fields"] = fields
    return data


def sanitize_data(data: dict, ocr_notes: list) -> dict:
    """Ensure 'notes' is list[str]; rescue any dict accidentally placed there."""
    raw_notes = data.get("notes", [])
    if not isinstance(raw_notes, list):
        raw_notes = []

    clean_notes = []
    fields = data.setdefault("fields", {})

    for item in raw_notes:
        if isinstance(item, str):
            if item.strip():
                clean_notes.append(item)
        elif isinstance(item, dict):
            for k, v in item.items():
                if k and v and v not in ("", "null", None):
                    if not fields.get(k):
                        fields[k] = str(v)
                    clean_notes.append(f"{k}: {v}")
        else:
            s = str(item).strip()
            if s:
                clean_notes.append(s)

    clean_notes.extend(n for n in ocr_notes if isinstance(n, str) and n.strip())
    data["notes"] = clean_notes
    return data


def extract_json_object(text: str) -> Dict[str, Any]:
    """
    Brace-counting extractor — handles reasoning text/trailing prose around
    the JSON, and attempts to auto-close a truncated object as a last resort
    before giving up.
    """
    text = (text or "").strip()

    # Strip <think>...</think> / <thinking>...</thinking> blocks, in case the
    # caller didn't already disable thinking mode (think:false) or the model
    # emits one anyway.
    text = re.sub(r"<think(?:ing)?>.*?</think(?:ing)?>", "", text, flags=re.I | re.S).strip()

    # Strip markdown fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
    text = re.sub(r"\s*```$", "", text, flags=re.I).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    if start == -1:
        raise ValueError("Model did not return a JSON object.")

    depth = 0
    best_candidate = None
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                candidate = text[start:i + 1]
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    best_candidate = candidate
                    break

    fragment = best_candidate or text[start:]
    open_braces = fragment.count("{") - fragment.count("}")
    if open_braces > 0:
        closed = fragment + "}" * open_braces
        try:
            return json.loads(closed)
        except json.JSONDecodeError:
            pass

    logger.error(f"Could not parse JSON from model output: {text[:1000]}")
    raise ValueError("The local model did not return valid JSON.")
