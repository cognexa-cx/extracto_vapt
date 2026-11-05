#!/usr/bin/env python3
"""
Re-encrypt all PII columns from an OLD ENCRYPTION_KEY (32/48/64 bytes) to a NEW
64-byte key (AES-256-SIV), so a deployment with a smaller key can move to the
key size now required by config.py (SCR-07).

SAFE BY DEFAULT
  * Dry run unless --apply is given: reads and checks everything, writes nothing.
  * With --apply, ALL changes happen in ONE database transaction. Every value is
    re-read and decrypted with the NEW key before commit; any problem rolls
    everything back.
  * Re-runnable: a value that already decrypts with the new key is left alone.
  * Values that decrypt with neither key (e.g. legacy plaintext) are reported and
    left untouched; the app's normal startup migration encrypts those later.

USAGE (run from local_backend/, after taking a database backup)
    export OLD_ENCRYPTION_KEY='<base64 of your current key>'
    export NEW_ENCRYPTION_KEY="$(python -c 'import secrets,base64;print(base64.b64encode(secrets.token_bytes(64)).decode())')"
    python scripts/rekey_pii.py            # dry run, read-only
    python scripts/rekey_pii.py --apply    # do it
    # then put NEW_ENCRYPTION_KEY into .env as ENCRYPTION_KEY and start the app.

Keep BOTH keys until you have confirmed the app works. Store the NEW key safely:
losing it makes the data unreadable. The key values are never printed.

Pending (in-progress, un-approved) upload sessions are encrypted with the same
key but are temporary; they cannot be re-keyed here. Add --clear-pending-sessions
to delete them in the same transaction (users simply re-upload).
"""
import argparse
import base64
import binascii
import os
import sys
from collections import Counter

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESSIV

VALID_OLD_SIZES = (32, 48, 64)


def load_key(name: str, allowed_sizes: tuple[int, ...]) -> bytes:
    raw = os.environ.get(name)
    if not raw:
        sys.exit(f"{name} is not set.")
    try:
        key = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError):
        sys.exit(f"{name} is not valid base64.")
    if len(key) not in allowed_sizes:
        sys.exit(f"{name} must decode to one of {allowed_sizes} bytes, got {len(key)}.")
    return key


def _try_decrypt(aead: AESSIV, value: str, context: str) -> str | None:
    try:
        raw = base64.b64decode(value, validate=True)
        return aead.decrypt(raw, [context.encode("utf-8")]).decode("utf-8")
    except (InvalidTag, ValueError, binascii.Error):
        return None


def rekey_value(value: str, context: str, old: AESSIV, new: AESSIV) -> tuple[str | None, str]:
    """Return (new_ciphertext_or_None, status). status is one of:
    'rekeyed'  - decrypted with old key, re-encrypted with new key
    'already'  - already readable with the new key, nothing to do
    'unreadable' - readable with neither key (legacy plaintext / corrupt), left alone
    """
    plaintext = _try_decrypt(old, value, context)
    if plaintext is not None:
        # If old and new keys are identical this is a no-op re-encryption.
        ct = new.encrypt(plaintext.encode("utf-8"), [context.encode("utf-8")])
        return base64.b64encode(ct).decode("ascii"), "rekeyed"
    if _try_decrypt(new, value, context) is not None:
        return None, "already"
    return None, "unreadable"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="write changes (default is a read-only dry run)")
    ap.add_argument("--clear-pending-sessions", action="store_true",
                    help="also delete temporary pending upload sessions (they cannot be re-keyed)")
    args = ap.parse_args()

    old_key = load_key("OLD_ENCRYPTION_KEY", VALID_OLD_SIZES)
    new_key = load_key("NEW_ENCRYPTION_KEY", (64,))
    if old_key == new_key:
        sys.exit("OLD_ENCRYPTION_KEY and NEW_ENCRYPTION_KEY are identical; nothing to do.")
    old, new = AESSIV(old_key), AESSIV(new_key)

    # config validates the whole environment; give it the NEW key so a .env that
    # still holds the old (now invalid-sized) key doesn't stop this script.
    os.environ["ENCRYPTION_KEY"] = base64.b64encode(new_key).decode()
    import pyodbc  # noqa: E402  (imported late so unit tests don't need ODBC)
    import config  # noqa: E402
    from services.pii import TABLE_PII_COLUMNS  # noqa: E402

    conn_parts = [
        f"Driver={{{config.SQL_SERVER_DRIVER}}}",
        f"Server={config.SQL_SERVER_HOST},{config.SQL_SERVER_PORT}",
        f"Database={config.SQL_SERVER_DB}",
        "Encrypt=yes",
        f"TrustServerCertificate={config.SQL_SERVER_TRUST_CERT}",
    ]
    if config.SQL_SERVER_USER:
        conn_parts.append(f"Uid={config.SQL_SERVER_USER}")
    if config.SQL_SERVER_PASSWORD:
        conn_parts.append(f"Pwd={config.SQL_SERVER_PASSWORD}")
    conn = pyodbc.connect(";".join(conn_parts), autocommit=False)
    cur = conn.cursor()

    primary_keys = {
        "users": ["id"],
        "extraction_records": ["id"],
        "manual_entry_records": ["id"],
        "extraction_record_pages": ["record_id", "page_index"],
    }
    totals: Counter = Counter()
    pending_checks: list[tuple[str, list, str, str]] = []  # (table, pk values, column, expected)
    try:
        for table, columns in TABLE_PII_COLUMNS.items():
            pks = primary_keys[table]
            cur.execute(f"SELECT {', '.join(pks + list(columns))} FROM {table}")
            for row in cur.fetchall():
                pk_vals = list(row[: len(pks)])
                for column, value in zip(columns, row[len(pks):]):
                    if not value:
                        continue
                    new_value, status = rekey_value(value, column, old, new)
                    totals[(table, status)] += 1
                    if status == "rekeyed":
                        if args.apply:
                            where = " AND ".join(f"{p} = ?" for p in pks)
                            cur.execute(f"UPDATE {table} SET {column} = ? WHERE {where}", new_value, *pk_vals)
                        pending_checks.append((table, pk_vals, column, new_value))

        if args.apply:
            # Verify: every changed value must now decrypt with the NEW key.
            for table, pk_vals, column, expected in pending_checks:
                pks = primary_keys[table]
                where = " AND ".join(f"{p} = ?" for p in pks)
                cur.execute(f"SELECT {column} FROM {table} WHERE {where}", *pk_vals)
                stored = cur.fetchone()[0]
                if stored != expected or _try_decrypt(new, stored, column) is None:
                    raise RuntimeError(f"verification failed for {table}.{column}")
            if args.clear_pending_sessions:
                cur.execute("DELETE FROM pending_session_pages")
                cur.execute("DELETE FROM pending_sessions")
            conn.commit()
        else:
            conn.rollback()
    except Exception as exc:
        conn.rollback()
        print(f"FAILED, nothing was changed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()

    print("DRY RUN (nothing written)" if not args.apply else "APPLIED and verified")
    for (table, status), n in sorted(totals.items()):
        print(f"  {table:28s} {status:11s} {n}")
    unreadable = sum(n for (_, s), n in totals.items() if s == "unreadable")
    if unreadable:
        print(f"\n{unreadable} value(s) are readable with neither key (legacy plaintext or damaged). "
              "They were left untouched; the app's startup migration will encrypt plaintext ones.")
    if args.apply:
        print("\nNext: set ENCRYPTION_KEY in .env to the NEW key and restart the app.")
        if not args.clear_pending_sessions:
            print("Note: in-progress pending upload sessions use the old key and will not open; "
                  "they expire after 24h (or re-run with --clear-pending-sessions).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
