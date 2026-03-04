"""
migrate_add_chain_fields.py
─────────────────────────────────────────────────────────────────────────────
Safe migration script: adds the three multi-chain columns to the `properties`
table using ALTER TABLE … ADD COLUMN IF NOT EXISTS.

This is idempotent — running it multiple times is safe.
Existing records are NOT affected; new columns are NULL by default.

Usage (with venv active):
    cd "c:/MY PROJECTS/ArchNext/backend"
    python migrate_add_chain_fields.py
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

# Pull raw DSN from env (asyncpg uses plain postgresql://, not +asyncpg)
_RAW_DB_URL = (
    os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/archnext")
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace("postgres+asyncpg://", "postgresql://")
)

ALTER_STATEMENTS = [
    # chain: which blockchain this property lives on (default polygon)
    """
    ALTER TABLE properties
        ADD COLUMN IF NOT EXISTS chain VARCHAR DEFAULT 'polygon';
    """,
    # contract_address: per-property contract address override
    """
    ALTER TABLE properties
        ADD COLUMN IF NOT EXISTS contract_address VARCHAR;
    """,
    # token_id: generalized cross-chain token identifier (string form)
    """
    ALTER TABLE properties
        ADD COLUMN IF NOT EXISTS token_id VARCHAR;
    """,
]


async def run_migration():
    print(f"[INFO] Connecting to: {_RAW_DB_URL}")
    conn = await asyncpg.connect(_RAW_DB_URL)
    try:
        for stmt in ALTER_STATEMENTS:
            clean = stmt.strip()
            print(f"[RUN] {clean[:80]}…")
            await conn.execute(clean)
            print("[OK]")
        print("\n[DONE] Migration completed successfully.")
        print("       Existing records are unchanged — new columns default to NULL/'polygon'.")
    except Exception as exc:
        print(f"\n[ERROR] Migration failed: {exc}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
