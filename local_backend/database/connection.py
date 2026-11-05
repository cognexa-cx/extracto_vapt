import logging
import aioodbc
import config

logger = logging.getLogger(__name__)

# Module-level pool — initialised in app lifespan
_pool: aioodbc.Pool | None = None


async def _migrate_encrypt_table_pii(table: str, pk_column: str) -> None:
    """Per-table encryption migration for any table registered in
    services.pii.TABLE_PII_COLUMNS. Checks each registered column
    independently (try-decrypt-else-encrypt) rather than probing a single
    column to decide "is this row migrated" -- extraction_records commonly
    has some PII columns NULL on a given row (e.g. no ocr_text on a
    vehicle-only upload) while others hold real legacy plaintext, so a
    single-probe check would wrongly skip those. Safe to run on every
    startup: already-encrypted columns decrypt fine and are left alone;
    only genuinely-plaintext, non-empty columns get rewritten. Mirrors
    Cloud Backend's identical function."""
    from services.encryption import decrypt_field, DecryptionError
    from services.pii import TABLE_PII_COLUMNS, encrypt_row_fields

    columns = TABLE_PII_COLUMNS[table]
    select_cols = ", ".join([pk_column] + list(columns))
    rows = await fetch_query(f"SELECT {select_cols} FROM {table}")

    for row in rows:
        to_encrypt = {}
        for column in columns:
            value = row.get(column)
            if not value:
                continue
            try:
                decrypt_field(value, column)
            except DecryptionError:
                to_encrypt[column] = value

        if not to_encrypt:
            continue

        encrypted = encrypt_row_fields(table, **to_encrypt)
        set_clause = ", ".join(f"{c} = ?" for c in encrypted)
        await execute_query(
            f"UPDATE {table} SET {set_clause} WHERE {pk_column} = ?",
            *encrypted.values(), row[pk_column],
        )
        logger.info(
            f"Encrypted legacy PII for {table} row {row[pk_column]}",
            extra={"event": "pii_migration_row_encrypted", "table": table, "pk": row[pk_column]},
        )


async def _migrate_encrypt_extraction_record_pages_pii() -> None:
    """extraction_record_pages has a composite PK (record_id, page_index),
    not a single column, so it can't use _migrate_encrypt_table_pii()'s
    single-pk_column WHERE clause -- same try-decrypt-else-encrypt logic,
    just keyed on the composite key instead."""
    from services.encryption import decrypt_field, DecryptionError
    from services.pii import encrypt_row_fields

    rows = await fetch_query("SELECT record_id, page_index, image_url FROM extraction_record_pages")
    for row in rows:
        value = row.get("image_url")
        if not value:
            continue
        try:
            decrypt_field(value, "image_url")
            continue  # already encrypted
        except DecryptionError:
            pass

        encrypted = encrypt_row_fields("extraction_record_pages", image_url=value)
        await execute_query(
            "UPDATE extraction_record_pages SET image_url = ? WHERE record_id = ? AND page_index = ?",
            encrypted["image_url"], row["record_id"], row["page_index"],
        )
        logger.info(
            f"Encrypted legacy PII for extraction_record_pages row {row['record_id']}/{row['page_index']}",
            extra={"event": "pii_migration_row_encrypted", "table": "extraction_record_pages"},
        )


async def init_pool() -> aioodbc.Pool:
    """Create the aioodbc connection pool and ensure the schema exists."""
    global _pool

    conn_parts = [
        f"Driver={{{config.SQL_SERVER_DRIVER}}}",
        f"Server={config.SQL_SERVER_HOST},{config.SQL_SERVER_PORT}",
        f"Database={config.SQL_SERVER_DB}",
    ]
    if config.SQL_SERVER_USER:
        conn_parts.append(f"Uid={config.SQL_SERVER_USER}")
    if config.SQL_SERVER_PASSWORD:
        conn_parts.append(f"Pwd={config.SQL_SERVER_PASSWORD}")
    conn_parts.append("Encrypt=yes")
    conn_parts.append("TrustServerCertificate=yes")
    conn_parts.append("Connection Timeout=30")

    dsn = ";".join(conn_parts)
    logger.info(
        f"Connecting to SQL Server: {';'.join(p for p in conn_parts if not p.startswith('Pwd='))}"
    )

    _pool = await aioodbc.create_pool(
        dsn=dsn,
        minsize=2,
        maxsize=10,
        autocommit=True,
    )
    logger.info("✅ SQL Server connection pool created.")

    # Auto-create all tables on first run (wrapped in try-except for restricted DDL users)
    try:
        await execute_query(_CREATE_EXTRACTION_TABLE_SQL)
        await execute_query(_CREATE_MANUAL_TABLE_SQL)
        await execute_query(_CREATE_PENDING_SESSIONS_TABLE_SQL)
        await execute_query(_CREATE_PENDING_SESSION_PAGES_TABLE_SQL)
        await execute_query(_CREATE_EXTRACTION_RECORD_PAGES_TABLE_SQL)
        await execute_query(_CREATE_USERS_TABLE_SQL)
        await execute_query(_ADD_TOKEN_VERSION_COLUMN_SQL)
        await execute_query(_ADD_MUST_CHANGE_PASSWORD_COLUMN_SQL)
        await execute_query(_CREATE_REFRESH_TOKENS_TABLE_SQL)
        await execute_query(_WIDEN_PII_COLUMNS_SQL)
        logger.info(
            "✅ Schema verified / created (extraction_records + manual_entry_records + "
            "pending_sessions + pending_session_pages + extraction_record_pages + users)."
        )
    except Exception as e:
        logger.warning(
            f"⚠️ Table creation query failed: {e}. "
            "Assuming tables already exist or database user lacks DDL permissions."
        )

    for table, pk in (("users", "id"), ("extraction_records", "id"), ("manual_entry_records", "id")):
        try:
            await _migrate_encrypt_table_pii(table, pk)
        except Exception as e:
            logger.warning(f"⚠️ {table} PII encryption migration skipped: {e}")

    try:
        await _migrate_encrypt_extraction_record_pages_pii()
    except Exception as e:
        logger.warning(f"⚠️ extraction_record_pages PII encryption migration skipped: {e}")

    # Opportunistic cleanup of abandoned pending sessions (extract() called but
    # never approved/rejected) so they don't accumulate indefinitely.
    try:
        await execute_query(
            "DELETE FROM pending_sessions WHERE created_at < DATEADD(HOUR, -24, GETUTCDATE())"
        )
        await execute_query(
            "DELETE FROM pending_session_pages WHERE session_id NOT IN (SELECT session_id FROM pending_sessions)"
        )
    except Exception as e:
        logger.warning(f"⚠️ Stale pending_sessions cleanup skipped: {e}")

    return _pool


async def close_pool():
    """Close the connection pool gracefully on shutdown."""
    global _pool
    if _pool:
        _pool.close()
        await _pool.wait_closed()
        logger.info("🛑 SQL Server connection pool closed.")


def get_pool() -> aioodbc.Pool:
    """Return the module-level pool (must be initialised already)."""
    if _pool is None:
        raise RuntimeError("SQL Server pool is not initialised. Call init_pool() first.")
    return _pool


def get_db():
    """FastAPI dependency — returns the shared aioodbc pool."""
    return get_pool()


# ─────────────────────────────────────────────────────────────────────────────
# DB-API 2.0 / aioodbc Unified Query Wrappers
# ─────────────────────────────────────────────────────────────────────────────
# Every route/db_models query in this codebase is already written with "?"
# positional placeholders (inherited from the earlier pyodbc/SQL Server
# backend, and unchanged by the detour through PostgreSQL/asyncpg in
# between) — pyodbc uses "?" natively, so no placeholder translation is
# needed here at all, unlike the asyncpg version of this file.

# Without this, a query blocked waiting on a lock (e.g. from another session
# holding a table lock) waits forever — the connection stays checked out of
# the pool indefinitely, and enough of those piling up exhausts the whole
# pool. Capping the lock wait means a blocked query fails fast and its
# connection is returned to the pool instead. Same reasoning as Cloud
# Backend's identical setting.
_LOCK_TIMEOUT_MS = 15000


async def _set_lock_timeout(conn) -> None:
    async with conn.cursor() as cur:
        await cur.execute(f"SET LOCK_TIMEOUT {_LOCK_TIMEOUT_MS}")


async def execute_query(sql: str, *params) -> None:
    """Execute an INSERT, UPDATE, or DELETE query."""
    pool = get_pool()
    async with pool.acquire() as conn:
        await _set_lock_timeout(conn)
        async with conn.cursor() as cur:
            await cur.execute(sql, params)


async def fetch_query(sql: str, *params) -> list[dict]:
    """Fetch multiple rows as dictionaries."""
    pool = get_pool()
    async with pool.acquire() as conn:
        await _set_lock_timeout(conn)
        async with conn.cursor() as cur:
            await cur.execute(sql, params)
            rows = await cur.fetchall()
            if not cur.description:
                return []
            columns = [col[0] for col in cur.description]
            return [dict(zip(columns, row)) for row in rows]


async def fetchrow_query(sql: str, *params) -> dict | None:
    """Fetch a single row as a dictionary, or None if no match."""
    rows = await fetch_query(sql, *params)
    return rows[0] if rows else None


# ─────────────────────────────────────────────────────────────────────────────
# DDL — MS SQL Server table definitions
# ─────────────────────────────────────────────────────────────────────────────
# Same self-healing "create if missing" pattern as Cloud Backend: SQL Server
# has no CREATE TABLE IF NOT EXISTS, so each statement below is wrapped in an
# IF NOT EXISTS (...) BEGIN ... END check instead. Column shapes/sizes mirror
# Cloud Backend's equivalent tables exactly where the two share a table
# (extraction_records, manual_entry_records, the pending_session* tables) —
# same data, same database now, may as well be the same schema.

# Table for AUTOMATIC entries (OCR + LLM extraction flow)
_CREATE_EXTRACTION_TABLE_SQL = """
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='extraction_records' and xtype='U')
BEGIN
    CREATE TABLE extraction_records (
        id                      VARCHAR(100) PRIMARY KEY,
        entry_type              VARCHAR(50) NOT NULL DEFAULT 'automatic',
        direction               VARCHAR(50),
        document_type           VARCHAR(200),
        ocr_text                NVARCHAR(MAX),
        extracted_data          NVARCHAR(MAX),
        manual_fields           NVARCHAR(MAX),
        success                 BIT NOT NULL DEFAULT 1,
        error_message           NVARCHAR(MAX),
        image_filename          VARCHAR(500),
        vehicle_front_filename  VARCHAR(500),
        vehicle_back_filename   VARCHAR(500),
        folder_path             VARCHAR(500),
        challan_image_url       VARCHAR(1000),
        vehicle_front_url       VARCHAR(1000),
        vehicle_back_url        VARCHAR(1000),
        return_status           VARCHAR(20),
        returned_at             DATETIME2,
        created_at              DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at              DATETIME2
    )
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_extraction_created_at' AND object_id=OBJECT_ID('extraction_records'))
BEGIN
    CREATE INDEX idx_extraction_created_at ON extraction_records (created_at DESC);
END
"""

# Table for MANUAL entries (user-typed key/value pairs + optional invoice image)
_CREATE_MANUAL_TABLE_SQL = """
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='manual_entry_records' and xtype='U')
BEGIN
    CREATE TABLE manual_entry_records (
        id              VARCHAR(100) PRIMARY KEY,
        fields          NVARCHAR(MAX) NOT NULL DEFAULT '[]',
        image_filename  VARCHAR(500),
        image_url       VARCHAR(1000),
        blob_prefix     VARCHAR(500),
        created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at      DATETIME2
    )
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_manual_created_at' AND object_id=OBJECT_ID('manual_entry_records'))
BEGIN
    CREATE INDEX idx_manual_created_at ON manual_entry_records (created_at DESC);
END
"""

# Table for pending extract() sessions awaiting /approve or /reject.
# challan_name/challan_bytes are kept (unused, always NULL) for backward
# compatibility — the invoice is multi-page and its bytes live in
# pending_session_pages instead.
_CREATE_PENDING_SESSIONS_TABLE_SQL = """
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='pending_sessions' and xtype='U')
BEGIN
    CREATE TABLE pending_sessions (
        session_id      VARCHAR(100) PRIMARY KEY,
        direction       VARCHAR(50),
        challan_name    VARCHAR(500),
        challan_bytes   VARBINARY(MAX),
        front_name      VARCHAR(500),
        front_bytes     VARBINARY(MAX),
        back_name       VARCHAR(500),
        back_bytes      VARBINARY(MAX),
        created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    )
END
"""

# One row per invoice page for a pending session — the invoice can be
# multiple photos (a 2-3 page invoice) rather than exactly one.
_CREATE_PENDING_SESSION_PAGES_TABLE_SQL = """
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='pending_session_pages' and xtype='U')
BEGIN
    CREATE TABLE pending_session_pages (
        session_id      VARCHAR(100) NOT NULL,
        page_index      INT NOT NULL,
        filename        VARCHAR(500),
        image_bytes     VARBINARY(MAX),
        PRIMARY KEY (session_id, page_index)
    )
END
"""

# One row per invoice page for an approved extraction_records row — the
# first page's URL is still mirrored into extraction_records.challan_image_url
# for backward compatibility with anything reading that single column.
_CREATE_EXTRACTION_RECORD_PAGES_TABLE_SQL = """
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='extraction_record_pages' and xtype='U')
BEGIN
    CREATE TABLE extraction_record_pages (
        record_id       VARCHAR(100) NOT NULL,
        page_index      INT NOT NULL,
        image_url       VARCHAR(1000),
        PRIMARY KEY (record_id, page_index)
    )
END
"""

# Login accounts for the web admin app. Passwords are always bcrypt hashes —
# never plaintext or reversibly encrypted. See auth/security.py. This is
# Local Backend's own simpler admin-login shape (id/email/name/role/
# is_active) — distinct from Cloud Backend's full employee-management
# `users` table, and deliberately left that way rather than unified.
_CREATE_USERS_TABLE_SQL = """
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' and xtype='U')
BEGIN
    CREATE TABLE users (
        id              VARCHAR(100) PRIMARY KEY,
        email           VARCHAR(200) NOT NULL UNIQUE,
        password_hash   VARCHAR(255) NOT NULL,
        name            VARCHAR(200),
        role            VARCHAR(50) NOT NULL DEFAULT 'Admin',
        is_active       BIT NOT NULL DEFAULT 1,
        created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    )
END
"""

# Bumped on logout-everywhere and password change; every access token
# embeds the token_version it was issued under as its `tv` claim, and
# auth/dependencies.get_current_user rejects a request whose `tv` doesn't
# match the current column value. This is what makes a token "revocable"
# despite JWTs being stateless — see auth/security.create_access_token.
_ADD_TOKEN_VERSION_COLUMN_SQL = """
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'token_version'
)
BEGIN
    ALTER TABLE users ADD token_version INT NOT NULL DEFAULT 1;
END
"""

# SCR-02: when set, the account may only call the change-password endpoint
# (enforced server-side in auth/dependencies.py) until a new password is set.
_ADD_MUST_CHANGE_PASSWORD_COLUMN_SQL = """
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'must_change_password'
)
BEGIN
    ALTER TABLE users ADD must_change_password BIT NOT NULL DEFAULT 0;
END
"""

# Refresh tokens — opaque random strings the client trades in at
# POST /refresh for a new short-lived access token. Stored as a SHA-256
# hash (token_hash), never the raw token. Rotated on every use.
_CREATE_REFRESH_TOKENS_TABLE_SQL = """
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='refresh_tokens' and xtype='U')
BEGIN
    CREATE TABLE refresh_tokens (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        user_id     VARCHAR(100) NOT NULL,
        token_hash  VARCHAR(64) NOT NULL UNIQUE,
        expires_at  DATETIME2 NOT NULL,
        revoked_at  DATETIME2 NULL,
        created_at  DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    )
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_refresh_tokens_user_id' AND object_id=OBJECT_ID('refresh_tokens'))
BEGIN
    CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
END
"""

# Widens PII columns being switched to AES-SIV ciphertext (base64, ~1.4x the
# raw ciphertext length which itself is 16 bytes longer than the plaintext).
# ocr_text/extracted_data/manual_fields/fields are already NVARCHAR(MAX) and
# need no widening. Mirrors Cloud Backend's equivalent widen statements.
_WIDEN_PII_COLUMNS_SQL = """
ALTER TABLE users ALTER COLUMN email VARCHAR(500) NOT NULL;
ALTER TABLE users ALTER COLUMN name VARCHAR(500) NULL;
ALTER TABLE extraction_records ALTER COLUMN image_filename VARCHAR(1000) NULL;
ALTER TABLE extraction_records ALTER COLUMN vehicle_front_filename VARCHAR(1000) NULL;
ALTER TABLE extraction_records ALTER COLUMN vehicle_back_filename VARCHAR(1000) NULL;
ALTER TABLE extraction_records ALTER COLUMN folder_path VARCHAR(1000) NULL;
ALTER TABLE extraction_records ALTER COLUMN challan_image_url VARCHAR(2000) NULL;
ALTER TABLE extraction_records ALTER COLUMN vehicle_front_url VARCHAR(2000) NULL;
ALTER TABLE extraction_records ALTER COLUMN vehicle_back_url VARCHAR(2000) NULL;
ALTER TABLE extraction_record_pages ALTER COLUMN image_url VARCHAR(2000) NULL;
ALTER TABLE manual_entry_records ALTER COLUMN image_filename VARCHAR(1000) NULL;
ALTER TABLE manual_entry_records ALTER COLUMN image_url VARCHAR(2000) NULL;
ALTER TABLE manual_entry_records ALTER COLUMN blob_prefix VARCHAR(1000) NULL;
"""
