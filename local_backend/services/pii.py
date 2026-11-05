"""
Field-level PII/encryption registry — one AES-SIV scheme (services/encryption.py)
shared across every table with sensitive columns, so each table doesn't need
its own copy of the encrypt/decrypt plumbing.

Every route that reads or writes a registered column should go through
encrypt_row_fields/decrypt_row/encrypt_for_lookup rather than calling
services.encryption directly, so the column list and the (column name -> AD
context) mapping stay in exactly one place per table.

Mirrors Cloud Backend's services/pii.py, scoped to this app's own (smaller)
set of tables/columns -- this backend's users table only has email/name,
no phone_number/emp_name/base_location, and there is no masterdata or
audit_logs table here at all.
"""
from services.encryption import DecryptionError, decrypt_field, encrypt_field

# table_name -> tuple of column names that hold sensitive data for that
# table. Column name doubles as the AES-SIV associated-data context, so a
# ciphertext copied from one column into another fails to decrypt instead of
# silently decrypting as the wrong field.
TABLE_PII_COLUMNS: dict[str, tuple[str, ...]] = {
    "users": ("email", "name"),
    "extraction_records": (
        "ocr_text", "extracted_data", "manual_fields", "image_filename",
        "vehicle_front_filename", "vehicle_back_filename", "folder_path",
        "challan_image_url", "vehicle_front_url", "vehicle_back_url",
    ),
    "extraction_record_pages": ("image_url",),
    "manual_entry_records": ("fields", "image_filename", "image_url", "blob_prefix"),
}


def encrypt_row_fields(table: str, **fields) -> dict:
    """Encrypts whichever named fields are passed (None = "not being set",
    not "set to empty") — used for both INSERT (all columns) and partial
    UPDATE (only the columns actually changing). Raises if a kwarg name
    isn't a registered PII column for `table` (catches typos/wrong table)."""
    columns = TABLE_PII_COLUMNS[table]
    out = {}
    for name, value in fields.items():
        if name not in columns:
            raise ValueError(f"{name!r} is not a registered PII column for {table!r}")
        if value is None:
            continue
        out[name] = encrypt_field(value, name)
    return out


def encrypt_for_lookup(table: str, column: str, value: str) -> str:
    """For WHERE column = ? — must use the exact same (already-normalized,
    if applicable) value passed to encrypt_row_fields for that column, or a
    correctly-encrypted row will never match."""
    if column not in TABLE_PII_COLUMNS[table]:
        raise ValueError(f"{column!r} is not a registered PII column for {table!r}")
    return encrypt_field(value, column)


def decrypt_row(table: str, row: dict) -> dict:
    """Returns a new dict with whichever registered PII columns are present
    in `row` replaced by their decrypted plaintext — safe to call on a row
    from a SELECT that only fetched some of them.

    Rows still holding legacy plaintext (not yet migrated) fail to decrypt
    (DecryptionError) and are returned as-is for that column — see
    database.connection's per-table _migrate_encrypt_*_pii functions, which
    are what should actually be converting those rows, not this fallback.
    This exists so a request landing mid-migration degrades to "shows
    plaintext" rather than 500ing.
    """
    out = dict(row)
    for column in TABLE_PII_COLUMNS.get(table, ()):
        value = out.get(column)
        if not value:
            continue
        try:
            out[column] = decrypt_field(value, column)
        except DecryptionError:
            pass
    return out
