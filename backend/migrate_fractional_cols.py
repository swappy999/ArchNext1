import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL found")
    exit(1)

async def apply_migrations():
    print(f"Connecting to database...")
    engine = create_async_engine(DATABASE_URL)
    
    queries = [
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_fractional FLOAT DEFAULT 0.0;",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_shares FLOAT DEFAULT 1.0;",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS available_shares FLOAT DEFAULT 1.0;",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_per_share FLOAT;"
    ]
    
    async with engine.begin() as conn:
        for query in queries:
            try:
                await conn.execute(text(query))
                print(f"Executed: {query}")
            except Exception as e:
                print(f"Error executing {query}: {e}")
                
    print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(apply_migrations())
