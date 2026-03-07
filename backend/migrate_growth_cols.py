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
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS growth_score FLOAT;",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS investment_score FLOAT;",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS predicted_5y_price FLOAT;",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS appreciation_rate FLOAT;",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS rental_yield FLOAT;",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS liquidity_score FLOAT;",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS risk_level VARCHAR;"
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
