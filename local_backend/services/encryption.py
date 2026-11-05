"""
Deterministic, authenticated field-level encryption for PII columns —
see services/pii.py for the per-table wrapper that call sites should use
instead of calling encrypt_field/decrypt_field directly.

Uses AES-SIV (RFC 5297) via `cryptography`. Deterministic means the same
plaintext always encrypts to the same ciphertext, which is what lets
`WHERE email = ?` keep working directly against the encrypted column
(including its UNIQUE constraint) without a separate lookup-hash column —
the tradeoff, accepted deliberately for this scope, is that two rows with
the same plaintext are visible as having matching ciphertext. It also means
this scheme cannot support partial/LIKE matching on encrypted columns.

`context` is passed as AES-SIV's associated data — it binds a ciphertext to
the specific column it was encrypted for, so a ciphertext copied from one
column into another fails to decrypt instead of silently decrypting as the
wrong field.

Mirrors Cloud Backend's services/encryption.py exactly, but uses this
app's own ENCRYPTION_KEY -- a separate app, a separate key.
"""
import base64
import binascii

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESSIV

import config

_aead = AESSIV(config.ENCRYPTION_KEY)


class DecryptionError(Exception):
    """Raised when a value can't be decrypted with the current key/context
    — either it's genuinely corrupt, or (most commonly, during the one-time
    migration) it's still legacy plaintext that hasn't been encrypted yet."""


def encrypt_field(value: str, context: str) -> str:
    ciphertext = _aead.encrypt(value.encode("utf-8"), [context.encode("utf-8")])
    return base64.b64encode(ciphertext).decode("ascii")


def decrypt_field(value: str, context: str) -> str:
    try:
        raw = base64.b64decode(value, validate=True)
        plaintext = _aead.decrypt(raw, [context.encode("utf-8")])
        return plaintext.decode("utf-8")
    except (InvalidTag, ValueError, binascii.Error) as e:
        raise DecryptionError(str(e)) from e


def encrypt_bytes(value: bytes, context: str) -> bytes:
    """Same scheme as encrypt_field, but for VARBINARY columns — no base64
    step needed since the column already stores raw bytes."""
    return _aead.encrypt(value, [context.encode("utf-8")])


def decrypt_bytes(value: bytes, context: str) -> bytes:
    try:
        return _aead.decrypt(bytes(value), [context.encode("utf-8")])
    except InvalidTag as e:
        raise DecryptionError(str(e)) from e
